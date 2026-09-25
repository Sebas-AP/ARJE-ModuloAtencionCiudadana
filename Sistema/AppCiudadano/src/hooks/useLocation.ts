import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Coordenadas } from '../types';

interface LocationState {
  coordinates: Coordenadas | null;
  accuracy: number | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    coordinates: null,
    accuracy: null,
    isLoading: false,
    error: null,
    permissionStatus: null,
  });

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setState((prev) => ({ ...prev, permissionStatus: status }));
    return status === 'granted';
  }, []);

  const getCurrentLocation = useCallback(async (options?: Location.LocationOptions): Promise<Coordenadas | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const hasPermission = state.permissionStatus === 'granted' || await requestPermission();
    if (!hasPermission) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Permiso de ubicación denegado',
      }));
      return null;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        ...options,
      });

      const coords: Coordenadas = {
        latitud: location.coords.latitude,
        longitud: location.coords.longitude,
      };

      setState((prev) => ({
        ...prev,
        coordinates: coords,
        accuracy: location.coords.accuracy ?? null,
        isLoading: false,
      }));

      return coords;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener ubicación';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, [state.permissionStatus, requestPermission]);

  const watchLocation = useCallback(
    (callback: (coords: Coordenadas) => void, options?: Location.LocationOptions): Promise<Location.LocationSubscription> => {
      return Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
          ...options,
        },
        (location) => {
          callback({
            latitud: location.coords.latitude,
            longitud: location.coords.longitude,
          });
        }
      );
    },
    []
  );

  const reverseGeocode = useCallback(async (coords: Coordenadas): Promise<string | null> => {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: coords.latitud,
        longitude: coords.longitud,
      });
      if (results.length > 0) {
        const addr = results[0];
        return [
          addr.street,
          addr.streetNumber,
          addr.subregion,
          addr.region,
          addr.country,
        ].filter(Boolean).join(', ');
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      setState((prev) => ({ ...prev, permissionStatus: status }));
    });
  }, []);

  return {
    ...state,
    requestPermission,
    getCurrentLocation,
    watchLocation,
    reverseGeocode,
    reset: () => setState({
      coordinates: null,
      accuracy: null,
      isLoading: false,
      error: null,
      permissionStatus: state.permissionStatus,
    }),
  };
}