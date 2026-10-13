import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeToConnectivity } from '../services/connectivityService';
import { fieldOperationQueue, syncFieldOperations } from '../services/fieldOperationsService';
import type { QueuedOperation } from '../services/offlineQueue';
import type { SyncResult } from '../services/syncService';

export function useFieldSync() {
  const [operations, setOperations] = useState<QueuedOperation[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  const syncing = useRef(false);

  const refresh = useCallback(async (): Promise<QueuedOperation[] | null> => {
    try {
      const pending = await fieldOperationQueue.list();
      if (mounted.current) {
        setOperations(pending);
        setError(null);
        setIsLoading(false);
      }
      return pending;
    } catch {
      if (mounted.current) {
        setError('No se pudo leer la cola guardada. Reintenta antes de continuar.');
        setIsLoading(false);
      }
      return null;
    }
  }, []);

  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    if (syncing.current) return null;
    syncing.current = true;
    setIsSyncing(true);
    try {
      const nextResult = await syncFieldOperations();
      await refresh();
      return nextResult;
    } catch {
      if (mounted.current) setError('No se pudo sincronizar. Tus operaciones guardadas siguen en el dispositivo.');
      return null;
    } finally {
      syncing.current = false;
      if (mounted.current) setIsSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    let wasOnline = false;
    const unsubscribe = subscribeToConnectivity((online) => {
      setIsOnline(online);
      if (online && !wasOnline) void syncNow();
      wasOnline = online;
    });
    // Background GPS and session restoration also write to this same durable queue.
    const interval = setInterval(() => { void refresh(); }, 3000);
    return () => {
      mounted.current = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [refresh, syncNow]);

  return {
    operations, isOnline, isSyncing, isLoading, error, refresh, syncNow,
    pendingCount: operations.length,
    failedCount: operations.filter((operation) => operation.terminal).length,
    requiresAuthentication: operations.some((operation) => /^API Error (401|403)\b/.test(operation.lastError ?? '')),
  };
}
