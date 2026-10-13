import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryQueue, createOfflineQueue, type QueueStore } from '../src/services/offlineQueue.ts';

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
  const evidence = await first.enqueue({ kind: 'evidence', reportId: 8, uri: 'file://photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg' });
  const availability = await first.enqueue({ kind: 'availability', availability: 2 });
  await first.markFailed(evidence.id, 'archivo no disponible', true);

  const second = createOfflineQueue(store);
  assert.deepEqual((await second.list()).map(({ kind, attempts, terminal }) => ({ kind, attempts, terminal })), [
    { kind: 'evidence', attempts: 1, terminal: true },
    { kind: 'availability', attempts: 0, terminal: false },
  ]);
  await second.remove(evidence.id);
  assert.deepEqual((await createOfflineQueue(store).list()).map(({ id }) => id), [availability.id]);
});
