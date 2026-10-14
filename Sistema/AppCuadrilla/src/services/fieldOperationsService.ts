import {
  actualizarEstatusReporte,
  enviarUbicaciones,
  subirEvidencia,
  updateAvailability,
} from './api';
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

export const syncFieldOperations = () => syncPendingOperations({
  queue: fieldOperationQueue,
  sendLocations: ({ reportId, ubicaciones }) => enviarUbicaciones(reportId, ubicaciones),
  sendStatus: ({ reportId, status }) => actualizarEstatusReporte(reportId, { estatus: status }),
  sendEvidence: async ({ reportId, uri, name, mimeType }) => {
    await assertPersistedEvidence(uri);
    const formData = new FormData();
    formData.append('tipo', '2');
    formData.append('archivo', { uri, name, type: mimeType } as any);
    return subirEvidencia(reportId, formData);
  },
  sendAvailability: ({ availability, targetCuadrillaId }) => updateAvailability(targetCuadrillaId, availability),
});

export async function queueStatus(reportId: number, status: 3 | 4 | 5) {
  await fieldOperationQueue.enqueue({ kind: 'status', reportId, status });
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
