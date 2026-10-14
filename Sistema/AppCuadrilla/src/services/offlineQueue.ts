import AsyncStorage from '@react-native-async-storage/async-storage';

type OperationData =
  | { kind: 'location'; reportId: number; latitud: number; longitud: number }
  | { kind: 'status'; reportId: number; status: 3 | 4 | 5 }
  | { kind: 'evidence'; reportId: number; uri: string; name: string; mimeType: string; storage: 'persistent' }
  | { kind: 'availability'; availability: 1 | 2 | 3; targetCuadrillaId: number };

export type QueuedOperation = OperationData & {
  id: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
  terminal: boolean;
  ownerCuadrillaId: number;
};

export type QueueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const QUEUE_KEY = 'arje_field_operation_queue';
const pendingMutations = new WeakMap<QueueStore, Promise<void>>();
const storage = typeof AsyncStorage.getItem === 'function'
  ? AsyncStorage
  : (AsyncStorage as unknown as { default: typeof AsyncStorage }).default;

export const asyncStorageQueueStore: QueueStore = {
  getItem: (key) => storage.getItem(key),
  setItem: (key, value) => storage.setItem(key, value),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isQueuedOperation(value: unknown): value is QueuedOperation {
  if (!isRecord(value)
    || !isNonemptyString(value.id)
    || !isNonemptyString(value.createdAt)
    || !Number.isSafeInteger(value.attempts)
    || (value.attempts as number) < 0
    || typeof value.terminal !== 'boolean'
    || !isPositiveInteger(value.ownerCuadrillaId)
    || (value.lastError !== undefined && typeof value.lastError !== 'string')) {
    return false;
  }

  switch (value.kind) {
    case 'location':
      return isPositiveInteger(value.reportId)
        && typeof value.latitud === 'number' && Number.isFinite(value.latitud)
        && typeof value.longitud === 'number' && Number.isFinite(value.longitud);
    case 'status':
      return isPositiveInteger(value.reportId) && [3, 4, 5].includes(value.status as number);
    case 'evidence':
      return isPositiveInteger(value.reportId)
        && isNonemptyString(value.uri)
        && isNonemptyString(value.name)
        && isNonemptyString(value.mimeType)
        && value.storage === 'persistent';
    case 'availability':
      return [1, 2, 3].includes(value.availability as number)
        && isPositiveInteger(value.targetCuadrillaId)
        && value.targetCuadrillaId === value.ownerCuadrillaId;
    default:
      return false;
  }
}

export function loadValidOperations(raw: string | null): QueuedOperation[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isQueuedOperation) : [];
  } catch {
    return [];
  }
}

function serializeMutation<T>(store: QueueStore, mutation: () => Promise<T>): Promise<T> {
  const previous = pendingMutations.get(store) ?? Promise.resolve();
  const result = previous.then(mutation);
  pendingMutations.set(store, result.then(() => {}, () => {}));
  return result;
}

function newId(): string {
  const runtime = globalThis as { crypto?: { randomUUID?: () => string } };
  return runtime.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createOfflineQueue(
  store: QueueStore,
  options: { onRemove?: (operation: QueuedOperation) => Promise<void> } = {},
) {
  let activeOwnerCuadrillaId: number | null = null;
  async function list(): Promise<QueuedOperation[]> {
    const saved = await store.getItem(QUEUE_KEY);
    const operations = loadValidOperations(saved);
    return activeOwnerCuadrillaId === null
      ? []
      : operations.filter((operation) => operation.ownerCuadrillaId === activeOwnerCuadrillaId);
  }

  async function listAll(): Promise<QueuedOperation[]> {
    return loadValidOperations(await store.getItem(QUEUE_KEY));
  }

  async function save(operations: QueuedOperation[]): Promise<void> {
    await store.setItem(QUEUE_KEY, JSON.stringify(operations));
  }

  return {
    async enqueue(data: OperationData): Promise<QueuedOperation> {
      if (activeOwnerCuadrillaId === null) {
        throw new Error('No se puede guardar una operación sin una sesión activa de cuadrilla. Inicia sesión e inténtalo de nuevo.');
      }
      const operation = {
        ...data,
        ownerCuadrillaId: activeOwnerCuadrillaId,
        id: newId(),
        createdAt: new Date().toISOString(),
        attempts: 0,
        terminal: false,
      } as QueuedOperation;
      return serializeMutation(store, async () => {
        await save([...await listAll(), operation]);
        return operation;
      });
    },
    list,
    setActiveOwner(ownerCuadrillaId: number | null): void {
      activeOwnerCuadrillaId = ownerCuadrillaId;
    },
    getActiveOwner(): number | null {
      return activeOwnerCuadrillaId;
    },
    async markFailed(id: string, lastError: string, terminal: boolean): Promise<void> {
      return serializeMutation(store, async () => {
        const operations = await listAll();
        await save(operations.map((operation) => operation.id === id
          && operation.ownerCuadrillaId === activeOwnerCuadrillaId
          ? { ...operation, attempts: operation.attempts + 1, lastError, terminal }
          : operation));
      });
    },
    async remove(id: string): Promise<void> {
      return serializeMutation(store, async () => {
        const operations = await listAll();
        const target = operations.find((operation) => operation.id === id
          && operation.ownerCuadrillaId === activeOwnerCuadrillaId);
        if (!target) return;
        await save(operations.filter((operation) => operation.id !== id));
        await options.onRemove?.(target);
      });
    },
  };
}

export function createMemoryQueue() {
  const values = new Map<string, string>();
  const queue = createOfflineQueue({
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
  });
  queue.setActiveOwner(1);
  return queue;
}
