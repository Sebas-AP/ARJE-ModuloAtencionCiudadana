import {
  getMisReportes,
  getReporteDetalle,
} from './api';
import { ReporteDTO, ActualizarEstatusDTO } from '../types';
import { isVisibleAssignedStatus } from './fieldApiContract';
import {
  queueEstimate,
  queueEvidence,
  queueInProcessReason,
  queueInProcessReasonAndStatus,
  queueResolutionAndStatus,
  queueStatus,
  queueSupervisionResult,
} from './fieldOperationsService';
import type { SyncResult } from './syncService';

export const reportesService = {
  async getAsignados(idCuadrilla: number): Promise<ReporteDTO[]> {
    void idCuadrilla;
    return (await getMisReportes())
      .filter((reporte) => isVisibleAssignedStatus(reporte.estatus));
  },

  async getDetalle(id: number): Promise<ReporteDTO> {
    return getReporteDetalle(id);
  },

  async actualizarEstatus(id: number, data: ActualizarEstatusDTO): Promise<SyncResult> {
    if (data.estatus !== 3 && data.estatus !== 4 && data.estatus !== 5) {
      throw new Error('Estatus operativo inválido');
    }
    if (data.estatus === 4 && data.motivoEnProceso != null) {
      return queueInProcessReasonAndStatus(id, data.motivoEnProceso, data.motivoEnProcesoDetalle?.trim() || undefined, 4);
    }
    if (data.estatus === 5 && data.motivoResolucion != null) {
      return queueResolutionAndStatus(id, data.motivoResolucion, data.comentariosResolucion?.trim() || undefined, 5);
    }
    return queueStatus(id, data.estatus);
  },

  async actualizarTiempoEstimado(id: number, tiempoEstimado: number, unidad: number): Promise<SyncResult> {
    const limite = unidad === 2 ? 30 : 240;
    if (!Number.isFinite(tiempoEstimado) || tiempoEstimado < 1 || tiempoEstimado > limite) {
      throw new Error(`El tiempo estimado debe estar entre 1 y ${limite} ${unidad === 2 ? 'días' : 'horas'}.`);
    }
    return queueEstimate(id, tiempoEstimado, unidad);
  },

  async actualizarMotivoEnProceso(id: number, motivo: number, detalle?: string): Promise<SyncResult> {
    return queueInProcessReason(id, motivo, detalle?.trim() || undefined);
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
