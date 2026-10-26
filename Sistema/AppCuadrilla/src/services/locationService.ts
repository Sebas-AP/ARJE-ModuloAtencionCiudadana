import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { fieldOperationQueue, setFieldOperationOwner, syncFieldOperations } from './fieldOperationsService';
import { secureStorage } from './secureStorage';
import {
  LOCATION_DISTANCE_INTERVAL_METERS,
  LOCATION_TIME_INTERVAL_MS,
  type TrackingState,
} from './locationTrackingPolicy';

export const LOCATION_TASK = 'background-location-task';
const ACTIVE_TRACKING_KEY = 'arje_active_location_tracking';
const LOCATION_SESSION_OWNER_KEY = 'arje_location_session_owner';
let locationSessionOwner: number | null | undefined;
const trackingListeners = new Set<(state: TrackingState | null) => void>();

type ActiveTracking = TrackingState;

function parsePositiveInteger(value: string | null): number | null {
  const parsed = value ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseActiveTracking(value: string | null): ActiveTracking | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ActiveTracking>;
    return Number.isInteger(parsed.reportId) && (parsed.reportId as number) > 0
      && Number.isInteger(parsed.ownerCuadrillaId) && (parsed.ownerCuadrillaId as number) > 0
      ? { reportId: parsed.reportId as number, ownerCuadrillaId: parsed.ownerCuadrillaId as number }
      : null;
  } catch {
    return null;
  }
}

function emitTrackingState(state: TrackingState | null): void {
  trackingListeners.forEach((listener) => listener(state));
}

async function notifyTrackingState(): Promise<void> {
  emitTrackingState(await getTrackingState());
}

function captureTimestamp(timestamp: number | undefined): string {
  const date = new Date(timestamp !== undefined && Number.isFinite(timestamp) ? timestamp : Date.now());
  return date.toISOString();
}

async function enqueueLocationSamples(tracking: ActiveTracking, locations: Location.LocationObject[]): Promise<void> {
  for (const location of locations) {
    await fieldOperationQueue.enqueue({
      kind: 'location',
      reportId: tracking.reportId,
      latitud: location.coords.latitude,
      longitud: location.coords.longitude,
      fechaCaptura: captureTimestamp(location.timestamp),
      ...(typeof location.coords.accuracy === 'number' && Number.isFinite(location.coords.accuracy)
        && location.coords.accuracy >= 0 && { precisionMetros: location.coords.accuracy }),
    });
  }
}

if (Platform.OS !== 'web') TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    try {
      const tracking = await getActiveTracking();
      const sessionOwner = await getLocationSessionOwner();
      if (tracking && sessionOwner === tracking.ownerCuadrillaId && locations.length > 0) {
        // A headless task has no in-memory auth state; re-establish only the owner
        // persisted by the authenticated session before queueing its coordinates.
        setFieldOperationOwner(sessionOwner);
        await enqueueLocationSamples(tracking, locations);
        // Sync once for the entire batch. The sync path does not emit locations,
        // so this cannot recursively trigger this background task.
        await syncFieldOperations();
      }
    } catch (err) {
      console.error('Error storing location:', err);
    }
  }
});

export const setLocationSessionOwner = async (ownerCuadrillaId: number | null): Promise<void> => {
  // Keep the foreground process safe immediately; persistence is for a later
  // headless TaskManager invocation.
  locationSessionOwner = ownerCuadrillaId;
  if (ownerCuadrillaId === null) {
    await secureStorage.deleteItemAsync(LOCATION_SESSION_OWNER_KEY);
  } else {
    await secureStorage.setItemAsync(LOCATION_SESSION_OWNER_KEY, String(ownerCuadrillaId));
  }
  await notifyTrackingState();
};

const getLocationSessionOwner = async (): Promise<number | null> => {
  if (locationSessionOwner !== undefined) return locationSessionOwner;
  locationSessionOwner = parsePositiveInteger(await secureStorage.getItemAsync(LOCATION_SESSION_OWNER_KEY));
  return locationSessionOwner;
};

export const setActiveReporteId = async (id: number | null): Promise<void> => {
  if (id === null) {
    await secureStorage.deleteItemAsync(ACTIVE_TRACKING_KEY);
    await notifyTrackingState();
    return;
  }

  const ownerCuadrillaId = fieldOperationQueue.getActiveOwner();
  const sessionOwner = await getLocationSessionOwner();
  if (ownerCuadrillaId === null || sessionOwner === null || ownerCuadrillaId !== sessionOwner) {
    throw new Error('No se puede iniciar seguimiento GPS sin una sesión activa de cuadrilla.');
  }
  await secureStorage.setItemAsync(ACTIVE_TRACKING_KEY, JSON.stringify({ reportId: id, ownerCuadrillaId }));
  await notifyTrackingState();
};

const getActiveTracking = async (): Promise<ActiveTracking | null> => {
  return parseActiveTracking(await secureStorage.getItemAsync(ACTIVE_TRACKING_KEY));
};

export const getTrackingState = async (): Promise<TrackingState | null> => {
  if (Platform.OS === 'web') return null;

  const tracking = await getActiveTracking();
  if (!tracking) return null;
  const [sessionOwner, isRegistered] = await Promise.all([
    getLocationSessionOwner(),
    TaskManager.isTaskRegisteredAsync(LOCATION_TASK),
  ]);
  return sessionOwner === tracking.ownerCuadrillaId && isRegistered ? tracking : null;
};

export const subscribeTrackingState = (listener: (state: TrackingState | null) => void): (() => void) => {
  trackingListeners.add(listener);
  void getTrackingState().then(listener, () => listener(null));
  return () => { trackingListeners.delete(listener); };
};

export const startLocationTracking = async (idReporte: number): Promise<void> => {
  if (Platform.OS === 'web') {
    throw new Error('El seguimiento GPS en segundo plano sólo está disponible en la aplicación móvil.');
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permiso de ubicación denegado');
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    throw new Error('Permiso de ubicación en segundo plano denegado');
  }

  await setActiveReporteId(idReporte);

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: LOCATION_TIME_INTERVAL_MS,
      distanceInterval: LOCATION_DISTANCE_INTERVAL_METERS,
      foregroundService: {
        notificationTitle: 'ARJE Cuadrilla - Seguimiento activo',
        notificationBody: `Enviando ubicación para reporte #${idReporte}`,
        notificationColor: '#253C96',
      },
    });
  } catch (error) {
    await setActiveReporteId(null);
    throw error;
  }

  const tracking = await getActiveTracking();
  if (tracking) emitTrackingState(tracking);

  try {
    const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    if (tracking) {
      await enqueueLocationSamples(tracking, [initial]);
      await syncFieldOperations();
    }
  } catch (error) {
    console.warn('No se pudo capturar la muestra inicial de ubicación:', error);
  }
};

export const stopLocationTracking = async (): Promise<void> => {
  let stopError: unknown;
  try {
    if (Platform.OS !== 'web') {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      }
    }
  } catch (error) {
    stopError = error;
  } finally {
    await setActiveReporteId(null);
    emitTrackingState(null);
  }
  if (stopError) throw stopError;
};

export const clearLocationSession = async (): Promise<void> => {
  await setLocationSessionOwner(null);
  await stopLocationTracking();
};

export const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
};

export const watchLocation = (
  callback: (location: { latitude: number; longitude: number }) => void
): Promise<Location.LocationSubscription> => {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000,
      distanceInterval: 10,
    },
    (location) => {
      callback({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
  );
};
