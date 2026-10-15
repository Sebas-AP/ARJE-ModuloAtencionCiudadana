export type WebStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type NativeSecureStorage = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export type SecureStorageAdapter = NativeSecureStorage;

type SecureStorageAdapterOptions = {
  isWeb: boolean;
  nativeStorage: NativeSecureStorage;
  webStorage?: WebStorage;
};

const unavailableWebStorage: WebStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/**
 * SecureStore is only implemented on native platforms. Web sessions deliberately
 * use the browser storage API through the same asynchronous contract.
 */
export function createSecureStorageAdapter({
  isWeb,
  nativeStorage,
  webStorage = unavailableWebStorage,
}: SecureStorageAdapterOptions): SecureStorageAdapter {
  if (!isWeb) return nativeStorage;

  return {
    getItemAsync: async (key) => webStorage.getItem(key),
    setItemAsync: async (key, value) => { webStorage.setItem(key, value); },
    deleteItemAsync: async (key) => { webStorage.removeItem(key); },
  };
}
