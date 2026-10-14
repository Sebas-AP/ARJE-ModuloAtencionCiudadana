import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

import { asyncStorageQueueStore, createMemoryQueue, createOfflineQueue, loadValidOperations, type QueueStore } from '../src/services/offlineQueue.ts';
import { groupLocations, syncPendingOperations, type SyncDependencies } from '../src/services/syncService.ts';
import { subscribeToConnectivity, type ConnectivityState } from '../src/services/connectivityService.ts';

test('malformed saved JSON recovers as an empty queue', () => {
  assert.deepEqual(loadValidOperations('{malformed'), []);
});

test('unknown operation kinds are discarded', () => {
  assert.deepEqual(loadValidOperations('[{"kind":"unknown"}]'), []);
});

test('legacy operations without an owner are discarded during the safe migration', () => {
  const legacy = { kind: 'status', reportId: 8, status: 3, id: 'legacy', createdAt: '2026-10-12T00:00:00.000Z', attempts: 0, terminal: false };
  assert.deepEqual(loadValidOperations(JSON.stringify([legacy])), []);
});

test('operations require an owner and availability preserves its destination', async () => {
  const queue = createOfflineQueue({ getItem: async () => null, setItem: async () => {} });
  await assert.rejects(queue.enqueue({ kind: 'status', reportId: 8, status: 3 }), /sesión activa/);
  queue.setActiveOwner(7);
  const availability = await queue.enqueue({ kind: 'availability', availability: 2, targetCuadrillaId: 7 });
  assert.equal(availability.ownerCuadrillaId, 7);
  assert.equal(availability.targetCuadrillaId, 7);
});

test('a queue only exposes and mutates operations for its active owner', async () => {
  const queue = createMemoryQueue();
  queue.setActiveOwner(7);
  const own = await queue.enqueue({ kind: 'status', reportId: 8, status: 3 });
  queue.setActiveOwner(9);
  const other = await queue.enqueue({ kind: 'status', reportId: 9, status: 3 });
  assert.deepEqual((await queue.list()).map(({ id }) => id), [other.id]);
  await queue.remove(own.id);
  assert.deepEqual((await queue.list()).map(({ id }) => id), [other.id]);
  queue.setActiveOwner(7);
  assert.deepEqual((await queue.list()).map(({ id }) => id), [own.id]);
});

test('saved queue keeps valid operations and discards invalid fields', () => {
  const valid = { kind: 'location', reportId: 8, latitud: 21.8, longitud: -102.3, ownerCuadrillaId: 1, id: 'a', createdAt: '2026-10-12T00:00:00.000Z', attempts: 0, terminal: false };
  const invalid = [
    { ...valid, id: 'bad-report', reportId: 0 },
    { ...valid, id: 'bad-coordinate', latitud: null },
    { ...valid, id: 'bad-attempts', attempts: -1 },
    { ...valid, id: 'bad-terminal', terminal: 'false' },
  ];
  assert.deepEqual(loadValidOperations(JSON.stringify([valid, ...invalid])), [valid]);
});

test('AsyncStorage queue persists across instances using its durable key', async () => {
  const values = new Map<string, string>();
  const runtime = globalThis as { window?: unknown };
  const previousWindow = runtime.window;
  runtime.window = { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  } };

  try {
    const first = createOfflineQueue(asyncStorageQueueStore);
    first.setActiveOwner(1);
    const operation = await first.enqueue({ kind: 'status', reportId: 19, status: 3 });
    const second = createOfflineQueue(asyncStorageQueueStore);
    second.setActiveOwner(1);
    assert.deepEqual((await second.list()).map(({ id }) => id), [operation.id]);
    assert.ok(values.has('arje_field_operation_queue'));
  } finally {
    if (previousWindow === undefined) delete runtime.window;
    else runtime.window = previousWindow;
  }
});

function createYieldingStore(): QueueStore {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => {
      const snapshot = values.get(key) ?? null;
      await Promise.resolve();
      return snapshot;
    },
    setItem: async (key, value) => { values.set(key, value); },
  };
}

test('stores field operation before sending', async () => {
  const queue = createMemoryQueue();
  await queue.enqueue({ kind: 'status', reportId: 19, status: 3 });
  assert.equal((await queue.list()).length, 1);
});

test('keeps operations in enqueue order', async () => {
  const queue = createMemoryQueue();
  await queue.enqueue({ kind: 'location', reportId: 8, latitud: 21.8, longitud: -102.3 });
  await queue.enqueue({ kind: 'status', reportId: 8, status: 3 });
  assert.deepEqual((await queue.list()).map((operation) => operation.kind), ['location', 'status']);
});

test('increments retry attempts and records a recoverable failure', async () => {
  const queue = createMemoryQueue();
  const operation = await queue.enqueue({ kind: 'status', reportId: 8, status: 3 });
  await queue.markFailed(operation.id, 'sin red', false);
  assert.deepEqual(
    (await queue.list()).map(({ attempts, lastError, terminal }) => ({ attempts, lastError, terminal })),
    [{ attempts: 1, lastError: 'sin red', terminal: false }],
  );
});

test('persists operations across queue instances and removes only the chosen one', async () => {
  const values = new Map<string, string>();
  const store: QueueStore = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
  };
  const first = createOfflineQueue(store);
  first.setActiveOwner(1);
  const evidence = await first.enqueue({ kind: 'evidence', reportId: 8, uri: 'file://photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg', storage: 'persistent' });
  const availability = await first.enqueue({ kind: 'availability', availability: 2, targetCuadrillaId: 1 });
  await first.markFailed(evidence.id, 'archivo no disponible', true);

  const second = createOfflineQueue(store);
  second.setActiveOwner(1);
  assert.deepEqual((await second.list()).map(({ kind, attempts, terminal }) => ({ kind, attempts, terminal })), [
    { kind: 'evidence', attempts: 1, terminal: true },
    { kind: 'availability', attempts: 0, terminal: false },
  ]);
  await second.remove(evidence.id);
  const third = createOfflineQueue(store);
  third.setActiveOwner(1);
  assert.deepEqual((await third.list()).map(({ id }) => id), [availability.id]);
});

test('concurrent enqueue from two queue instances preserves both operations', async () => {
  const store = createYieldingStore();
  const first = createOfflineQueue(store);
  const second = createOfflineQueue(store);
  first.setActiveOwner(1);
  second.setActiveOwner(1);

  await Promise.all([
    first.enqueue({ kind: 'location', reportId: 8, latitud: 21.8, longitud: -102.3 }),
    second.enqueue({ kind: 'status', reportId: 8, status: 3 }),
  ]);

  assert.deepEqual((await first.list()).map(({ kind }) => kind), ['location', 'status']);
});

test('concurrent failure and removal preserve both mutations', async () => {
  const store = createYieldingStore();
  const first = createOfflineQueue(store);
  const second = createOfflineQueue(store);
  first.setActiveOwner(1);
  second.setActiveOwner(1);
  const evidence = await first.enqueue({ kind: 'evidence', reportId: 8, uri: 'file://photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg', storage: 'persistent' });
  const availability = await first.enqueue({ kind: 'availability', availability: 2, targetCuadrillaId: 1 });

  await Promise.all([
    first.markFailed(evidence.id, 'sin red', false),
    second.remove(availability.id),
  ]);

  assert.deepEqual((await first.list()).map(({ id, attempts, lastError }) => ({ id, attempts, lastError })), [
    { id: evidence.id, attempts: 1, lastError: 'sin red' },
  ]);
});

function senders(overrides: Partial<Omit<SyncDependencies, 'queue'>> = {}): Omit<SyncDependencies, 'queue'> {
  return {
    sendLocations: async () => {},
    sendStatus: async () => {},
    sendEvidence: async () => {},
    sendAvailability: async () => {},
    ...overrides,
  };
}

test('batch sends consecutive locations for one report and removes only confirmed points', async () => {
  const queue = createMemoryQueue();
  await queue.enqueue({ kind: 'location', reportId: 5, latitud: 1, longitud: 2 });
  await queue.enqueue({ kind: 'location', reportId: 5, latitud: 3, longitud: 4 });
  const sentBatches: unknown[] = [];

  const result = await syncPendingOperations({ queue, ...senders({
    sendLocations: async (batch) => { sentBatches.push(batch); },
  }) });

  assert.deepEqual(sentBatches, [{ reportId: 5, ubicaciones: [{ latitud: 1, longitud: 2 }, { latitud: 3, longitud: 4 }] }]);
  assert.deepEqual(result, { sent: 2, pending: 0, failed: 0, requiresAuthentication: false });
  assert.deepEqual(await queue.list(), []);
});

test('groupLocations preserves FIFO boundaries between reports and operation kinds', async () => {
  const queue = createMemoryQueue();
  await queue.enqueue({ kind: 'location', reportId: 5, latitud: 1, longitud: 2 });
  await queue.enqueue({ kind: 'location', reportId: 6, latitud: 3, longitud: 4 });
  await queue.enqueue({ kind: 'status', reportId: 5, status: 3 });
  await queue.enqueue({ kind: 'location', reportId: 5, latitud: 5, longitud: 6 });
  const operations = await queue.list();

  assert.deepEqual(groupLocations(operations).map((group) => group.map(({ id }) => id)),
    operations.map(({ id }) => [id]));
});

test('sync sends mixed operations in FIFO order without merging locations across status', async () => {
  const queue = createMemoryQueue();
  await queue.enqueue({ kind: 'location', reportId: 5, latitud: 1, longitud: 2 });
  await queue.enqueue({ kind: 'status', reportId: 5, status: 3 });
  await queue.enqueue({ kind: 'location', reportId: 5, latitud: 3, longitud: 4 });
  const calls: string[] = [];

  const result = await syncPendingOperations({ queue, ...senders({
    sendLocations: async (batch) => { calls.push(`location:${batch.ubicaciones[0].latitud}`); },
    sendStatus: async (operation) => { calls.push(`status:${operation.status}`); },
  }) });

  assert.deepEqual(calls, ['location:1', 'status:3', 'location:3']);
  assert.equal(result.sent, 3);
  assert.equal(result.pending, 0);
});

test('concurrent sync requests do not send the same queued operation twice', async () => {
  const queue = createMemoryQueue();
  await queue.enqueue({ kind: 'location', reportId: 5, latitud: 1, longitud: 2 });
  let releaseSend: (() => void) | undefined;
  const sending = new Promise<void>((resolve) => { releaseSend = resolve; });
  let sends = 0;
  const dependencies = { queue, ...senders({
    sendLocations: async () => { sends++; await sending; },
  }) };

  const first = syncPendingOperations(dependencies);
  const second = syncPendingOperations(dependencies);
  releaseSend?.();
  const results = await Promise.all([first, second]);

  assert.equal(sends, 1);
  assert.deepEqual(results.map(({ pending }) => pending), [0, 0]);
});

test('sync runs one follow-up pass when work is enqueued during an active send', async () => {
  const queue = createMemoryQueue();
  await queue.enqueue({ kind: 'location', reportId: 5, latitud: 1, longitud: 2 });
  let releaseSend!: () => void;
  let signalStarted!: () => void;
  const sending = new Promise<void>((resolve) => { releaseSend = resolve; });
  const started = new Promise<void>((resolve) => { signalStarted = resolve; });
  const calls: string[] = [];
  const dependencies = { queue, ...senders({
    sendLocations: async () => { calls.push('location'); signalStarted(); await sending; },
    sendStatus: async () => { calls.push('status'); },
  }) };

  const first = syncPendingOperations(dependencies);
  await started;
  await queue.enqueue({ kind: 'status', reportId: 5, status: 3 });
  const trigger = syncPendingOperations(dependencies);
  releaseSend();
  await Promise.all([first, trigger]);

  assert.deepEqual(calls, ['location', 'status']);
  assert.deepEqual(await queue.list(), []);
});

test('classifies API errors created in another JavaScript realm', async () => {
  const queue = createMemoryQueue();
  await queue.enqueue({ kind: 'status', reportId: 5, status: 3 });
  const foreignApiError = runInNewContext("new Error('API Error 409: invalid transition')");

  const result = await syncPendingOperations({ queue, ...senders({
    sendStatus: async () => { throw foreignApiError; },
  }) });

  assert.deepEqual(result, { sent: 0, pending: 1, failed: 1, requiresAuthentication: false });
  assert.deepEqual((await queue.list()).map(({ attempts, terminal }) => ({ attempts, terminal })),
    [{ attempts: 1, terminal: true }]);
});

for (const failure of [new Error('Network request failed'), new Error('API Error 503: unavailable')]) {
  test(`transient ${failure.message} retains the batch and stops later sends`, async () => {
    const queue = createMemoryQueue();
    await queue.enqueue({ kind: 'location', reportId: 5, latitud: 1, longitud: 2 });
    await queue.enqueue({ kind: 'location', reportId: 5, latitud: 3, longitud: 4 });
    await queue.enqueue({ kind: 'status', reportId: 5, status: 3 });
    let statusCalls = 0;

    const result = await syncPendingOperations({ queue, ...senders({
      sendLocations: async () => { throw failure; },
      sendStatus: async () => { statusCalls++; },
    }) });

    assert.deepEqual(result, { sent: 0, pending: 3, failed: 0, requiresAuthentication: false });
    assert.equal(statusCalls, 0);
    assert.deepEqual((await queue.list()).map(({ attempts, terminal }) => ({ attempts, terminal })), [
      { attempts: 1, terminal: false }, { attempts: 1, terminal: false }, { attempts: 0, terminal: false },
    ]);
  });
}

for (const status of [401, 403]) {
  test(`${status} keeps the operation and requires authentication`, async () => {
    const queue = createMemoryQueue();
    await queue.enqueue({ kind: 'status', reportId: 5, status: 3 });

    const result = await syncPendingOperations({ queue, ...senders({
      sendStatus: async () => { throw new Error(`API Error ${status}: forbidden`); },
    }) });

    assert.deepEqual(result, { sent: 0, pending: 1, failed: 0, requiresAuthentication: true });
    assert.deepEqual((await queue.list()).map(({ attempts, terminal }) => ({ attempts, terminal })),
      [{ attempts: 1, terminal: false }]);
  });
}

for (const status of [400, 409]) {
  test(`${status} marks a rejected status terminal and stops dependent report operations`, async () => {
    const queue = createMemoryQueue();
    await queue.enqueue({ kind: 'status', reportId: 5, status: 3 });
    await queue.enqueue({ kind: 'evidence', reportId: 5, uri: 'file://photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg', storage: 'persistent' });
    await queue.enqueue({ kind: 'status', reportId: 6, status: 3 });
    const sentReports: number[] = [];

    const result = await syncPendingOperations({ queue, ...senders({
      sendStatus: async (operation) => {
        if (operation.reportId === 5) throw new Error(`API Error ${status}: invalid transition`);
        sentReports.push(operation.reportId);
      },
      sendEvidence: async (operation) => { sentReports.push(operation.reportId); },
    }) });

    assert.deepEqual(sentReports, [6]);
    assert.deepEqual(result, { sent: 1, pending: 2, failed: 1, requiresAuthentication: false });
    assert.deepEqual((await queue.list()).map(({ kind, attempts, terminal }) => ({ kind, attempts, terminal })), [
      { kind: 'status', attempts: 1, terminal: true },
      { kind: 'evidence', attempts: 0, terminal: false },
    ]);
  });
}

test('a terminal status remains reported and blocks its dependent operations on the next sync', async () => {
  const queue = createMemoryQueue();
  await queue.enqueue({ kind: 'status', reportId: 5, status: 3 });
  await queue.enqueue({ kind: 'location', reportId: 5, latitud: 1, longitud: 2 });
  await syncPendingOperations({ queue, ...senders({
    sendStatus: async () => { throw new Error('API Error 400: invalid transition'); },
  }) });
  let locationCalls = 0;

  const result = await syncPendingOperations({ queue, ...senders({
    sendLocations: async () => { locationCalls++; },
  }) });

  assert.equal(locationCalls, 0);
  assert.deepEqual(result, { sent: 0, pending: 2, failed: 1, requiresAuthentication: false });
});

test('a failed location batch survives a fresh queue instance', async () => {
  const values = new Map<string, string>();
  const store: QueueStore = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
  };
  const queue = createOfflineQueue(store);
  queue.setActiveOwner(1);
  await queue.enqueue({ kind: 'location', reportId: 5, latitud: 1, longitud: 2 });
  await queue.enqueue({ kind: 'location', reportId: 5, latitud: 3, longitud: 4 });
  await syncPendingOperations({ queue, ...senders({
    sendLocations: async () => { throw new Error('Network request failed'); },
  }) });
  const restored = createOfflineQueue(store);
  restored.setActiveOwner(1);

  assert.deepEqual((await restored.list()).map(({ kind, attempts, terminal }) => ({ kind, attempts, terminal })), [
    { kind: 'location', attempts: 1, terminal: false },
    { kind: 'location', attempts: 1, terminal: false },
  ]);
});

test('connectivity subscription reports reachability, handles unknown state, and unsubscribes', () => {
  const states: boolean[] = [];
  let listener: ((state: ConnectivityState) => void) | undefined;
  let unsubscribed = false;
  const unsubscribe = subscribeToConnectivity((online) => { states.push(online); }, {
    addEventListener: (callback) => {
      listener = callback;
      return () => { unsubscribed = true; };
    },
  });

  assert.ok(listener);
  listener({ isConnected: true, isInternetReachable: null });
  listener({ isConnected: true, isInternetReachable: false });
  listener({ isConnected: null, isInternetReachable: null });
  listener({ isConnected: true, isInternetReachable: true });
  assert.deepEqual(states, [true, false, false, true]);
  unsubscribe();
  assert.equal(unsubscribed, true);
});
