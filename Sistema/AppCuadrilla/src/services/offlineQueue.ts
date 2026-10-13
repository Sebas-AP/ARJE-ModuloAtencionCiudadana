type OperationData =
  | { kind: 'location'; reportId: number; latitud: number; longitud: number }
  | { kind: 'status'; reportId: number; status: 3 | 4 | 5 }
  | { kind: 'evidence'; reportId: number; uri: string; name: string; mimeType: string }
  | { kind: 'availability'; availability: 1 | 2 | 3 };

export type QueuedOperation = OperationData & {
  id: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
  terminal: boolean;
};

export type QueueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const QUEUE_KEY = 'field-operations-queue';

function newId(): string {
  const runtime = globalThis as { crypto?: { randomUUID?: () => string } };
  return runtime.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createOfflineQueue(store: QueueStore) {
  async function list(): Promise<QueuedOperation[]> {
    const saved = await store.getItem(QUEUE_KEY);
    return saved === null ? [] : JSON.parse(saved) as QueuedOperation[];
  }

  async function save(operations: QueuedOperation[]): Promise<void> {
    await store.setItem(QUEUE_KEY, JSON.stringify(operations));
  }

  return {
    async enqueue(data: OperationData): Promise<QueuedOperation> {
      const operation = { ...data, id: newId(), createdAt: new Date().toISOString(), attempts: 0, terminal: false } as QueuedOperation;
      await save([...await list(), operation]);
      return operation;
    },
    list,
    async markFailed(id: string, lastError: string, terminal: boolean): Promise<void> {
      const operations = await list();
      await save(operations.map((operation) => operation.id === id
        ? { ...operation, attempts: operation.attempts + 1, lastError, terminal }
        : operation));
    },
    async remove(id: string): Promise<void> {
      await save((await list()).filter((operation) => operation.id !== id));
    },
  };
}

export function createMemoryQueue() {
  const values = new Map<string, string>();
  return createOfflineQueue({
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
  });
}
