import { api, apiClient } from './api';
import {
  ReporteCreacionDTO,
  ReporteDTO,
  ReporteDetalleDTO,
  EvidenciaDTO,
  EvidenciaCreacionDTO,
  LandingPageDTO,
  PaginatedResponse,
  TipoProblema,
  EstatusReporte,
} from '../types';

export interface ReportesFilters {
  pagina?: number;
  registrosPorPagina?: number;
  estatus?: EstatusReporte;
  tipoProblema?: TipoProblema;
  idCuadrillaAsignada?: number;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface ClasificacionResult {
  tipoProblema: TipoProblema;
  confianza: number;
  razonamiento: string;
}

export const reportesService = {
  async getAll(filters: ReportesFilters = {}): Promise<PaginatedResponse<ReporteDTO>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const response = await apiClient.get<ReporteDTO[]>(`/reportes?${params.toString()}`);
    const totalRegistros = parseInt(response.headers?.['x-total-count'] || '0', 10);
    return {
      data: response.data,
      totalRegistros,
      pagina: filters.pagina || 1,
      registrosPorPagina: filters.registrosPorPagina || 10,
      totalPaginas: Math.ceil(totalRegistros / (filters.registrosPorPagina || 10)),
    };
  },

  async getLanding(): Promise<LandingPageDTO> {
    return api.get<LandingPageDTO>('/reportes/landing');
  },

  async getById(id: number): Promise<ReporteDetalleDTO> {
    return api.get<ReporteDetalleDTO>(`/reportes/${id}`);
  },

  async create(data: ReporteCreacionDTO): Promise<ReporteDTO> {
    return api.post<ReporteDTO>('/reportes', data);
  },

  async update(id: number, data: ReporteCreacionDTO): Promise<void> {
    await api.put(`/reportes/${id}`, data);
  },

  async updateEstatus(id: number, estatus: EstatusReporte): Promise<void> {
    await api.put(`/reportes/${id}/estatus`, estatus);
  },

  async uploadEvidencia(
    id: number,
    file: { uri: string; name: string; type: string },
    tipo: number,
    onProgress?: (progress: number) => void
  ): Promise<EvidenciaDTO> {
    const formData = new FormData();
    formData.append('Archivo', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
    formData.append('Tipo', String(tipo));

    return api.uploadFile<EvidenciaDTO>(`/reportes/${id}/evidencias`, formData, onProgress);
  },

  async getEvidencias(id: number): Promise<EvidenciaDTO[]> {
    return api.get<EvidenciaDTO[]>(`/reportes/${id}/evidencias`);
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/reportes/${id}`);
  },
};

export const clasificacionService = {
  async classify(description: string): Promise<ClasificacionResult> {
    const response = await api.post<ClasificacionResult>(
      '/clasificacion',
      { descripcion: description }
    );
    return response;
  },
};