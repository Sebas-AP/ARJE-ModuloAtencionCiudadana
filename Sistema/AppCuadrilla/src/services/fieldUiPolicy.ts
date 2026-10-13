import type { SyncResult } from './syncService';

export type FieldStatus = 3 | 4 | 5;
export type Availability = 1 | 2 | 3;

export function getAllowedNextStatuses(currentStatus: number): FieldStatus[] {
  switch (currentStatus) {
    case 2: return [3];
    case 3: return [4];
    case 4: return [5];
    default: return [];
  }
}

export function hasResolutionEvidence(
  reportId: number,
  evidences: readonly { tipo: number }[],
  operations: readonly { kind: string; reportId?: number; terminal: boolean }[],
): boolean {
  return evidences.some((evidence) => evidence.tipo === 2)
    || operations.some((operation) => operation.kind === 'evidence'
      && operation.reportId === reportId && !operation.terminal);
}

export function canSelectAvailable(activeReportCount: number | null): boolean {
  return activeReportCount === 0;
}

export function getOperationFeedback(result: SyncResult): 'synced' | 'pending' | 'rejected' | 'authentication' {
  if (result.requiresAuthentication) return 'authentication';
  if (result.failed > 0) return 'rejected';
  if (result.pending > 0) return 'pending';
  return 'synced';
}

export const operationFeedbackMessages = {
  synced: 'Operación sincronizada con el servidor.',
  pending: 'Operación guardada en el dispositivo, pendiente de sincronización.',
  rejected: 'Hay operaciones rechazadas. Revisa el reporte antes de continuar.',
  authentication: 'Operación guardada. Inicia sesión nuevamente para sincronizar.',
};
