import assert from 'node:assert/strict';
import test from 'node:test';
import type { IHttpConnectionOptions } from '@microsoft/signalr';

import type { UltimaUbicacionCuadrilla } from '../src/types/ubicaciones.ts';
import {
  buildUbicacionesHubUrl,
  createUbicacionesRealtime,
  UBICACION_ACTUALIZADA_EVENT,
  UbicacionesRealtimeError,
  type HubConnectionLike,
} from '../src/services/ubicacionesRealtime.ts';
import { createUbicacionesStore } from '../src/services/ubicacionesStore.ts';

function fakeConnection(options: { failStart?: Error } = {}) {
  const calls: string[] = [];
  const registered = new Map<string, (payload: UltimaUbicacionCuadrilla) => void>();
  const connection: HubConnectionLike & { calls: string[]; registered: typeof registered } = {
    calls,
    registered,
    on(eventName, handler) { calls.push(`on:${eventName}`); registered.set(eventName, handler); },
    off(eventName) { calls.push(`off:${eventName}`); registered.delete(eventName); },
    async start() {
      calls.push('start');
      if (options.failStart) throw options.failStart;
    },
    async stop() { calls.push('stop'); },
    onreconnecting() { calls.push('onreconnecting'); },
    onreconnected() { calls.push('onreconnected'); },
    onclose() { calls.push('onclose'); },
  };
  return connection;
}

function fecha(): string {
  return new Date().toISOString();
}

function payload(idCuadrilla: number): UltimaUbicacionCuadrilla {
  return {
    idCuadrilla,
    cuadrillaNombre: `Cuadrilla ${idCuadrilla}`,
    posicion: {
      idSeguimiento: idCuadrilla * 10,
      idReporte: null,
      folioReporte: null,
      latitud: 21.88,
      longitud: -102.29,
      fechaHora: fecha(),
      fechaRecepcion: fecha(),
    },
  };
}

async function flushMicrotasks(times = 6): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

class FakeScheduler {
  private nextId = 1;
  readonly timeouts = new Map<number, () => void>();
  readonly intervals = new Map<number, () => void>();

  setTimeout = (handler: () => void): ReturnType<typeof setTimeout> => {
    const id = this.nextId++;
    this.timeouts.set(id, handler);
    return id as unknown as ReturnType<typeof setTimeout>;
  };

  clearTimeout = (handle: ReturnType<typeof setTimeout>): void => {
    this.timeouts.delete(Number(handle));
  };

  setInterval = (handler: () => void): ReturnType<typeof setInterval> => {
    const id = this.nextId++;
    this.intervals.set(id, handler);
    return id as unknown as ReturnType<typeof setInterval>;
  };

  clearInterval = (handle: ReturnType<typeof setInterval>): void => {
    this.intervals.delete(Number(handle));
  };

  runTimeouts(): void {
    const pending = [...this.timeouts.values()];
    this.timeouts.clear();
    pending.forEach((handler) => handler());
  }
}

test('construye la URL del hub conservando el prefijo del despliegue', () => {
  assert.equal(buildUbicacionesHubUrl('http://localhost:5170/api'), 'http://localhost:5170/hubs/ubicaciones');
  assert.equal(buildUbicacionesHubUrl('http://localhost:5170/api/'), 'http://localhost:5170/hubs/ubicaciones');
  assert.equal(buildUbicacionesHubUrl('https://arje.mx/panel/api'), 'https://arje.mx/panel/hubs/ubicaciones');
  assert.equal(buildUbicacionesHubUrl('https://arje.mx/v1'), 'https://arje.mx/v1/hubs/ubicaciones');
});

test('registra el handler antes de iniciar y detiene la conexión anterior', async () => {
  const connection = fakeConnection();
  let received: UltimaUbicacionCuadrilla[] = [];
  let createOptions: IHttpConnectionOptions | undefined;
  const realtime = createUbicacionesRealtime({
    baseUrl: 'http://localhost:5170/api',
    getToken: () => 'token-123',
    createConnection: (_url, options) => {
      createOptions = options;
      return connection;
    },
  });

  await realtime.start((position) => { received = [position]; });
  assert.deepEqual(connection.calls.slice(0, 4), [
    `on:${UBICACION_ACTUALIZADA_EVENT}`,
    'onreconnecting',
    'onreconnected',
    'onclose',
  ]);
  assert.equal(connection.calls[4], 'start');
  assert.equal(await createOptions?.accessTokenFactory?.(), 'token-123');

  connection.registered.get(UBICACION_ACTUALIZADA_EVENT)?.(payload(4));
  assert.equal(received[0].idCuadrilla, 4);

  await realtime.stop();
  assert.ok(connection.calls.includes(`off:${UBICACION_ACTUALIZADA_EVENT}`));
  assert.equal(connection.calls.at(-1), 'stop');
});

test('sin token no abre conexión y responde 401', async () => {
  const realtime = createUbicacionesRealtime({
    baseUrl: 'http://localhost:5170/api',
    getToken: () => null,
    createConnection: () => fakeConnection(),
  });

  await assert.rejects(realtime.start(() => {}), (error: unknown) => {
    assert.ok(error instanceof UbicacionesRealtimeError);
    assert.equal(error.status, 401);
    return true;
  });
});

test('un rechazo 401 al iniciar se traduce y no deja el hub activo', async () => {
  const connection = fakeConnection({ failStart: new Error('401 Unauthorized') });
  const realtime = createUbicacionesRealtime({
    baseUrl: 'http://localhost:5170/api',
    getToken: () => 'expirado',
    createConnection: () => connection,
  });

  await assert.rejects(realtime.start(() => {}), (error: unknown) => {
    assert.ok(error instanceof UbicacionesRealtimeError);
    assert.equal(error.status, 401);
    return true;
  });
  assert.ok(connection.calls.includes('stop'));
  assert.ok(!connection.registered.has(UBICACION_ACTUALIZADA_EVENT));
});

test('el primer start fallido reintenta y reconecta sin intervención', async () => {
  const scheduler = new FakeScheduler();
  let starts = 0;
  let stops = 0;
  const store = createUbicacionesStore({
    realtime: {
      async start() {
        starts += 1;
        if (starts === 1) throw new Error('backend temporalmente no disponible');
      },
      async stop() { stops += 1; },
    },
    fetchSnapshot: async () => [],
    setTimeout: scheduler.setTimeout,
    clearTimeout: scheduler.clearTimeout,
    setInterval: scheduler.setInterval,
    clearInterval: scheduler.clearInterval,
  });

  store.acquire();
  await flushMicrotasks();
  assert.equal(starts, 1);
  assert.equal(store.getSnapshot().estado, 'degradado');
  assert.equal(scheduler.timeouts.size, 1);

  scheduler.runTimeouts();
  await flushMicrotasks();
  assert.equal(starts, 2);
  assert.equal(store.getSnapshot().estado, 'conectado');
  assert.equal(scheduler.intervals.size, 2);

  store.release();
  await flushMicrotasks();
  assert.equal(stops, 2);
  assert.equal(scheduler.intervals.size, 0);
  assert.equal(scheduler.timeouts.size, 0);
});

test('dos consumidores comparten un solo transporte y se detiene al liberar el último', async () => {
  const scheduler = new FakeScheduler();
  let starts = 0;
  let stops = 0;
  const store = createUbicacionesStore({
    realtime: {
      async start() { starts += 1; },
      async stop() { stops += 1; },
    },
    fetchSnapshot: async () => [],
    setTimeout: scheduler.setTimeout,
    clearTimeout: scheduler.clearTimeout,
    setInterval: scheduler.setInterval,
    clearInterval: scheduler.clearInterval,
  });

  store.acquire();
  store.acquire();
  await flushMicrotasks();
  assert.equal(starts, 1);

  store.release();
  await flushMicrotasks();
  assert.equal(stops, 0);
  assert.equal(store.getSnapshot().estado, 'conectado');

  store.release();
  await flushMicrotasks();
  assert.equal(stops, 1);
  assert.equal(scheduler.intervals.size, 0);
});

test('un 401 detiene el transporte, avisa el cierre de sesión y no reintenta', async () => {
  const scheduler = new FakeScheduler();
  let starts = 0;
  let unauthorized = 0;
  const store = createUbicacionesStore({
    realtime: {
      async start() {
        starts += 1;
        throw Object.assign(new Error('Unauthorized'), { status: 401 });
      },
      async stop() {},
    },
    fetchSnapshot: async () => [],
    setTimeout: scheduler.setTimeout,
    clearTimeout: scheduler.clearTimeout,
    setInterval: scheduler.setInterval,
    clearInterval: scheduler.clearInterval,
    onUnauthorized: () => { unauthorized += 1; },
  });

  store.acquire();
  await flushMicrotasks();
  assert.equal(starts, 1);
  assert.equal(unauthorized, 1);
  assert.equal(store.getSnapshot().estado, 'degradado');
  assert.equal(scheduler.timeouts.size, 0);
});

test('ocultar la pestaña detiene el transporte y volver a mostrarla lo reinicia', async () => {
  const scheduler = new FakeScheduler();
  let starts = 0;
  let stops = 0;
  const store = createUbicacionesStore({
    realtime: {
      async start() { starts += 1; },
      async stop() { stops += 1; },
    },
    fetchSnapshot: async () => [],
    setTimeout: scheduler.setTimeout,
    clearTimeout: scheduler.clearTimeout,
    setInterval: scheduler.setInterval,
    clearInterval: scheduler.clearInterval,
  });

  store.acquire();
  await flushMicrotasks();
  assert.equal(starts, 1);

  store.setVisible(false);
  await flushMicrotasks();
  assert.equal(stops, 1);
  assert.equal(scheduler.intervals.size, 0);

  store.setVisible(true);
  await flushMicrotasks();
  assert.equal(starts, 2);
  assert.equal(store.getSnapshot().estado, 'conectado');
  store.release();
});
