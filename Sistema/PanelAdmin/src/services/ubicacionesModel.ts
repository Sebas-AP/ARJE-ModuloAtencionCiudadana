import type { ReporteDTO } from '../types';
import type { CrewMapPosition, UltimaPosicionCuadrilla, UltimaUbicacionCuadrilla } from '../types/ubicaciones';

export const RECENT_LOCATION_MS = 120_000;

export function isValidCoordinatePair(latitud: number, longitud: number): boolean {
  return Number.isFinite(latitud)
    && Number.isFinite(longitud)
    && latitud >= -90
    && latitud <= 90
    && longitud >= -180
    && longitud <= 180;
}

function positionVersion(posicion: UltimaPosicionCuadrilla): { time: number; id: number } | null {
  const time = Date.parse(posicion.fechaHora);
  return Number.isFinite(time) && Number.isFinite(posicion.idSeguimiento)
    ? { time, id: posicion.idSeguimiento }
    : null;
}

export function comparePositions(a: UltimaPosicionCuadrilla, b: UltimaPosicionCuadrilla): number {
  const versionA = positionVersion(a);
  const versionB = positionVersion(b);
  if (!versionA) return versionB ? -1 : 0;
  if (!versionB) return 1;
  if (versionA.time !== versionB.time) return versionA.time - versionB.time;
  return versionA.id - versionB.id;
}

export function chooseNewestPosition(
  current: UltimaPosicionCuadrilla | null,
  incoming: UltimaPosicionCuadrilla | null,
): UltimaPosicionCuadrilla | null {
  if (!current) return incoming;
  if (!incoming) return current;
  return comparePositions(incoming, current) > 0 ? incoming : current;
}

export function mergeUbicacion(
  current: UltimaUbicacionCuadrilla | undefined,
  incoming: UltimaUbicacionCuadrilla,
): UltimaUbicacionCuadrilla {
  if (!current) return incoming;
  return {
    ...incoming,
    posicion: chooseNewestPosition(current.posicion, incoming.posicion),
  };
}

export function mergeSnapshot(
  known: UltimaUbicacionCuadrilla[],
  snapshot: UltimaUbicacionCuadrilla[],
): UltimaUbicacionCuadrilla[] {
  const merged = new Map(known.map((item) => [item.idCuadrilla, item]));
  for (const incoming of snapshot) {
    merged.set(incoming.idCuadrilla, mergeUbicacion(merged.get(incoming.idCuadrilla), incoming));
  }
  return [...merged.values()].sort((a, b) => a.idCuadrilla - b.idCuadrilla);
}

export function locationAgeMs(fechaHora: string, now: number = Date.now()): number {
  const capturedAt = Date.parse(fechaHora);
  if (!Number.isFinite(capturedAt)) return Number.POSITIVE_INFINITY;
  return Math.max(0, now - capturedAt);
}

export function isRecentLocation(fechaHora: string, now: number = Date.now()): boolean {
  const capturedAt = Date.parse(fechaHora);
  if (!Number.isFinite(capturedAt)) return false;
  const futureSkew = capturedAt - now;
  return futureSkew <= RECENT_LOCATION_MS && locationAgeMs(fechaHora, now) <= RECENT_LOCATION_MS;
}

export function toCrewMapPositions(
  ubicaciones: UltimaUbicacionCuadrilla[],
  now: number = Date.now(),
): CrewMapPosition[] {
  return ubicaciones.flatMap((ubicacion) => {
    const posicion = ubicacion.posicion;
    if (!posicion || !isValidCoordinatePair(posicion.latitud, posicion.longitud)) return [];
    return [{
      idCuadrilla: ubicacion.idCuadrilla,
      nombre: ubicacion.cuadrillaNombre,
      lat: posicion.latitud,
      lng: posicion.longitud,
      idSeguimiento: posicion.idSeguimiento,
      idReporte: posicion.idReporte,
      folioReporte: posicion.folioReporte,
      fechaHora: posicion.fechaHora,
      precisionMetros: posicion.precisionMetros,
      reciente: isRecentLocation(posicion.fechaHora, now),
    }];
  });
}

export function countVisibleReports(reportes: ReporteDTO[]): number {
  return reportes.filter((reporte) => isValidCoordinatePair(reporte.latitud, reporte.longitud)).length;
}
