import { apiClient, USE_MOCK_DATA } from './api';
import { CuadrillaDTO, CuadrillaCreacionDTO, EstatusCuadrilla } from '../types';
import { INITIAL_CUADRILLAS } from './mockData';

let localCuadrillas: CuadrillaDTO[] = (() => {
  const saved = localStorage.getItem('arje_local_cuadrillas');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return [...INITIAL_CUADRILLAS];
})();

function persistLocalCuadrillas() {
  localStorage.setItem('arje_local_cuadrillas', JSON.stringify(localCuadrillas));
}

export const cuadrillasService = {
  /**
   * Obtener todas las cuadrillas
   */
  async getAll(): Promise<CuadrillaDTO[]> {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 100));
      return [...localCuadrillas];
    }

    try {
      return await apiClient<CuadrillaDTO[]>('/cuadrillas');
    } catch (err) {
      console.warn('API error fetching cuadrillas, using local state', err);
      return [...localCuadrillas];
    }
  },

  /**
   * Obtener cuadrilla por ID
   */
  async getById(id: number): Promise<CuadrillaDTO> {
    if (USE_MOCK_DATA) {
      const c = localCuadrillas.find((x) => x.id === id);
      if (!c) throw new Error(`Cuadrilla ${id} no encontrada`);
      return c;
    }

    try {
      return await apiClient<CuadrillaDTO>(`/cuadrillas/${id}`);
    } catch {
      const c = localCuadrillas.find((x) => x.id === id);
      if (c) return c;
      throw new Error(`Cuadrilla ${id} no encontrada`);
    }
  },

  /**
   * Registrar nueva cuadrilla (RF-10)
   */
  async create(dto: CuadrillaCreacionDTO & { telefonoContacto?: string; vehiculo?: string }): Promise<CuadrillaDTO> {
    if (USE_MOCK_DATA) {
      const newId = Math.max(...localCuadrillas.map((c) => c.id), 0) + 1;
      const nueva: CuadrillaDTO = {
        id: newId,
        nombre: dto.nombre,
        integrantes: dto.integrantes || 'Personal asignado',
        usuarioApp: dto.usuarioApp,
        estatusDisponibilidad: dto.estatusDisponibilidad || EstatusCuadrilla.Disponible,
        reportesActivosCount: 0,
        telefonoContacto: dto.telefonoContacto || '449-000-0000',
        vehiculo: dto.vehiculo || 'Camioneta Utilitaria',
      };
      localCuadrillas.push(nueva);
      persistLocalCuadrillas();
      return nueva;
    }

    return await apiClient<CuadrillaDTO>('/cuadrillas', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Actualizar estatus de disponibilidad
   */
  async updateDisponibilidad(id: number, estatus: EstatusCuadrilla): Promise<void> {
    const c = localCuadrillas.find((x) => x.id === id);
    if (c) {
      c.estatusDisponibilidad = estatus;
      persistLocalCuadrillas();
    }

    if (!USE_MOCK_DATA) {
      try {
        await apiClient(`/cuadrillas/${id}/disponibilidad`, {
          method: 'PUT',
          body: JSON.stringify({ estatusDisponibilidad: estatus }),
        });
      } catch (err) {
        console.warn('API error updating disponibilidad', err);
      }
    }
  },

  /**
   * Alias de compatibilidad para actualización de disponibilidad
   */
  async actualizarDisponibilidad(id: number, estatus: EstatusCuadrilla): Promise<CuadrillaDTO> {
    await this.updateDisponibilidad(id, estatus);
    return this.getById(id);
  },

  /**
   * Eliminar cuadrilla
   */
  async delete(id: number): Promise<void> {
    localCuadrillas = localCuadrillas.filter((c) => c.id !== id);
    persistLocalCuadrillas();

    if (!USE_MOCK_DATA) {
      try {
        await apiClient(`/cuadrillas/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('API error deleting cuadrilla', err);
      }
    }
  },
};
