import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the real service graph, replacing only native storage/task APIs and HTTP.
export function mobileRuntime() {
  const storage = new Map<string, string>();
  const secure = new Map<string, string>([['arje_token', 'test-token']]);
  const files = new Set<string>(['file://photo.jpg']);
  const tasks = new Map<string, (body: any) => Promise<void>>();
  const requests: { url: string; options: any }[] = [];
  const cuadrilla = { id: 8, nombre: 'Norte', usuarioApp: 'norte', estatusDisponibilidad: 1, reportesAsignadosCount: 1 };
  let respond = async (_url: string, _options: any): Promise<any> => ({ ok: true, status: 204 });
  let tokenReads = 0;
  let onTokenRead: ((read: number) => void | Promise<void>) | undefined;
  const natives: Record<string, any> = {
    'react-native': {
      Platform: { OS: 'android' },
    },
    '@react-native-async-storage/async-storage': {
      getItem: async (key: string) => storage.get(key) ?? null,
      setItem: async (key: string, value: string) => { storage.set(key, value); },
    },
    'expo-secure-store': {
      getItemAsync: async (key: string) => {
        if (key === 'arje_token') {
          tokenReads++;
          await onTokenRead?.(tokenReads);
        }
        return secure.get(key) ?? null;
      },
      setItemAsync: async (key: string, value: string) => { secure.set(key, value); },
      deleteItemAsync: async (key: string) => { secure.delete(key); },
    },
    'expo-task-manager': {
      defineTask: (name: string, task: (body: any) => Promise<void>) => tasks.set(name, task),
      isTaskRegisteredAsync: async (name: string) => tasks.has(name),
    },
    'expo-location': {
      Accuracy: { High: 6 },
      requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
      requestBackgroundPermissionsAsync: async () => ({ status: 'granted' }),
      startLocationUpdatesAsync: async () => {},
      stopLocationUpdatesAsync: async () => {},
    },
    'expo-file-system': {
      documentDirectory: 'file://documents/',
      getInfoAsync: async (uri: string) => ({ exists: files.has(uri), isDirectory: false }),
      makeDirectoryAsync: async () => {},
      copyAsync: async ({ from, to }: { from: string; to: string }) => {
        if (!files.has(from)) throw new Error('source missing');
        files.add(to);
      },
      deleteAsync: async (uri: string) => { files.delete(uri); },
    },
  };
  const cache = new Map<string, { exports: any }>();
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/services');
  function load(name: string, base = root): any {
    const path = resolve(base, `${name.replace(/\.ts$/, '')}.ts`);
    if (cache.has(path)) return cache.get(path)!.exports;
    const module = { exports: {} };
    cache.set(path, module);
    const code = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    runInNewContext(code, {
      module, exports: module.exports, process, console,
      require: (specifier: string) => specifier in natives ? natives[specifier]
        : specifier.startsWith('.') ? load(specifier, dirname(path)) : createRequire(path)(specifier),
      fetch: async (url: string, options: any) => { requests.push({ url, options }); return respond(url, options); },
      FormData: class {
        fields: [string, unknown][] = [];
        append(name: string, value: unknown) { this.fields.push([name, value]); }
      },
    }, { filename: path });
    return module.exports;
  }
  load('fieldOperationsService').setFieldOperationOwner(cuadrilla.id);
  return {
    load, storage, secure, tasks, requests, cuadrilla,
    onTokenRead: (handler: (read: number) => void | Promise<void>) => { onTokenRead = handler; },
    removeFile: (uri: string) => { files.delete(uri); },
    respondWith: (handler: typeof respond) => { respond = handler; },
    pending: () => JSON.parse(storage.get('arje_field_operation_queue') ?? '[]'),
  };
}
