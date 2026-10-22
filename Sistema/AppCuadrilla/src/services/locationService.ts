import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { fieldOperationQueue, setFieldOperationOwner, syncFieldOperations } from './fieldOperationsService';
import { secureStorage } from './secureStorage';

export const LOCATION_TASK = 'background-location-task';
const ACTIVE_TRACKING_KEY = 'arje_active_location_tracking';
const LOCATION_SESSION_OWNER_KEY = 'arje_location_session_owner';
let locationSessionOwner: number | null | undefined;

type ActiveTracking = {
  reportId: number;
  ownerCuadrillaId: number;
};

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
        for (const location of locations) {
          await fieldOperationQueue.enqueue({
            kind: 'location',
            reportId: tracking.reportId,
            latitud: location.coords.latitude,
            longitud: location.coords.longitude,
          });
        }
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
    return;
  }
  await secureStorage.setItemAsync(LOCATION_SESSION_OWNER_KEY, String(ownerCuadrillaId));
};

const getLocationSessionOwner = async (): Promise<number | null> => {
  if (locationSessionOwner !== undefined) return locationSessionOwner;
  locationSessionOwner = parsePositiveInteger(await secureStorage.getItemAsync(LOCATION_SESSION_OWNER_KEY));
  return locationSessionOwner;
};

export const setActiveReporteId = async (id: number | null): Promise<void> => {
  if (id === null) {
    await secureStorage.deleteItemAsync(ACTIVE_TRACKING_KEY);
    return;
  }

  const ownerCuadrillaId = fieldOperationQueue.getActiveOwner();
  if (ownerCuadrillaId === null) {
    throw new Error('No se puede iniciar seguimiento GPS sin una sesión activa de cuadrilla.');
  }
  await secureStorage.setItemAsync(ACTIVE_TRACKING_KEY, JSON.stringify({ reportId: id, ownerCuadrillaId }));
};

const getActiveTracking = async (): Promise<ActiveTracking | null> => {
  return parseActiveTracking(await secureStorage.getItemAsync(ACTIVE_TRACKING_KEY));
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

  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5 * 60 * 1000, // cada 5 minutos
    distanceInterval: 50, // o cada 50 metros
    foregroundService: {
      notificationTitle: 'ARJE Cuadrilla - Seguimiento activo',
      notificationBody: `Enviando ubicación para reporte #${idReporte}`,
      notificationColor: '#253C96',
    },
  });
};

export const stopLocationTracking = async (): Promise<void> => {
  if (Platform.OS !== 'web') {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  }
  await setActiveReporteId(null);
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
