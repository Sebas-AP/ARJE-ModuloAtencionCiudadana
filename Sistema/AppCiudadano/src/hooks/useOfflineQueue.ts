import { useState, useEffect, useCallback } from 'react';
import { offlineService } from '../services/offline';
import { OfflineReport, OfflineErrorKind } from '../types';

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineReport[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const loadQueue = async () => {
      const reports = await offlineService.getQueue();
      setQueue(reports);
    };
    loadQueue();

    const unsubscribe = offlineService.subscribe(setQueue);
    return unsubscribe;
  }, []);

  const addToQueue = useCallback(
    async (data: any, evidencias: any[]) => {
      return offlineService.addToQueue(data, evidencias);
    },
    []
  );

  const removeFromQueue = useCallback(async (id: string) => {
    await offlineService.removeFromQueue(id);
  }, []);

  const updateReport = useCallback(async (id: string, updates: Partial<OfflineReport>) => {
    await offlineService.updateReport(id, updates);
  }, []);

  const retryFailed = useCallback(async (id: string) => {
    await offlineService.retryFailed(id);
  }, []);

  const syncQueue = useCallback(async () => {
    setIsSyncing(true);
    await offlineService.syncQueue();
    setIsSyncing(false);
  }, []);

  const startPeriodicSync = useCallback(() => {
    offlineService.startPeriodicSync();
  }, []);

  const stopPeriodicSync = useCallback(() => {
    offlineService.stopPeriodicSync();
  }, []);

  const getQueueCount = useCallback(async () => {
    return offlineService.getQueueCount();
  }, []);

  const getPendingCount = useCallback(async () => {
    return offlineService.getPendingCount();
  }, []);

  const getFailedCount = useCallback(async () => {
    return offlineService.getFailedCount();
  }, []);

  const clearQueue = useCallback(async () => {
    await offlineService.clearQueue();
  }, []);

  return {
    queue,
    isSyncing,
    addToQueue,
    removeFromQueue,
    updateReport,
    retryFailed,
    syncQueue,
    startPeriodicSync,
    stopPeriodicSync,
    getQueueCount,
    getPendingCount,
    getFailedCount,
    clearQueue,
  };
}