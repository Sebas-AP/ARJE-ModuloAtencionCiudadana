import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { fieldOperationQueue } from './fieldOperationsService';

export const LOCATION_TASK = 'background-location-task';
const ACTIVE_REPORTE_KEY = 'arje_active_reporte_id';

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    try {
      const idReporte = await getActiveReporteId();
      if (idReporte) {
        for (const location of locations) {
          await fieldOperationQueue.enqueue({
            kind: 'location',
            reportId: idReporte,
            latitud: location.coords.latitude,
            longitud: location.coords.longitude,
          });
        }
      }
    } catch (err) {
      console.error('Error storing location:', err);
    }
  }
});

export const setActiveReporteId = async (id: number | null): Promise<void> => {
  if (id === null) {
    await SecureStore.deleteItemAsync(ACTIVE_REPORTE_KEY);
    return;
  }

  await SecureStore.setItemAsync(ACTIVE_REPORTE_KEY, String(id));
};

const getActiveReporteId = async (): Promise<number | null> => {
  const value = await SecureStore.getItemAsync(ACTIVE_REPORTE_KEY);
  const idReporte = value ? Number(value) : NaN;
  return Number.isInteger(idReporte) && idReporte > 0 ? idReporte : null;
};

export const startLocationTracking = async (idReporte: number): Promise<void> => {
  await setActiveReporteId(idReporte);

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permiso de ubicación denegado');
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    throw new Error('Permiso de ubicación en segundo plano denegado');
  }

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
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  await setActiveReporteId(null);
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
