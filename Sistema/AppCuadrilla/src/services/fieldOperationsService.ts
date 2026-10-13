import {
  actualizarEstatusReporte,
  enviarUbicaciones,
  getCuadrillaActual,
  subirEvidencia,
  updateAvailability,
} from './api';
import { asyncStorageQueueStore, createOfflineQueue } from './offlineQueue';
import { syncPendingOperations } from './syncService';

// Every trigger must reuse this instance: syncPendingOperations locks by queue identity.
export const fieldOperationQueue = createOfflineQueue(asyncStorageQueueStore);

export const syncFieldOperations = () => syncPendingOperations({
  queue: fieldOperationQueue,
  sendLocations: ({ reportId, ubicaciones }) => enviarUbicaciones(reportId, ubicaciones),
  sendStatus: ({ reportId, status }) => actualizarEstatusReporte(reportId, { estatus: status }),
  sendEvidence: ({ reportId, uri, name, mimeType }) => {
    const formData = new FormData();
    formData.append('tipo', '2');
    formData.append('archivo', { uri, name, type: mimeType } as any);
    return subirEvidencia(reportId, formData);
  },
  sendAvailability: async ({ availability }) => {
    const cuadrilla = await getCuadrillaActual();
    return updateAvailability(cuadrilla.id, availability);
  },
});

export async function queueStatus(reportId: number, status: 3 | 4 | 5) {
  await fieldOperationQueue.enqueue({ kind: 'status', reportId, status });
  return syncFieldOperations();
}

export async function queueEvidence(reportId: number, uri: string, name: string, mimeType: string) {
  await fieldOperationQueue.enqueue({ kind: 'evidence', reportId, uri, name, mimeType });
  return syncFieldOperations();
}

export async function queueAvailability(availability: 1 | 2 | 3) {
  await fieldOperationQueue.enqueue({ kind: 'availability', availability });
  return syncFieldOperations();
}
