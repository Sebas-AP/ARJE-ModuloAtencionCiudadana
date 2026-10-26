import type { Coordenadas } from '../types';

export function isValidReportCoordinate(coordenada: Coordenadas | null | undefined): coordenada is Coordenadas {
  return !!coordenada
    && Number.isFinite(coordenada.latitud)
    && Number.isFinite(coordenada.longitud)
    && coordenada.latitud >= -90
    && coordenada.latitud <= 90
    && coordenada.longitud >= -180
    && coordenada.longitud <= 180;
}

export function getConfirmedReportLocation(
  selected: Coordenadas | null,
  confirmed: boolean,
): Coordenadas | null {
  if (!confirmed || !isValidReportCoordinate(selected)) return null;
  return { latitud: selected.latitud, longitud: selected.longitud };
}

export function applySuggestedCoordinate(
  current: Coordenadas | null,
  suggested: Coordenadas | null,
): Coordenadas | null {
  if (current !== null) return current;
  return isValidReportCoordinate(suggested) ? suggested : null;
}

export function selectCoordinate(
  next: Coordenadas | null,
): { coordenada: Coordenadas | null; confirmada: false } {
  return {
    coordenada: isValidReportCoordinate(next) ? next : null,
    confirmada: false,
  };
}
