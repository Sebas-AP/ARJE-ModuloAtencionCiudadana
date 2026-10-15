import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createSecureStorageAdapter, type WebStorage } from './secureStorageAdapter';

function getWebStorage(): WebStorage | undefined {
  const runtime = globalThis as typeof globalThis & { localStorage?: WebStorage };
  return runtime.localStorage;
}

export const secureStorage = createSecureStorageAdapter({
  isWeb: Platform.OS === 'web',
  nativeStorage: SecureStore,
  webStorage: getWebStorage(),
});
