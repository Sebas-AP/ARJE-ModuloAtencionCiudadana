import {
  getReportesAsignados,
  getReporteDetalle,
  actualizarEstatusReporte,
  subirEvidencia,
} from './api';
import { ReporteDTO, ActualizarEstatusDTO } from '../types';
import { isActiveAssignedStatus } from './fieldApiContract';

export const reportesService = {
  async getAsignados(idCuadrilla: number): Promise<ReporteDTO[]> {
    const reportes = await getReportesAsignados(idCuadrilla);
    return reportes.filter((reporte) => isActiveAssignedStatus(reporte.estatus));
  },

  async getDetalle(id: number): Promise<ReporteDTO> {
    return getReporteDetalle(id);
  },

  async actualizarEstatus(id: number, data: ActualizarEstatusDTO): Promise<void> {
    return actualizarEstatusReporte(id, data);
  },

  async subirEvidenciaResolucion(
    idReporte: number,
    uri: string,
    fileName: string,
    mimeType: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append('tipo', '2'); // 2 = Resolucion
    formData.append('archivo', {
      uri,
      name: fileName,
      type: mimeType,
    } as any);

    return subirEvidencia(idReporte, formData);
  },
};
