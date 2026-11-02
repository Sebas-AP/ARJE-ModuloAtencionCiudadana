import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { authService } from '../services/authService';
import { reportesService } from '../services/reportesService';
import { EstatusReporteLabels, type ReporteDTO } from '../types';
import { APP_THEME } from '../theme/appTheme';
import { getWebMaptilerConfig } from '../services/maptilerConfig';
import { buildWebMapModel, type WebOwnLocation } from '../services/webMapModel';
import { AssignedReportsMap, type MapFocusRequest } from './AssignedReportsMap.web';

function parseReporteId(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function MapaWebScreen() {
  const { reporteId } = useLocalSearchParams<{ reporteId?: string }>();
  const requestedReporteId = parseReporteId(reporteId);
  const [reportes, setReportes] = useState<ReporteDTO[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(requestedReporteId);
  const [ownLocation, setOwnLocation] = useState<WebOwnLocation | null>(null);
  const [focusRequest, setFocusRequest] = useState<MapFocusRequest | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const focusRequestId = useRef(0);
  const mounted = useRef(true);
  const config = useMemo(() => getWebMaptilerConfig(), []);

  const requestFocus = useCallback((latitud: number, longitud: number) => {
    focusRequestId.current += 1;
    setFocusRequest({ latitud, longitud, requestId: focusRequestId.current });
  }, []);

  const cargarDatos = useCallback(async (requestedId: number | null) => {
    try {
      setError(null);
      const cuadrilla = await authService.getCurrentCuadrilla();
      if (!cuadrilla) {
        setError('No se encontró cuadrilla asignada');
        return;
      }

      const asignados = await reportesService.getAsignados(cuadrilla.id);
      if (!mounted.current) return;
      setReportes(asignados);

      if (requestedId !== null) {
        setSelectedId(requestedId);
        const reporteSolicitado = asignados.find((reporte) => reporte.id === requestedId);
        if (reporteSolicitado) requestFocus(reporteSolicitado.latitud, reporteSolicitado.longitud);
      }
    } catch (cause) {
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los reportes');
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [requestFocus]);

  useFocusEffect(useCallback(() => {
    void cargarDatos(requestedReporteId);
  }, [cargarDatos, requestedReporteId]));

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const model = useMemo(
    () => buildWebMapModel(reportes, selectedId, ownLocation),
    [reportes, selectedId, ownLocation],
  );
  const selectedReporte = reportes.find((reporte) => reporte.id === model.selectedId) ?? null;

  const solicitarUbicacion = useCallback((silencioso = false) => {
    const browserNavigator = (globalThis as {
      navigator?: {
        geolocation?: {
          getCurrentPosition: (
            success: (position: { coords: { latitude: number; longitude: number } }) => void,
            failure: (cause: { code: number; PERMISSION_DENIED?: number }) => void,
            options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number },
          ) => void;
        };
      };
    }).navigator;
    if (!browserNavigator?.geolocation) {
      if (!silencioso) setGeoError('Este navegador no permite obtener la ubicación.');
      return;
    }
    if (!silencioso) {
      setLocating(true);
      setGeoError(null);
    }
    browserNavigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mounted.current) return;
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setOwnLocation(next);
        requestFocus(next.latitude, next.longitude);
        setLocating(false);
        setGeoError(null);
      },
      (cause) => {
        if (!mounted.current) return;
        setLocating(false);
        if (!silencioso) {
          setGeoError(cause.code === cause.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Puedes seguir usando el mapa de reportes.'
            : 'No se pudo obtener tu ubicación.');
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }, [requestFocus]);

  useEffect(() => {
    if (requestedReporteId !== null) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) solicitarUbicacion(true);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [requestedReporteId, solicitarUbicacion]);

  const locate = () => solicitarUbicacion(false);

  const centrarSeleccionado = () => {
    if (selectedReporte) requestFocus(selectedReporte.latitud, selectedReporte.longitud);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#253C96" />
        <Text style={styles.muted}>Cargando ubicación de reportes…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>⚠ {error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => { setLoading(true); void cargarDatos(requestedReporteId); }}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reportes asignados</Text>
        <Text style={styles.muted}>
          {model.markers.length} marcador{model.markers.length === 1 ? '' : 'es'} · toca uno para seleccionarlo
        </Text>
      </View>

      <AssignedReportsMap
        markers={model.markers}
        selectedId={model.selectedId}
        ownLocation={model.ownLocation}
        config={config}
        focusRequest={focusRequest}
        onSelectReporte={setSelectedId}
        height={420}
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, !selectedReporte && styles.buttonDisabled]}
          onPress={centrarSeleccionado}
          disabled={!selectedReporte}
        >
          <Text style={styles.buttonText}>Centrar seleccionado</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={locate} disabled={locating}>
          <Text style={styles.secondaryButtonText}>{locating ? 'Ubicando…' : 'Mi ubicación'}</Text>
        </TouchableOpacity>
      </View>

      {geoError ? <Text style={styles.notice}>{geoError}</Text> : null}
      <Text style={styles.notice}>
        El seguimiento GPS en segundo plano sólo está disponible desde la app móvil.
      </Text>

      {selectedReporte ? (
        <View style={styles.card}>
          <Text style={styles.category}>{selectedReporte.categoria || 'Sin categoría'}</Text>
          <Text style={styles.folio}>{selectedReporte.folio || `REP-${selectedReporte.id}`}</Text>
          <Text style={styles.detail}>{EstatusReporteLabels[selectedReporte.estatus]}</Text>
          <Text style={styles.detail}>{selectedReporte.direccion || 'Dirección no disponible'}</Text>
          <Text style={styles.coordinates}>
            {selectedReporte.latitud.toFixed(6)}, {selectedReporte.longitud.toFixed(6)}
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.detail}>No hay reportes operativos asignados.</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => { setLoading(true); void cargarDatos(requestedReporteId); }}
      >
        <Text style={styles.secondaryButtonText}>Actualizar información</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14, backgroundColor: APP_THEME.colors.canvas, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: APP_THEME.colors.canvas },
  header: { gap: 4 },
  title: { fontSize: 24, fontWeight: '700', color: APP_THEME.colors.royal },
  muted: { color: '#475569', lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8, backgroundColor: APP_THEME.colors.primary },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  secondaryButtonText: { color: '#253C96', fontWeight: '700' },
  notice: { color: '#64748B', fontSize: 12.5, lineHeight: 18 },
  card: {
    gap: 6,
    padding: 18,
    borderRadius: APP_THEME.radius.card,
    backgroundColor: APP_THEME.colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  category: { color: '#253C96', fontSize: 13, fontWeight: '600' },
  folio: { color: '#0F172A', fontSize: 20, fontWeight: '700' },
  detail: { color: '#334155', lineHeight: 20 },
  coordinates: { color: '#64748B', fontFamily: 'monospace' },
  error: { color: '#B91C1C', textAlign: 'center' },
});
