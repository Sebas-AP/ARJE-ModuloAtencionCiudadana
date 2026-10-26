import type { ReporteDTO } from '../types';

const MAP_ASSIGNED_STATUSES = new Set([2, 3, 4]);

export interface AssignedMapMarker {
  id: number;
  latitud: number;
  longitud: number;
  estatus: number;
}

export interface AssignedMapModel {
  markers: AssignedMapMarker[];
  selectedId: number | null;
}

export function isValidMapCoordinate(latitud: number, longitud: number): boolean {
  return Number.isFinite(latitud)
    && Number.isFinite(longitud)
    && latitud >= -90
    && latitud <= 90
    && longitud >= -180
    && longitud <= 180;
}

export function buildAssignedMapModel(
  reportes: ReporteDTO[],
  selectedId: number | null,
): AssignedMapModel {
  const markers = reportes
    .filter((reporte) =>
      MAP_ASSIGNED_STATUSES.has(reporte.estatus)
      && isValidMapCoordinate(reporte.latitud, reporte.longitud))
    .map((reporte) => ({
      id: reporte.id,
      latitud: reporte.latitud,
      longitud: reporte.longitud,
      estatus: reporte.estatus,
    }));

  const authorizedSelection = selectedId !== null
    && markers.some((marker) => marker.id === selectedId)
      ? selectedId
      : markers[0]?.id ?? null;

  return { markers, selectedId: authorizedSelection };
}
