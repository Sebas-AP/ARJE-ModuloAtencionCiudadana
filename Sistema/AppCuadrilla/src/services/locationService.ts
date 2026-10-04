import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { enviarUbicacion } from './api';

export const LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];

    try {
      const idReporte = await getActiveReporteId();
      if (idReporte) {
        await enviarUbicacion({
          idReporte,
          latitud: location.coords.latitude,
          longitud: location.coords.longitude,
        });
        console.log('Location sent:', location.coords.latitude, location.coords.longitude);
      }
    } catch (err) {
      console.error('Error sending location:', err);
    }
  }
});

let activeReporteId: number | null = null;

export const setActiveReporteId = (id: number | null) => {
  activeReporteId = id;
};

const getActiveReporteId = async (): Promise<number | null> => {
  return activeReporteId;
};

export const startLocationTracking = async (idReporte: number): Promise<void> => {
  activeReporteId = idReporte;

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
  activeReporteId = null;
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
): Location.LocationSubscription => {
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