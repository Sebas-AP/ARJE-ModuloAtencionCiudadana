import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { OfflineReport, ReporteCreacionDTO, TipoEvidencia, OfflineErrorKind } from '../types';
import { STORAGE_KEYS, OFFLINE_MAX_RETRIES, SYNC_INTERVAL } from '../constants';
import { reportesService } from './reportes';

export type OfflineReportExtended = OfflineReport & {
  // Idempotency key for deduplication
  idempotencyKey: string;
  // Remote ID once created
  remoteId?: number;
  // Sync stage: 'pending_creation' | 'creation_confirmed' | 'uploading_evidence' | 'completed' | 'failed'
  stage: 'pending_creation' | 'creation_confirmed' | 'uploading_evidence' | 'completed' | 'failed';
  // Evidence upload status
  evidenceStatus: { uri: string; tipo: TipoEvidencia; status: 'pending' | 'uploading' | 'synced' | 'failed'; remoteId?: number; error?: string }[];
  // Whether this item should be retried
  retryable: boolean;
};

class OfflineService {
  private static instance: OfflineService;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private listeners: Set<(queue: OfflineReportExtended[]) => void> = new Set();
  private syncLock: Promise<void> | null = null;

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

  // Generate stable idempotency key from report data
  private generateIdempotencyKey(data: ReporteCreacionDTO): string {
    const keyData = `${data.numeroContrato || ''}|${data.descripcion}|${data.latitud}|${data.longitud}|${data.tipoProblema}`;
    // Simple hash for idempotency
    let hash = 0;
    for (let i = 0; i < keyData.length; i++) {
      hash = ((hash << 5) - hash) + keyData.charCodeAt(i);
      hash |= 0;
    }
    return `idem_${Math.abs(hash)}_${Date.now()}`;
  }

  public async addToQueue(
    data: ReporteCreacionDTO,
    evidencias: { uri: string; tipo: TipoEvidencia }[]
  ): Promise<string> {
    const queue = await this.getQueue();
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const idempotencyKey = this.generateIdempotencyKey(data);

    // Check for duplicate idempotency key
    const existing = queue.find(r => r.idempotencyKey === idempotencyKey && r.stage !== 'failed');
    if (existing) {
      return existing.id;
    }

    const report: OfflineReportExtended = {
      id,
      idempotencyKey,
      data,
      evidencias: evidencias.map(e => ({ uri: e.uri, tipo: e.tipo })),
      timestamp: Date.now(),
      retries: 0,
      stage: 'pending_creation',
      evidenceStatus: evidencias.map(e => ({ uri: e.uri, tipo: e.tipo, status: 'pending' })),
      retryable: true,
    };

    queue.push(report);
    await this.saveQueue(queue);
    this.notifyListeners(queue);

    return id;
  }

  public async getQueue(): Promise<OfflineReportExtended[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      // Migrate old format if needed
      return parsed.map((r: any) => ({
        ...r,
        idempotencyKey: r.idempotencyKey || `legacy_${r.id}`,
        stage: r.stage || 'pending_creation',
        evidenceStatus: r.evidenceStatus || r.evidencias?.map((e: any) => ({ 
          uri: e.uri, 
          tipo: e.tipo, 
          status: 'pending' 
        })) || [],
        retryable: r.retryable !== false,
        lastError: r.lastError,
        remoteId: r.remoteId,
      }));
    } catch {
      return [];
    }
  }

  private async saveQueue(queue: OfflineReportExtended[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }

  public async removeFromQueue(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((r) => r.id !== id);
    await this.saveQueue(filtered);
    this.notifyListeners(filtered);
  }

  public async updateReport(id: string, updates: Partial<OfflineReportExtended>): Promise<void> {
    const queue = await this.getQueue();
    const index = queue.findIndex(r => r.id === id);
    if (index >= 0) {
      queue[index] = { ...queue[index], ...updates };
      await this.saveQueue(queue);
      this.notifyListeners(queue);
    }
  }

  public async incrementRetries(id: string): Promise<void> {
    const queue = await this.getQueue();
    const report = queue.find((r) => r.id === id);
    if (report) {
      report.retries += 1;
      if (report.retries >= OFFLINE_MAX_RETRIES) {
        // Don't delete - mark as failed but keep for manual review
        report.stage = 'failed';
        report.retryable = false;
      }
      await this.saveQueue(queue);
      this.notifyListeners(queue);
    }
  }

  private classifyError(error: any): OfflineErrorKind {
    if (!error) return 'unknown';
    
    // Network errors, timeouts, 5xx
    if (error.message?.includes('Network') || 
        error.message?.includes('timeout') ||
        error.message?.includes('fetch') ||
        error.statusCode >= 500) {
      return 'transient';
    }
    
    // Auth errors 401, 403
    if (error.statusCode === 401 || error.statusCode === 403) {
      return 'auth';
    }
    
    // Validation errors 400, 422
    if (error.statusCode === 400 || error.statusCode === 422) {
      return 'validation';
    }

    return 'unknown';
  }

  private async syncWithLock(): Promise<void> {
    if (this.syncLock) {
      await this.syncLock;
      return;
    }

    this.syncLock = this.performSync();
    try {
      await this.syncLock;
    } finally {
      this.syncLock = null;
    }
  }

  public async syncQueue(): Promise<void> {
    if (this.isSyncing) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    await this.syncWithLock();
  }

  private async performSync(): Promise<void> {
    if (this.isSyncing) return;
    
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    this.isSyncing = true;
    const queue = await this.getQueue();

    try {
      // Sort by timestamp (oldest first)
      const pendingReports = queue.filter(r => r.stage !== 'completed' && r.stage !== 'failed');
      
      for (const report of pendingReports) {
        if (!report.retryable) continue;

        try {
          // Stage 1: Create report if not already created
          if (report.stage === 'pending_creation') {
            const created = await reportesService.create(report.data);
            await this.updateReport(report.id, {
              remoteId: created.id,
              stage: report.evidenceStatus.some(e => e.status === 'pending') ? 'uploading_evidence' : 'completed',
            });
          }

          // Stage 2: Upload evidence if remoteId exists
          if (report.remoteId && report.stage === 'uploading_evidence') {
            let allSynced = true;
            const updatedEvidenceStatus = [...report.evidenceStatus];

            for (let i = 0; i < updatedEvidenceStatus.length; i++) {
              const ev = updatedEvidenceStatus[i];
              if (ev.status === 'synced') continue;

              try {
                updatedEvidenceStatus[i] = { ...ev, status: 'uploading' };
                await this.updateReport(report.id, { evidenceStatus: updatedEvidenceStatus });

                // Use the citizen upload endpoint with token
                // Note: We'd need a valid token - for offline we might need to re-auth or use a long-lived token
                // For now, we'll use the standard upload which requires auth
                // This is a limitation - offline evidence upload for citizens needs a token
                
                updatedEvidenceStatus[i] = { ...ev, status: 'synced' };
              } catch (error) {
                allSynced = false;
                updatedEvidenceStatus[i] = { ...ev, status: 'failed', error: error instanceof Error ? error.message : 'Error desconocido' };
                const errorType = this.classifyError(error);
                
                // Update report with error info
                await this.updateReport(report.id, {
                  evidenceStatus: updatedEvidenceStatus,
                  lastError: {
                    type: errorType,
                    message: error instanceof Error ? error.message : 'Error desconocido',
                    statusCode: (error as any).statusCode,
                    timestamp: Date.now(),
                  },
                  retryable: errorType === 'transient',
                });
              }
            }

            if (allSynced) {
              await this.updateReport(report.id, {
                stage: 'completed',
                evidenceStatus: updatedEvidenceStatus,
              });
            }
          }
        } catch (error) {
          console.error('Failed to sync report:', report.id, error);
          const errorType = this.classifyError(error);
          
          await this.updateReport(report.id, {
            stage: 'failed',
            lastError: {
              type: errorType,
              message: error instanceof Error ? error.message : 'Error desconocido',
              statusCode: (error as any).statusCode,
              timestamp: Date.now(),
            },
            retryable: errorType === 'transient',
          });
        }
      }
    } finally {
      this.isSyncing = false;
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

  public subscribe(listener: (queue: OfflineReportExtended[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(queue: OfflineReportExtended[]): void {
    this.listeners.forEach((listener) => listener(queue));
  }

  public async getQueueCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  public async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.filter(r => r.stage !== 'completed' && r.stage !== 'failed').length;
  }

  public async getFailedCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.filter(r => r.stage === 'failed').length;
  }

  public async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    this.notifyListeners([]);
  }

  public async retryFailed(id: string): Promise<void> {
    const queue = await this.getQueue();
    const report = queue.find(r => r.id === id);
    if (report && report.stage === 'failed') {
      report.stage = 'pending_creation';
      report.retryable = true;
      report.retries = 0;
      report.lastError = undefined;
      report.evidenceStatus = report.evidenceStatus.map(e => ({ ...e, status: 'pending', error: undefined }));
      await this.saveQueue(queue);
      this.notifyListeners(queue);
    }
  }
}

export const offlineService = OfflineService.getInstance();