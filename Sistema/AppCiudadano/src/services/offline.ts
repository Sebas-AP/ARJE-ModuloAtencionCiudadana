import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { OfflineReport, ReporteCreacionDTO, TipoEvidencia } from '../types';
import { STORAGE_KEYS, OFFLINE_MAX_RETRIES, SYNC_INTERVAL } from '../constants';
import { reportesService } from './reportes';

class OfflineService {
  private static instance: OfflineService;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private listeners: Set<(queue: OfflineReport[]) => void> = new Set();

  private constructor() {
    this.initNetworkListener();
  }

  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private initNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isSyncing) {
        this.syncQueue();
      }
    });
  }

  public async addToQueue(
    data: ReporteCreacionDTO,
    evidencias: { uri: string; tipo: TipoEvidencia }[]
  ): Promise<string> {
    const queue = await this.getQueue();
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const report: OfflineReport = {
      id,
      data,
      evidencias,
      timestamp: Date.now(),
      retries: 0,
    };

    queue.push(report);
    await this.saveQueue(queue);
    this.notifyListeners(queue);
    
    return id;
  }

  public async getQueue(): Promise<OfflineReport[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async saveQueue(queue: OfflineReport[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }

  public async removeFromQueue(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((r) => r.id !== id);
    await this.saveQueue(filtered);
    this.notifyListeners(filtered);
  }

  public async incrementRetries(id: string): Promise<void> {
    const queue = await this.getQueue();
    const report = queue.find((r) => r.id === id);
    if (report) {
      report.retries += 1;
      if (report.retries >= OFFLINE_MAX_RETRIES) {
        await this.removeFromQueue(id);
      } else {
        await this.saveQueue(queue);
        this.notifyListeners(queue);
      }
    }
  }

  public async syncQueue(): Promise<void> {
    if (this.isSyncing) return;
    
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    this.isSyncing = true;
    const queue = await this.getQueue();

    for (const report of queue) {
      try {
        await this.syncReport(report);
        await this.removeFromQueue(report.id);
      } catch (error) {
        console.error('Failed to sync report:', report.id, error);
        await this.incrementRetries(report.id);
      }
    }

    this.isSyncing = false;
  }

  private async syncReport(report: OfflineReport): Promise<void> {
    const created = await reportesService.create(report.data);
    
    for (const evidencia of report.evidencias) {
      await reportesService.uploadEvidencia(created.id, {
        uri: evidencia.uri,
        name: `evidencia_${Date.now()}.jpg`,
        type: 'image/jpeg',
      }, evidencia.tipo);
    }
  }

  public startPeriodicSync(): void {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      this.syncQueue();
    }, SYNC_INTERVAL);
  }

  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  public subscribe(listener: (queue: OfflineReport[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(queue: OfflineReport[]): void {
    this.listeners.forEach((listener) => listener(queue));
  }

  public async getQueueCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  public async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    this.notifyListeners([]);
  }
}

export const offlineService = OfflineService.getInstance();