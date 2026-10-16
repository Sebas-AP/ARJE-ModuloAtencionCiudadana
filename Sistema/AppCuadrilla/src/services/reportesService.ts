import {
  getReportesAsignados,
  getReportesSupervisados,
  getReporteDetalle,
} from './api';
import { ReporteDTO, ActualizarEstatusDTO } from '../types';
import { isVisibleAssignedStatus } from './fieldApiContract';
import { queueEstimate, queueEvidence, queueResolutionAndStatus, queueStatus, queueSupervisionResult } from './fieldOperationsService';
import type { SyncResult } from './syncService';

export const reportesService = {
  async getAsignados(idCuadrilla: number): Promise<ReporteDTO[]> {
    const [asignados, supervisados] = await Promise.all([
      getReportesAsignados(idCuadrilla),
      getReportesSupervisados(idCuadrilla),
    ]);
    const assignedIds = new Set(asignados.map((reporte) => reporte.id));
    return asignados
      .concat(supervisados.filter((reporte) => !assignedIds.has(reporte.id)))
      .filter((reporte) => isVisibleAssignedStatus(reporte.estatus));
  },

  async getDetalle(id: number): Promise<ReporteDTO> {
    return getReporteDetalle(id);
  },

  async actualizarEstatus(id: number, data: ActualizarEstatusDTO): Promise<SyncResult> {
    if (data.estatus !== 3 && data.estatus !== 4 && data.estatus !== 5) {
      throw new Error('Estatus operativo inválido');
    }
    const comentarios = data.comentariosResolucion?.trim();
    return data.estatus === 5 && comentarios
      ? queueResolutionAndStatus(id, comentarios, 5)
      : queueStatus(id, data.estatus);
  },

  async actualizarTiempoEstimado(id: number, tiempoEstimado: number): Promise<SyncResult> {
    if (!Number.isFinite(tiempoEstimado) || tiempoEstimado < 1 || tiempoEstimado > 1440) {
      throw new Error('El tiempo estimado debe estar entre 1 y 1440 minutos.');
    }
    return queueEstimate(id, tiempoEstimado);
  },

  async resolverSupervision(id: number, confirmaReparacion: boolean, observaciones?: string): Promise<SyncResult> {
    return queueSupervisionResult(id, confirmaReparacion, observaciones?.trim() || undefined);
  },

  async subirEvidenciaResolucion(
    idReporte: number,
    uri: string,
    fileName: string,
    mimeType: string
  ): Promise<SyncResult> {
    return queueEvidence(idReporte, uri, fileName, mimeType);
  },
};
