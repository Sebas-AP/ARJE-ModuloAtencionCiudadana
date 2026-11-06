import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Camera, type CameraRef, Map, Marker } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';

import { useLocation } from '../hooks/useLocation';
import { authService } from '../services/authService';
import { reportesService } from '../services/reportesService';
import { ReporteDTO, EstatusReporteLabels } from '../types';
import { APP_THEME } from '../theme/appTheme';
import { isActiveAssignedStatus } from '../services/fieldApiContract';
import { getNativeMaptilerConfig } from '../services/maptilerConfig';
import { buildAssignedMapModel } from '../services/mapaAsignadosModel';

const DEFAULT_CENTER: [number, number] = [-102.5528, 23.6345];
const ATTRIBUTION_TEXT = '© MapTiler © OpenStreetMap contributors';

function parseReporteId(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function MapaScreen() {
  const { reporteId } = useLocalSearchParams<{ reporteId?: string }>();
  const [reportes, setReportes] = useState<ReporteDTO[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(parseReporteId(reporteId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [ownLocation, setOwnLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const cameraRef = useRef<CameraRef>(null);
  const lastCenteredId = useRef<number | null>(null);
  const centeredOnUser = useRef(false);
  const maptilerConfig = useMemo(() => getNativeMaptilerConfig(), []);
  const requestedReporteId = parseReporteId(reporteId);

  const assignedReportes = useMemo(
    () => reportes.filter((reporte) => isActiveAssignedStatus(reporte.estatus)),
    [reportes],
  );
  const activeTrackingReporte = useMemo(
    () => assignedReportes.find((reporte) => reporte.estatus === 4)
      ?? assignedReportes.find((reporte) => reporte.estatus === 3)
      ?? assignedReportes[0]
      ?? null,
    [assignedReportes],
  );
  const model = useMemo(
    () => buildAssignedMapModel(assignedReportes, selectedId),
    [assignedReportes, selectedId],
  );
  const selectedReporte = assignedReportes.find((reporte) => reporte.id === model.selectedId) ?? null;

  const {
    location,
    iniciarSeguimiento,
    detenerSeguimiento,
    tracking,
    canTrack,
    error: trackingError,
  } = useLocation(activeTrackingReporte?.id, activeTrackingReporte?.estatus);

  const cargarDatos = useCallback(async () => {
    try {
      setError(null);
      const cuadrilla = await authService.getCurrentCuadrilla();
      if (!cuadrilla) {
        setError('No se encontró cuadrilla asignada');
        return;
      }

      const asignados = await reportesService.getAsignados(cuadrilla.id);
      setReportes(asignados);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los reportes');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (requestedReporteId !== null) setSelectedId(requestedReporteId);
    void cargarDatos();
  }, [cargarDatos, requestedReporteId]));

  useEffect(() => {
    if (activeTrackingReporte) return;
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setOwnLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch {
        // Sin permiso o sin GPS: el mapa conserva su vista de respaldo.
      }
    })();
  }, [activeTrackingReporte]);

  const userLocation = location ?? ownLocation;

  const moveCamera = useCallback((latitude: number, longitude: number, zoom = 15) => {
    if (!cameraRef.current) return false;
    try {
      cameraRef.current.easeTo({ center: [longitude, latitude], zoom, duration: 600 });
      return true;
    } catch {
      // La cámara aún no está lista; se reintentará cuando mapReady cambie.
      return false;
    }
  }, []);

  useEffect(() => {
    if (!selectedReporte || !mapReady || lastCenteredId.current === selectedReporte.id) return;
    if (moveCamera(selectedReporte.latitud, selectedReporte.longitud)) {
      lastCenteredId.current = selectedReporte.id;
    }
  }, [selectedReporte, mapReady, moveCamera]);

  useEffect(() => {
    if (selectedReporte || centeredOnUser.current || !userLocation || !mapReady) return;
    if (moveCamera(userLocation.latitude, userLocation.longitude)) {
      centeredOnUser.current = true;
    }
  }, [selectedReporte, userLocation, mapReady, moveCamera]);

  const centrarEnReporte = () => {
    if (selectedReporte) moveCamera(selectedReporte.latitud, selectedReporte.longitud);
  };

  const centrarEnUsuario = () => {
    if (userLocation) moveCamera(userLocation.latitude, userLocation.longitude);
  };

  const hasInitialTarget = Boolean(selectedReporte || userLocation);
  const initialCenter: [number, number] = selectedReporte
    ? [selectedReporte.longitud, selectedReporte.latitud]
    : userLocation
      ? [userLocation.longitude, userLocation.latitude]
      : DEFAULT_CENTER;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={APP_THEME.colors.primary} />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { void cargarDatos(); }}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {maptilerConfig ? (
        <Map
          key={mapAttempt}
          style={styles.map}
          mapStyle={maptilerConfig.styleUrl}
          attribution
          logo
          compass
          onDidFailLoadingMap={() => setMapError(true)}
          onDidFinishLoadingMap={() => { setMapError(false); setMapReady(true); }}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{ center: initialCenter, zoom: hasInitialTarget ? 14 : 5 }}
            minZoom={4}
            maxZoom={19}
          />

          {model.markers.map((marker) => {
            const reporte = assignedReportes.find((item) => item.id === marker.id);
            const isSelected = marker.id === model.selectedId;
            const isTracking = marker.id === activeTrackingReporte?.id && tracking;
            return (
              <Marker
                key={`reporte-${marker.id}`}
                id={`reporte-${marker.id}`}
                lngLat={[marker.longitud, marker.latitud]}
                anchor="bottom"
                onPress={() => setSelectedId(marker.id)}
              >
                <View style={styles.markerContainer}>
                  <View style={[
                    styles.markerPin,
                    isTracking && styles.markerPinTracking,
                    isSelected && styles.markerPinSelected,
                  ]} />
                  {reporte ? (
                    <Text style={[styles.markerLabel, isSelected && styles.markerLabelSelected]} numberOfLines={1}>
                      {reporte.folio || `REP-${reporte.id}`}
                    </Text>
                  ) : null}
                </View>
              </Marker>
            );
          })}

          {userLocation ? (
            <Marker
              id="mi-ubicacion"
              lngLat={[userLocation.longitude, userLocation.latitude]}
              anchor="center"
            >
              <View style={styles.userMarkerContainer}>
                <View style={[styles.userMarkerPin, tracking && styles.userMarkerPinActive]} />
              </View>
            </Marker>
          ) : null}
        </Map>
      ) : (
        <View style={styles.mapUnavailable}>
          <Text style={styles.errorText}>⚠ Mapa no disponible: falta la clave MapTiler.</Text>
        </View>
      )}

      {mapError ? (
        <View style={styles.mapErrorOverlay}>
          <Text style={styles.mapErrorText}>No se pudo cargar el mapa.</Text>
          <TouchableOpacity
            style={styles.mapRetryButton}
            onPress={() => {
              setMapError(false);
              setMapAttempt((attempt) => attempt + 1);
            }}
          >
            <Text style={styles.mapRetryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.attribution}>{ATTRIBUTION_TEXT}</Text>

      <View style={styles.bottomPanel}>
        {selectedReporte ? (
          <>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{selectedReporte.categoria || 'Sin categoría'}</Text>
                <Text style={styles.infoValue}>{selectedReporte.folio || `REP-${selectedReporte.id}`}</Text>
                <Text style={styles.infoLabel}>{EstatusReporteLabels[selectedReporte.estatus]}</Text>
              </View>
              <TouchableOpacity style={styles.centerButton} onPress={centrarEnReporte}>
                <Text style={styles.centerButtonText}>Centrar reporte</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Dirección</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {selectedReporte.direccion || 'No disponible'}
                </Text>
              </View>
              <TouchableOpacity style={styles.centerButton} onPress={centrarEnUsuario} disabled={!userLocation}>
                <Text style={styles.centerButtonText}>Mi ubicación</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.reportCount}>
              {assignedReportes.length} reporte{assignedReportes.length === 1 ? '' : 's'} asignado
              {assignedReportes.length === 1 ? '' : 's'} · toca un marcador para cambiar
            </Text>
          </>
        ) : (
          <View style={styles.noReporte}>
            <Text style={styles.noReporteText}>No hay reportes asignados</Text>
            <TouchableOpacity style={styles.centerButton} onPress={centrarEnUsuario} disabled={!userLocation}>
              <Text style={styles.centerButtonText}>Ver mi ubicación</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTrackingReporte ? (
          <TouchableOpacity
            style={[styles.trackingButton, tracking && styles.trackingButtonActive]}
            onPress={() => {
              if (tracking) {
                void detenerSeguimiento();
              } else {
                void iniciarSeguimiento();
              }
            }}
            disabled={!canTrack}
          >
            <Text style={[styles.trackingButtonText, tracking && styles.trackingButtonTextActive]}>
              {tracking
                ? '● Seguimiento ACTIVO'
                : `○ Activar seguimiento GPS · ${activeTrackingReporte.folio || `REP-${activeTrackingReporte.id}`}`}
            </Text>
          </TouchableOpacity>
        ) : null}
        {trackingError ? <Text style={styles.errorText}>{trackingError}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_THEME.colors.canvas },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: '#64748B' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center' },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#253C96', borderRadius: 8 },
  retryButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  map: { flex: 1 },
  mapUnavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mapErrorOverlay: {
    position: 'absolute', top: 20, left: 20, right: 20, zIndex: 20,
    backgroundColor: 'rgba(127,29,29,0.94)', borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  mapErrorText: { color: '#FFFFFF', fontSize: 13, flex: 1 },
  mapRetryButton: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  mapRetryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  attribution: {
    position: 'absolute', left: 8, bottom: 230, zIndex: 10,
    fontSize: 10, color: '#475569', backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 30, shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12,
    elevation: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  infoItem: { flex: 1 },
  infoLabel: {
    fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 2,
  },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#19244E' },
  centerButton: {
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#EFF6FF', borderRadius: 8,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  centerButtonText: { fontSize: 13, fontWeight: '600', color: '#253C96' },
  reportCount: { fontSize: 12, color: '#64748B', marginBottom: 10 },
  noReporte: { alignItems: 'center', gap: 12 },
  noReporteText: { fontSize: 15, color: '#64748B', fontWeight: '500' },
  trackingButton: {
    marginTop: 8, paddingVertical: 14, borderRadius: 10, backgroundColor: '#FFF7ED',
    borderWidth: 2, borderColor: '#F36B2E', alignItems: 'center',
  },
  trackingButtonActive: { backgroundColor: '#253C96', borderColor: '#253C96' },
  trackingButtonText: { fontSize: 15, fontWeight: '700', color: '#F36B2E' },
  trackingButtonTextActive: { color: '#FFFFFF' },
  markerContainer: { alignItems: 'center', maxWidth: 128 },
  markerPin: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#EF4444',
    borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  markerPinTracking: { backgroundColor: '#22C55E' },
  markerPinSelected: { width: 30, height: 30, borderRadius: 15, borderWidth: 4 },
  markerLabel: {
    marginTop: 3, fontSize: 10, fontWeight: '700', color: '#19244E',
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  markerLabelSelected: { color: '#253C96', fontSize: 11 },
  userMarkerContainer: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  userMarkerPin: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#253C96',
    borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  userMarkerPinActive: { backgroundColor: '#22C55E', borderColor: '#FFFFFF' },
});
