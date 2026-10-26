import type { ReporteDTO } from '../types';
import {
  buildAssignedMapModel,
  isValidMapCoordinate,
  type AssignedMapModel,
} from './mapaAsignadosModel.ts';

export interface WebOwnLocation {
  latitude: number;
  longitude: number;
}

export interface WebMapModel extends AssignedMapModel {
  ownLocation: WebOwnLocation | null;
}

export function buildWebMapModel(
  reportes: ReporteDTO[],
  selectedId: number | null,
  ownLocation: WebOwnLocation | null,
): WebMapModel {
  const assigned = buildAssignedMapModel(reportes, selectedId);
  return {
    ...assigned,
    ownLocation: ownLocation
      && isValidMapCoordinate(ownLocation.latitude, ownLocation.longitude)
      ? ownLocation
      : null,
  };
}
