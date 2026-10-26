export const LOCATION_TIME_INTERVAL_MS = 30_000;
export const LOCATION_DISTANCE_INTERVAL_METERS = 20;
export const LOCATION_ACCURACY = 'High' as const;

const TRACKING_STATUSES = new Set([3, 4]);

export function canTrackReportStatus(estatus?: number): boolean {
  return estatus !== undefined && TRACKING_STATUSES.has(estatus);
}

export type TrackingState = {
  reportId: number;
  ownerCuadrillaId: number;
};

export type TrackingDecision = {
  reportStatus?: number;
  foregroundPermission: boolean;
  backgroundPermission: boolean;
  ownerCuadrillaId: number | null;
  sessionOwnerCuadrillaId: number | null;
  assignmentActive: boolean;
};

export function canTrackLocation(input: TrackingDecision): boolean {
  return canTrackReportStatus(input.reportStatus)
    && input.foregroundPermission
    && input.backgroundPermission
    && input.assignmentActive
    && input.ownerCuadrillaId !== null
    && input.ownerCuadrillaId === input.sessionOwnerCuadrillaId;
}

export function isTrackingSelectedReport(
  state: TrackingState | null,
  selectedReportId?: number,
): boolean {
  return state !== null && selectedReportId !== undefined && state.reportId === selectedReportId;
}
