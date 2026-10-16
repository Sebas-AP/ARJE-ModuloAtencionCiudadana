import {
  actualizarEstatusReporte,
  actualizarTiempoEstimado,
  enviarUbicaciones,
  guardarComentariosResolucion,
  getAuthToken,
  subirEvidencia,
  resolverSupervision,
  updateAvailability,
} from './api';
import type { AuthSessionSnapshot } from './api';
import { asyncStorageQueueStore, createOfflineQueue } from './offlineQueue';
import { syncPendingOperations } from './syncService';
import { assertPersistedEvidence, persistEvidence, removePersistedEvidence } from './evidenceStorage';

// Every trigger must reuse this instance: syncPendingOperations locks by queue identity.
export const fieldOperationQueue = createOfflineQueue(asyncStorageQueueStore, {
  onRemove: async (operation) => {
    if (operation.kind === 'evidence') await removePersistedEvidence(operation.uri);
  },
});

export function setFieldOperationOwner(cuadrillaId: number | null): void {
  fieldOperationQueue.setActiveOwner(cuadrillaId);
}

async function captureOperationSession(ownerCuadrillaId: number): Promise<AuthSessionSnapshot> {
  const token = await getAuthToken();
  if (!token || fieldOperationQueue.getActiveOwner() !== ownerCuadrillaId) {
    throw new Error('La sesión cambió antes de enviar la operación.');
  }
  return {
    token,
    isCurrent: () => fieldOperationQueue.getActiveOwner() === ownerCuadrillaId,
  };
}

export const syncFieldOperations = () => syncPendingOperations({
  queue: fieldOperationQueue,
  sendLocations: async ({ reportId, ownerCuadrillaId, ubicaciones }) =>
    enviarUbicaciones(reportId, ubicaciones, await captureOperationSession(ownerCuadrillaId)),
  sendStatus: async ({ reportId, status, ownerCuadrillaId }) =>
    actualizarEstatusReporte(reportId, { estatus: status }, await captureOperationSession(ownerCuadrillaId)),
  sendEstimate: async ({ reportId, tiempoEstimado, ownerCuadrillaId }) =>
    actualizarTiempoEstimado(reportId, { tiempoEstimado }, await captureOperationSession(ownerCuadrillaId)),
  sendResolutionComment: async ({ reportId, comentariosResolucion, ownerCuadrillaId }) =>
    guardarComentariosResolucion(reportId, comentariosResolucion, await captureOperationSession(ownerCuadrillaId)),
  sendSupervisionResult: async ({ reportId, confirmaReparacion, observaciones, ownerCuadrillaId }) =>
    resolverSupervision(reportId, { confirmaReparacion, observaciones }, await captureOperationSession(ownerCuadrillaId)),
  sendEvidence: async ({ reportId, uri, name, mimeType, ownerCuadrillaId }) => {
    try {
      await assertPersistedEvidence(uri);
    } catch (error) {
      // A local durable file cannot reappear through another network retry.
      // Present it as a terminal, actionable rejection instead of retrying forever.
      throw new Error(`API Error 400: ${error instanceof Error ? error.message : 'La evidencia ya no está disponible.'}`);
    }
    const formData = new FormData();
    formData.append('tipo', '2');
    formData.append('archivo', { uri, name, type: mimeType } as any);
    return subirEvidencia(reportId, formData, await captureOperationSession(ownerCuadrillaId));
  },
  sendAvailability: async ({ availability, targetCuadrillaId, ownerCuadrillaId }) =>
    updateAvailability(targetCuadrillaId, availability, await captureOperationSession(ownerCuadrillaId)),
});

export async function discardFieldOperation(operationId: string): Promise<void> {
  await fieldOperationQueue.discard(operationId);
}

export async function queueStatus(reportId: number, status: 3 | 4 | 5) {
  await fieldOperationQueue.enqueue({ kind: 'status', reportId, status });
  return syncFieldOperations();
}

export async function queueResolutionAndStatus(reportId: number, comentariosResolucion: string, status: 5) {
  await fieldOperationQueue.enqueue({ kind: 'resolutionComment', reportId, comentariosResolucion });
  await fieldOperationQueue.enqueue({ kind: 'status', reportId, status });
  return syncFieldOperations();
}

export async function queueEstimate(reportId: number, tiempoEstimado: number) {
  await fieldOperationQueue.enqueue({ kind: 'estimate', reportId, tiempoEstimado });
  return syncFieldOperations();
}

export async function queueSupervisionResult(reportId: number, confirmaReparacion: boolean, observaciones?: string) {
  await fieldOperationQueue.enqueue({ kind: 'supervisionResult', reportId, confirmaReparacion, observaciones });
  return syncFieldOperations();
}

export async function queueEvidence(reportId: number, uri: string, name: string, mimeType: string) {
  const durableUri = await persistEvidence(uri, name);
  try {
    await fieldOperationQueue.enqueue({ kind: 'evidence', reportId, uri: durableUri, name, mimeType, storage: 'persistent' });
  } catch (error) {
    await removePersistedEvidence(durableUri);
    throw error;
  }
  return syncFieldOperations();
}

export async function queueAvailability(availability: 1 | 2 | 3) {
  const owner = fieldOperationQueue.getActiveOwner();
  if (!owner) throw new Error('No se puede actualizar disponibilidad sin una sesión activa de cuadrilla.');
  await fieldOperationQueue.enqueue({ kind: 'availability', availability, targetCuadrillaId: owner });
  return syncFieldOperations();
}
