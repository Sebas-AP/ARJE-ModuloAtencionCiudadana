import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, type CameraRef, Map, Marker } from '@maplibre/maplibre-react-native';

import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../constants';
import type { ReporteLocationMapProps } from './ReporteLocationMap';
import { getNativeMaptilerConfig } from '../services/maptilerConfig';

const DEFAULT_CENTER: [number, number] = [-102.2916, 21.8853];

export default function ReporteLocationMap({
  coordinate,
  editable,
  onCoordinateChange,
}: ReporteLocationMapProps) {
  const height = 220;
  const cameraRef = useRef<CameraRef>(null);
  const [mapError, setMapError] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const config = useMemo(() => getNativeMaptilerConfig(), []);
  const initialCenter: [number, number] = coordinate
    ? [coordinate.longitud, coordinate.latitud]
    : DEFAULT_CENTER;

  useEffect(() => {
    if (!coordinate) return;
    try {
      cameraRef.current?.easeTo({
        center: [coordinate.longitud, coordinate.latitud],
        duration: 400,
      });
    } catch {
      // La cámara se centrará en el siguiente gesto.
    }
  }, [coordinate]);

  if (!config) {
    return (
      <View style={[styles.unavailable, { height }]}>
        <Text style={styles.unavailableTitle}>Mapa no disponible</Text>
        <Text style={styles.unavailableText}>Falta la clave MapTiler para mostrar la ubicación.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <Map
        key={mapAttempt}
        style={styles.map}
        mapStyle={config.styleUrl}
        attribution
        logo
        onDidFailLoadingMap={() => setMapError(true)}
        onDidFinishLoadingMap={() => setMapError(false)}
        onPress={editable && onCoordinateChange
          ? (event) => {
              const [longitud, latitud] = event.nativeEvent.lngLat;
              onCoordinateChange({ latitud, longitud });
            }
          : undefined}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: initialCenter, zoom: 15 }}
          minZoom={4}
          maxZoom={19}
        />

        {coordinate ? (
          <Marker
            id="ubicacion-reporte"
            lngLat={[coordinate.longitud, coordinate.latitud]}
            anchor="center"
          >
            <View style={styles.markerPin} />
          </Marker>
        ) : null}
      </Map>

      {mapError ? (
        <View style={styles.mapErrorOverlay}>
          <Text style={styles.mapErrorText}>No se pudo cargar el mapa.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setMapError(false);
              setMapAttempt((attempt) => attempt + 1);
            }}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {editable ? <Text style={styles.hint}>Toca el mapa para mover el pin</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceVariant,
  },
  map: {
    flex: 1,
  },
  markerPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.actionBlue,
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  hint: {
    position: 'absolute',
    left: SPACING.sm,
    bottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  unavailable: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.warning,
    backgroundColor: COLORS.surfaceVariant,
  },
  unavailableTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  unavailableText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  mapErrorOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(127, 29, 29, 0.94)',
  },
  mapErrorText: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
});
