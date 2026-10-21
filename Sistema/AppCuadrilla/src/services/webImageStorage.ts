// Web-compatible image storage using IndexedDB for durable persistence
// On native, this delegates to the existing evidenceStorage

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const DB_NAME = 'arje-images';
const STORE_NAME = 'images';
const DB_VERSION = 1;

// Check if we're on web
const isWeb = Platform.OS === 'web';

// IndexedDB type declarations for web (simplified)
interface IDBDatabase {
  createObjectStore(name: string, options?: any): any;
  transaction(storeNames: string | string[], mode?: string): any;
  close(): void;
  objectStoreNames: any;
}

interface IDBTransaction {
  objectStore(name: string): any;
}

interface IDBRequest<T = any> {
  onsuccess: ((ev: any) => any) | null;
  onerror: ((ev: any) => any) | null;
  result: T;
  error: any;
}

interface IDBOpenDBRequest extends IDBRequest<IDBDatabase> {
  onupgradeneeded: ((ev: any) => any) | null;
}

type IDBValidKey = string | number | Date | ArrayBuffer | Array<IDBValidKey>;

declare const indexedDB: {
  open(name: string, version?: number): any;
};

interface StoredImage {
  id: string;
  data: string; // base64
  mimeType: string;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!isWeb) {
    throw new Error('IndexedDB not available on native');
  }
  
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event: any) => {
      const db = (event.target as any).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
  
  return dbPromise;
}

export async function storeImageWeb(uri: string, id: string): Promise<string> {
  if (!isWeb) {
    throw new Error('Not on web platform');
  }
  
  // Fetch the image and convert to base64
  const response = await fetch(uri);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      
      try {
        const db = await getDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const imageData: StoredImage = {
          id,
          data: base64,
          mimeType: blob.type,
          timestamp: Date.now(),
        };
        
        const putRequest = store.put(imageData);
        putRequest.onsuccess = () => resolve(`indexeddb://${id}`);
        putRequest.onerror = () => reject(putRequest.error);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsDataURL(blob);
  });
}

export async function getImageWeb(id: string): Promise<string | null> {
  if (!isWeb) {
    return null;
  }
  
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result as StoredImage | undefined;
        if (result) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function deleteImageWeb(id: string): Promise<void> {
  if (!isWeb) return;
  
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.delete(id);
  } catch {
    // Ignore errors
  }
}

// Hybrid function that works on both platforms
export async function storeImageHybrid(uri: string, id: string): Promise<string> {
  if (isWeb) {
    return storeImageWeb(uri, id);
  }
  
  // Native: use expo-file-system
  const evidenceDirectory = `${FileSystem.documentDirectory ?? ''}arje-evidence/`;
  
  await FileSystem.makeDirectoryAsync(evidenceDirectory, { intermediates: true });
  const destination = `${evidenceDirectory}${id}`;
  
  await FileSystem.copyAsync({ from: uri, to: destination });
  
  const copied = await FileSystem.getInfoAsync(destination);
  if (!copied.exists || copied.isDirectory) {
    await FileSystem.deleteAsync(destination, { idempotent: true });
    throw new Error('No se pudo guardar una copia segura de la evidencia');
  }
  
  return destination;
}

export async function getImageHybrid(id: string): Promise<string | null> {
  if (isWeb) {
    return getImageWeb(id);
  }
  
  // Native: check if file exists
  const evidenceDirectory = `${FileSystem.documentDirectory ?? ''}arje-evidence/`;
  const destination = `${evidenceDirectory}${id}`;
  
  const info = await FileSystem.getInfoAsync(destination);
  if (info.exists && !info.isDirectory) {
    return destination;
  }
  
  return null;
}

export async function deleteImageHybrid(id: string): Promise<void> {
  if (isWeb) {
    return deleteImageWeb(id);
  }
  
  const evidenceDirectory = `${FileSystem.documentDirectory ?? ''}arje-evidence/`;
  const destination = `${evidenceDirectory}${id}`;
  await FileSystem.deleteAsync(destination, { idempotent: true });
}