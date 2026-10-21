import { apiClient, apiClientWithHeaders, USE_MOCK_DATA } from './api';
import {
  ReporteDTO,
  ReporteDetalleDTO,
  ReporteCreacionDTO,
  ActualizarCategoriaDTO,
  ActualizarPrioridadDTO,
  AsignarCuadrillaDTO,
  ProgramarSupervisionDTO,
  EstatusReporte,
  TipoProblema,
  LandingPageDTO,
} from '../types';
import { INITIAL_REPORTES } from './mockData';
import { loadRemoteReportes } from './remoteReportesLoad';

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
  prioridad?: string;
  ordenarPorPrioridad?: boolean;
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
      if (filters.prioridad && filters.prioridad !== 'todas') {
        const prio = filters.prioridad.toLowerCase();
        filtered = filtered.filter((r) => String(r.prioridad || '').toLowerCase().includes(prio));
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

    const params = new URLSearchParams();
    if (filters.pagina) params.append('pagina', String(filters.pagina));
    if (filters.registrosPorPagina) params.append('registrosPorPagina', String(filters.registrosPorPagina));
    if (filters.estatus) params.append('estatus', String(filters.estatus));
    if (filters.tipoProblema) params.append('tipoProblema', String(filters.tipoProblema));
    if (filters.categoria) params.append('categoria', filters.categoria);
    if (filters.prioridad && filters.prioridad !== 'todas') {
      const pMap: Record<string, string> = { critica: '4', crtica: '4', alta: '3', media: '2', baja: '1' };
      const pVal = pMap[filters.prioridad.toLowerCase()] || filters.prioridad;
      params.append('prioridad', pVal);
    }
    if (filters.ordenarPorPrioridad) params.append('ordenarPorPrioridad', 'true');
    if (filters.idCuadrillaAsignada) params.append('idCuadrillaAsignada', String(filters.idCuadrillaAsignada));

    const query = params.toString() ? `?${params.toString()}` : '';
    const { data, total } = await loadRemoteReportes(() => apiClientWithHeaders<ReporteDTO[]>(`/reportes${query}`));
    return { data, total };
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

    return await apiClient<ReporteDetalleDTO>(`/reportes/${id}`);
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
        folio: `REP-2026-${newId}`,
        tipoProblema: dto.tipoProblema,
        categoria: dto.categoria || 'Fuga en vía pública',
        confianzaIA: dto.confianzaIA || 0.95,
        razonamientoIA: dto.razonamientoIA || 'Clasificado automáticamente por Agente IA',
        prioridad: (dto.prioridad as any) || 'Media',
        scorePrioridad: dto.scorePrioridad || 0.50,
        justificacionPrioridad: dto.justificacionPrioridad || 'Prioridad evaluada por Agente IA de triage',
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
   * Actualizar categoría y razonamiento del reporte
   */
  async actualizarCategoria(id: number, dto: ActualizarCategoriaDTO): Promise<void> {
    if (USE_MOCK_DATA) {
      const rep = localReportes.find((r) => r.id === id);
      if (rep) {
        rep.categoria = dto.categoria;
        if (dto.tipoProblema) rep.tipoProblema = dto.tipoProblema;
        if (dto.razonamiento) rep.razonamientoIA = dto.razonamiento;
        persistLocalReportes();
      }
      return;
    }

    await apiClient<void>(`/reportes/${id}/categoria`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Actualizar manualmente la prioridad de un reporte
   */
  async actualizarPrioridad(id: number, dto: ActualizarPrioridadDTO): Promise<void> {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 150));
      const rep = localReportes.find((r) => r.id === id);
      if (rep) {
        const pMap: Record<number, string> = { 4: 'Critica', 3: 'Alta', 2: 'Media', 1: 'Baja' };
        rep.prioridad = typeof dto.prioridad === 'number' ? (pMap[dto.prioridad] || 'Media') : String(dto.prioridad);
        if (dto.justificacion) rep.justificacionPrioridad = dto.justificacion;
        persistLocalReportes();
      }
      return;
    }

    await apiClient<void>(`/reportes/${id}/prioridad`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Reevaluar prioridad mediante Agente IA
   */
  async revaluarPrioridad(id: number): Promise<ReporteDetalleDTO> {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 300));
      const rep = localReportes.find((r) => r.id === id);
      if (!rep) throw new Error(`Reporte con ID ${id} no encontrado`);
      rep.prioridad = 'Critica';
      rep.scorePrioridad = 0.94;
      rep.justificacionPrioridad = 'Prioridad reevaluada por Agente IA: detección de afectación severa';
      persistLocalReportes();
      return { ...rep };
    }

    return await apiClient<ReporteDetalleDTO>(`/reportes/${id}/revaluar-prioridad`, {
      method: 'POST',
    });
  },

  /**
   * Asignar cuadrilla de trabajo a un reporte
   */
  async asignarCuadrilla(id: number, dto: AsignarCuadrillaDTO): Promise<void> {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 200));
      const rep = localReportes.find((r) => r.id === id);
      if (rep) {
        rep.idCuadrillaAsignada = dto.IdCuadrilla ?? dto.idCuadrilla;
        rep.estatus = EstatusReporte.Asignado;
        if (dto.TiempoEstimado || dto.tiempoEstimado) {
          rep.tiempoEstimado = dto.TiempoEstimado ?? dto.tiempoEstimado;
        }
        persistLocalReportes();
      }
      return;
    }

    await apiClient<void>(`/reportes/${id}/asignar`, {
      method: 'PUT',
      body: JSON.stringify({
        idCuadrilla: dto.idCuadrilla || dto.IdCuadrilla,
        tiempoEstimado: dto.tiempoEstimado || dto.TiempoEstimado,
      }),
    });
  },

  /**
   * Programar supervisión (RF-13)
   */
  async programarSupervision(id: number, dto: ProgramarSupervisionDTO): Promise<void> {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 200));
      const rep = localReportes.find((r) => r.id === id);
      if (rep) {
        rep.idCuadrillaSupervisora = dto.IdCuadrillaSupervisora ?? dto.idCuadrillaSupervisora;
        rep.estatus = EstatusReporte.EnSupervision;
        rep.fechaSupervision = dto.FechaSupervision ?? dto.fechaSupervision ?? new Date().toISOString();
        rep.notasSupervision = dto.NotasSupervision ?? dto.notasSupervision;
        persistLocalReportes();
      }
      return;
    }

    try {
      await apiClient(`/reportes/${id}/supervision`, {
        method: 'PUT',
        body: JSON.stringify({
          idCuadrillaSupervisora: dto.idCuadrillaSupervisora || dto.IdCuadrillaSupervisora,
          fechaSupervision: dto.fechaSupervision || dto.FechaSupervision,
          notasSupervision: dto.notasSupervision || dto.NotasSupervision,
        }),
      });
    } catch (err) {
      console.error('API error scheduling supervision', err);
      throw err;
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

    return await apiClient<LandingPageDTO>('/reportes/landing');
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

  /**
   * Obtener última ubicación conocida de todas las cuadrillas
   * Usa el endpoint /api/reportes/{id}/ubicaciones/ultima para cada reporte activo
   */
  async getCuadrillasUltimasUbicaciones(): Promise<{ idCuadrilla: number; lat: number; lng: number; fecha: string; nombre: string }[]> {
    if (USE_MOCK_DATA) {
      return [];
    }

    try {
      // Obtener todos los reportes activos (en proceso, levantando info, asignado)
      const { data: reportesActivos } = await this.getAll({
        estatus: undefined,
        registrosPorPagina: 1000,
      });
      
      const reportesConCuadrilla = reportesActivos.filter(r => 
        r.idCuadrillaAsignada && 
        (r.estatus === EstatusReporte.Asignado || 
         r.estatus === EstatusReporte.LevantandoInformacion || 
         r.estatus === EstatusReporte.EnProceso)
      );

      // Obtener última ubicación para cada reporte con cuadrilla
      const ubicacionesPromises = reportesConCuadrilla.map(async (reporte) => {
        try {
          const ultima = await apiClient<any>(`/reportes/${reporte.id}/ubicaciones/ultima`);
          if (ultima && ultima.latitud && ultima.longitud) {
            return {
              idCuadrilla: reporte.idCuadrillaAsignada!,
              lat: ultima.latitud,
              lng: ultima.longitud,
              fecha: ultima.fechaHora,
              nombre: reporte.cuadrillaAsignadaNombre || `Cuadrilla ${reporte.idCuadrillaAsignada}`,
            };
          }
          return null;
        } catch {
          return null;
        }
      });

      const resultados = await Promise.all(ubicacionesPromises);
      return resultados.filter((u): u is { idCuadrilla: number; lat: number; lng: number; fecha: string; nombre: string } => u !== null);
    } catch (error) {
      console.warn('Error obteniendo ubicaciones de cuadrillas:', error);
      return [];
    }
  },
};
