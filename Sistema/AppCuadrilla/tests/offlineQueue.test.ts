import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryQueue } from '../src/services/offlineQueue.ts';

test('stores field operation before sending', async () => {
  const queue = createMemoryQueue();
  await queue.enqueue({ kind: 'status', reportId: 19, status: 3 });
  assert.equal((await queue.list()).length, 1);
});
