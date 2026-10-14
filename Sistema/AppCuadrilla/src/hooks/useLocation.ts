import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { watchLocation, getCurrentLocation, startLocationTracking, stopLocationTracking } from '../services/locationService';

export const useLocation = (idReporte?: number, estatusReporte?: number) => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const canTrack = estatusReporte === 3 || estatusReporte === 4;

  const requestPermissions = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permiso de ubicación denegado');
      return false;
    }
    return true;
  }, []);

  const obtenerUbicacionActual = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setLocation(loc);
        setError(null);
      }
    } catch {
      setError('No se pudo obtener la ubicación');
    }
  }, [requestPermissions]);

  const iniciarSeguimiento = useCallback(async () => {
    if (!idReporte) {
      setError('No hay reporte activo para seguimiento');
      return;
    }
    if (!canTrack) {
      setError('El seguimiento GPS sólo está disponible mientras el reporte está en levantamiento o en proceso.');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const bgStatus = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus.status !== 'granted') {
      setError('Se requiere permiso de ubicación en segundo plano para seguimiento continuo');
      return;
    }

    try {
      await startLocationTracking(idReporte);
      setTracking(true);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [idReporte, canTrack, requestPermissions]);

  const detenerSeguimiento = useCallback(async () => {
    await stopLocationTracking();
    setTracking(false);
  }, []);

  useEffect(() => {
    if (!idReporte) return;

    obtenerUbicacionActual();

    let subscription: Location.LocationSubscription | null = null;
    void watchLocation((loc) => {
      setLocation(loc);
    }).then((activeSubscription) => {
      subscription = activeSubscription;
    });

    return () => {
      subscription?.remove();
    };
  }, [idReporte, obtenerUbicacionActual]);

  useEffect(() => {
    if (tracking && !canTrack) {
      void detenerSeguimiento();
    }
  }, [tracking, canTrack, detenerSeguimiento]);

  return {
    location,
    error,
    tracking,
    canTrack,
    obtenerUbicacionActual,
    iniciarSeguimiento,
    detenerSeguimiento,
  };
};

export const useCurrentLocation = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setLocation(loc);
      } else {
        setError('No se pudo obtener la ubicación');
      }
    } catch {
      setError('Error al obtener ubicación');
    } finally {
      setLoading(false);
    }
  }, []);

  return { location, loading, error, getLocation };
};
