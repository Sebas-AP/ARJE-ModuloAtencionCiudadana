import {
  getReportesAsignados,
  getReporteDetalle,
} from './api';
import { ReporteDTO, ActualizarEstatusDTO } from '../types';
import { isActiveAssignedStatus } from './fieldApiContract';
import { queueEvidence, queueStatus } from './fieldOperationsService';
import type { SyncResult } from './syncService';

export const reportesService = {
  async getAsignados(idCuadrilla: number): Promise<ReporteDTO[]> {
    const reportes = await getReportesAsignados(idCuadrilla);
    return reportes.filter((reporte) => isActiveAssignedStatus(reporte.estatus));
  },

  async getDetalle(id: number): Promise<ReporteDTO> {
    return getReporteDetalle(id);
  },

  async actualizarEstatus(id: number, data: ActualizarEstatusDTO): Promise<SyncResult> {
    if (data.estatus !== 3 && data.estatus !== 4 && data.estatus !== 5) {
      throw new Error('Estatus operativo inválido');
    }
    return queueStatus(id, data.estatus);
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
