import assert from 'node:assert/strict';
import test from 'node:test';

import { createSecureStorageAdapter } from '../src/services/secureStorageAdapter.ts';

test('web storage reads, writes and deletes asynchronously without invoking SecureStore', async () => {
  const values = new Map<string, string>();
  let nativeCalls = 0;
  const storage = createSecureStorageAdapter({
    isWeb: true,
    webStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: (key) => { values.delete(key); },
    },
    nativeStorage: {
      getItemAsync: async () => { nativeCalls++; return null; },
      setItemAsync: async () => { nativeCalls++; },
      deleteItemAsync: async () => { nativeCalls++; },
    },
  });

  await storage.setItemAsync('arje_token', 'web-token');
  assert.equal(await storage.getItemAsync('arje_token'), 'web-token');
  await storage.deleteItemAsync('arje_token');

  assert.equal(await storage.getItemAsync('arje_token'), null);
  assert.equal(nativeCalls, 0);
});

test('native storage delegates to SecureStore', async () => {
  const calls: string[] = [];
  const storage = createSecureStorageAdapter({
    isWeb: false,
    nativeStorage: {
      getItemAsync: async (key) => { calls.push(`get:${key}`); return 'native-token'; },
      setItemAsync: async (key, value) => { calls.push(`set:${key}:${value}`); },
      deleteItemAsync: async (key) => { calls.push(`delete:${key}`); },
    },
  });

  assert.equal(await storage.getItemAsync('arje_token'), 'native-token');
  await storage.setItemAsync('arje_token', 'updated-token');
  await storage.deleteItemAsync('arje_token');

  assert.deepEqual(calls, [
    'get:arje_token',
    'set:arje_token:updated-token',
    'delete:arje_token',
  ]);
});
