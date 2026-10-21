import { api, apiClient } from './api';
import {
  ReporteCreacionDTO,
  ReporteDTO,
  ReporteDetalleDTO,
  EvidenciaDTO,
  EvidenciaCreacionDTO,
  LandingPageDTO,
  PaginatedResponse,
  ReportePublicoDTO,
  EvidenciaPublicoDTO,
  ReporteConsultaPaginadoDTO,
  ReporteCiudadanoRespuestaDTO,
  TipoProblema,
  EstatusReporte,
  TipoEvidencia,
} from '../types';
import { Platform } from 'react-native';

export interface ReportesFilters {
  pagina?: number;
  registrosPorPagina?: number;
  estatus?: EstatusReporte;
  tipoProblema?: TipoProblema;
  idCuadrillaAsignada?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  numeroContrato?: string;
}

export interface ClasificacionResult {
  categoria?: string;
  tipoProblema: TipoProblema;
  confianza: number;
  razonamiento: string;
}

// Helper to convert file URI to Blob/File for web upload
async function createFileForUpload(file: { uri: string; name: string; type: string }): Promise<File | { uri: string; name: string; type: string }> {
  if (Platform.OS === 'web') {
    // On web, fetch the file and create a Blob/File
    const response = await fetch(file.uri);
    const blob = await response.blob();
    return new File([blob], file.name, { type: file.type });
  }
  // On native, return the React Native file object format
  return {
    uri: file.uri,
    name: file.name,
    type: file.type,
  };
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

  async getPublicoById(id: number, numeroContrato: string): Promise<ReportePublicoDTO> {
    return api.get<ReportePublicoDTO>(`/reportes/${id}/publico?numeroContrato=${encodeURIComponent(numeroContrato)}`);
  },

  async getEvidenciasPublico(id: number, numeroContrato: string): Promise<EvidenciaPublicoDTO[]> {
    return api.get<EvidenciaPublicoDTO[]>(`/reportes/${id}/evidencias/publico?numeroContrato=${encodeURIComponent(numeroContrato)}`);
  },

  async consultaPublica(numeroContrato: string, pagina = 1, registrosPorPagina = 10): Promise<ReporteConsultaPaginadoDTO> {
    return api.get<ReporteConsultaPaginadoDTO>(
      `/reportes/consulta?numeroContrato=${encodeURIComponent(numeroContrato)}&pagina=${pagina}&registrosPorPagina=${registrosPorPagina}`
    );
  },

  async create(data: ReporteCreacionDTO): Promise<ReporteCiudadanoRespuestaDTO> {
    return api.post<ReporteCiudadanoRespuestaDTO>('/reportes', data);
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
    const uploadFile = await createFileForUpload(file);
    const formData = new FormData();
    formData.append('Archivo', uploadFile as any);
    formData.append('Tipo', String(tipo));

    return api.uploadFile<EvidenciaDTO>(`/reportes/${id}/evidencias`, formData, onProgress);
  },

  async uploadEvidenciaCiudadano(
    id: number,
    file: { uri: string; name: string; type: string },
    tipo: TipoEvidencia,
    uploadToken: string,
    onProgress?: (progress: number) => void
  ): Promise<EvidenciaPublicoDTO> {
    const uploadFile = await createFileForUpload(file);
    const formData = new FormData();
    formData.append('Archivo', uploadFile as any);
    formData.append('Tipo', String(tipo));

    return api.uploadFile<EvidenciaPublicoDTO>(
      `/reportes/${id}/evidencias/ciudadano?uploadToken=${encodeURIComponent(uploadToken)}`,
      formData,
      onProgress
    );
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