import { apiClient, USE_MOCK_DATA } from './api';
import {
  ReporteDTO,
  ReporteDetalleDTO,
  ReporteCreacionDTO,
  ActualizarCategoriaDTO,
  AsignarCuadrillaDTO,
  ProgramarSupervisionDTO,
  EstatusReporte,
  TipoProblema,
  LandingPageDTO,
} from '../types';
import { INITIAL_REPORTES } from './mockData';

// Estado local reactivo para el modo Mock / Offline
let localReportes: ReporteDetalleDTO[] = (() => {
  const saved = localStorage.getItem('arje_local_reportes');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return [...INITIAL_REPORTES];
})();

function persistLocalReportes() {
  localStorage.setItem('arje_local_reportes', JSON.stringify(localReportes));
}

export interface ReporteFilterOptions {
  pagina?: number;
  registrosPorPagina?: number;
  estatus?: EstatusReporte;
  tipoProblema?: TipoProblema;
  categoria?: string;
  idCuadrillaAsignada?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  busqueda?: string;
}

export const reportesService = {
  /**
   * Obtener lista de reportes con filtros
   */
  async getAll(filters: ReporteFilterOptions = {}): Promise<{ data: ReporteDTO[]; total: number }> {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 150));
      let filtered = [...localReportes];

      if (filters.estatus) {
        filtered = filtered.filter((r) => r.estatus === filters.estatus);
      }
      if (filters.tipoProblema) {
        filtered = filtered.filter((r) => r.tipoProblema === filters.tipoProblema);
      }
      if (filters.categoria) {
        const cat = filters.categoria.toLowerCase();
        filtered = filtered.filter((r) => r.categoria?.toLowerCase().includes(cat));
      }
      if (filters.idCuadrillaAsignada) {
        filtered = filtered.filter((r) => r.idCuadrillaAsignada === filters.idCuadrillaAsignada);
      }
      if (filters.busqueda) {
        const q = filters.busqueda.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.folio?.toLowerCase().includes(q) ||
            r.descripcion.toLowerCase().includes(q) ||
            r.categoria?.toLowerCase().includes(q) ||
            r.direccion?.toLowerCase().includes(q) ||
            r.numeroContrato?.toLowerCase().includes(q) ||
            r.nombreCiudadano?.toLowerCase().includes(q)
        );
      }

      const total = filtered.length;
      const page = filters.pagina || 1;
      const perPage = filters.registrosPorPagina || 10;
      const start = (page - 1) * perPage;
      const data = filtered.slice(start, start + perPage);

      return { data, total };
    }

    try {
      const params = new URLSearchParams();
      if (filters.pagina) params.append('pagina', String(filters.pagina));
      if (filters.registrosPorPagina) params.append('registrosPorPagina', String(filters.registrosPorPagina));
      if (filters.estatus) params.append('estatus', String(filters.estatus));
      if (filters.tipoProblema) params.append('tipoProblema', String(filters.tipoProblema));
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.idCuadrillaAsignada) params.append('idCuadrillaAsignada', String(filters.idCuadrillaAsignada));

      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient<ReporteDTO[]>(`/reportes${query}`);
      return { data, total: data.length };
    } catch (err) {
      console.warn('API error, falling back to local data', err);
      return reportesService.getAll({ ...filters, pagina: 1 });
    }
  },

  /**
   * Obtener detalle completo de un reporte
   */
  async getById(id: number): Promise<ReporteDetalleDTO> {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 100));
      const rep = localReportes.find((r) => r.id === id);
      if (!rep) throw new Error(`Reporte con ID ${id} no encontrado`);
      return rep;
    }

    try {
      return await apiClient<ReporteDetalleDTO>(`/reportes/${id}`);
    } catch (err) {
      const rep = localReportes.find((r) => r.id === id);
      if (rep) return rep;
      throw err;
    }
  },

  /**
   * Crear un nuevo reporte
   */
  async create(dto: ReporteCreacionDTO): Promise<ReporteDTO> {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 200));
      const newId = Math.max(...localReportes.map((r) => r.id), 100) + 1;
      const nuevo: ReporteDetalleDTO = {
        id: newId,
        folio: `FOL-2023-${newId}`,
        tipoProblema: dto.tipoProblema,
        categoria: dto.categoria || 'Fuga en vía pública',
        confianzaIA: dto.confianzaIA || 0.95,
        razonamientoIA: dto.razonamientoIA || 'Clasificado automáticamente por Agente IA',
        descripcion: dto.descripcion,
        latitud: dto.latitud,
        longitud: dto.longitud,
        direccion: 'Zona Urbana, Aguascalientes',
        fechaRecibido: new Date().toISOString(),
        estatus: EstatusReporte.Nuevo,
        numeroContrato: dto.numeroContrato || null,
        nombreCiudadano: dto.nombreCiudadano || null,
        telefonoCiudadano: dto.telefonoCiudadano || null,
        totalEvidencias: 0,
        prioridad: 'Media',
        evidencias: [],
        seguimientosUbicacion: [],
      };
      localReportes.unshift(nuevo);
      persistLocalReportes();
      return nuevo;
    }

    return await apiClient<ReporteDTO>('/reportes', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Actualizar estatus del reporte (CU-07)
   */
  async updateEstatus(id: number, nuevoEstatus: EstatusReporte): Promise<void> {
    const rep = localReportes.find((r) => r.id === id);
    if (rep) {
      rep.estatus = nuevoEstatus;
      persistLocalReportes();
    }

    if (!USE_MOCK_DATA) {
      try {
        await apiClient(`/reportes/${id}/estatus`, {
          method: 'PUT',
          body: JSON.stringify(nuevoEstatus),
        });
      } catch (err) {
        console.warn('API error, kept in local state', err);
      }
    }
  },

  /**
   * Revisar/Corregir categoría asignada por IA
   */
  async actualizarCategoria(id: number, dto: ActualizarCategoriaDTO): Promise<void> {
    const rep = localReportes.find((r) => r.id === id);
    if (rep) {
      rep.categoria = dto.categoria;
      if (dto.tipoProblema) rep.tipoProblema = dto.tipoProblema;
      if (dto.razonamiento) rep.razonamientoIA = dto.razonamiento;
      persistLocalReportes();
    }

    if (!USE_MOCK_DATA) {
      try {
        await apiClient(`/reportes/${id}/categoria`, {
          method: 'PUT',
          body: JSON.stringify(dto),
        });
      } catch (err) {
        console.warn('API error updating category', err);
      }
    }
  },

  /**
   * Asignar reporte a cuadrilla (RF-11 / CU-05)
   */
  async asignarCuadrilla(id: number, dto: AsignarCuadrillaDTO, cuadrillaNombre?: string): Promise<void> {
    const rep = localReportes.find((r) => r.id === id);
    if (rep) {
      rep.idCuadrillaAsignada = dto.idCuadrilla;
      rep.cuadrillaAsignadaNombre = cuadrillaNombre || `Cuadrilla #${dto.idCuadrilla}`;
      rep.estatus = EstatusReporte.Asignado;
      if (dto.tiempoEstimado) rep.tiempoEstimado = dto.tiempoEstimado;
      persistLocalReportes();
    }

    if (!USE_MOCK_DATA) {
      try {
        await apiClient(`/reportes/${id}/asignar`, {
          method: 'PUT',
          body: JSON.stringify(dto),
        });
      } catch (err) {
        console.warn('API error assigning crew', err);
      }
    }
  },

  /**
   * Programar visita de supervisión posterior a la resolución (RF-13 / CU-06)
   */
  async programarSupervision(
    id: number,
    dto: ProgramarSupervisionDTO,
    cuadrillaSupervisoraNombre?: string
  ): Promise<void> {
    const rep = localReportes.find((r) => r.id === id);
    if (rep) {
      if (rep.idCuadrillaAsignada === dto.idCuadrillaSupervisora) {
        throw new Error(
          'La cuadrilla supervisora no puede ser la misma que atendió el reporte (Regla RF-13).'
        );
      }
      rep.idCuadrillaSupervisora = dto.idCuadrillaSupervisora;
      rep.cuadrillaSupervisoraNombre =
        cuadrillaSupervisoraNombre || `Cuadrilla #${dto.idCuadrillaSupervisora}`;
      rep.estatus = EstatusReporte.EnSupervision;
      rep.notasSupervision = dto.notasSupervision;
      persistLocalReportes();
    }

    if (!USE_MOCK_DATA) {
      try {
        await apiClient(`/reportes/${id}/supervision`, {
          method: 'PUT',
          body: JSON.stringify(dto),
        });
      } catch (err) {
        console.warn('API error scheduling supervision', err);
      }
    }
  },

  /**
   * Obtener reportes para la vista de aterrizaje / recientes
   */
  async getLanding(): Promise<LandingPageDTO> {
    if (USE_MOCK_DATA) {
      const enProceso = localReportes.filter(
        (r) => r.estatus === EstatusReporte.EnProceso || r.estatus === EstatusReporte.LevantandoInformacion
      );
      const nuevos = localReportes.filter(
        (r) => r.estatus === EstatusReporte.Nuevo || r.estatus === EstatusReporte.Asignado
      );
      return { enProceso, nuevos };
    }

    try {
      return await apiClient<LandingPageDTO>('/reportes/landing');
    } catch {
      const enProceso = localReportes.filter((r) => r.estatus === EstatusReporte.EnProceso);
      const nuevos = localReportes.filter((r) => r.estatus === EstatusReporte.Nuevo);
      return { enProceso, nuevos };
    }
  },

  /**
   * Eliminar reporte
   */
  async delete(id: number): Promise<void> {
    localReportes = localReportes.filter((r) => r.id !== id);
    persistLocalReportes();

    if (!USE_MOCK_DATA) {
      try {
        await apiClient(`/reportes/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('API error deleting', err);
      }
    }
  },
};
