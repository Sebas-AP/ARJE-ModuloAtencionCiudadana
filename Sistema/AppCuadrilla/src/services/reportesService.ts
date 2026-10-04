import {
  getReportesAsignados,
  getReporteDetalle,
  actualizarEstatusReporte,
  subirEvidencia,
} from './api';
import { ReporteDTO, ActualizarEstatusDTO } from '../types';

export const reportesService = {
  async getAsignados(idCuadrilla: number): Promise<ReporteDTO[]> {
    return getReportesAsignados(idCuadrilla);
  },

  async getDetalle(id: number): Promise<ReporteDTO> {
    return getReporteDetalle(id);
  },

  async actualizarEstatus(id: number, data: ActualizarEstatusDTO): Promise<ReporteDTO> {
    return actualizarEstatusReporte(id, data);
  },

  async subirEvidenciaResolucion(
    idReporte: number,
    uri: string,
    fileName: string,
    mimeType: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append('idReporte', String(idReporte));
    formData.append('tipo', '2'); // 2 = Resolucion
    formData.append('archivo', {
      uri,
      name: fileName,
      type: mimeType,
    } as any);

    return subirEvidencia(formData);
  },
};