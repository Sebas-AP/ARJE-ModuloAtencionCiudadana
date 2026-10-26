import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { ReporteLocationMapProps } from './ReporteLocationMap';
import { getWebMaptilerConfig } from '../services/maptilerConfig';

const DEFAULT_CENTER: [number, number] = [21.8853, -102.2916];

const markerIcon = L.divIcon({
  html: '<div style="width:26px;height:26px;border-radius:13px;background:#017EF3;border:4px solid #FFFFFF;box-shadow:0 3px 8px rgba(0,0,0,0.35);box-sizing:border-box"></div>',
  className: 'arje-report-location-marker',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function MapInteraction({
  editable,
  onCoordinateChange,
}: {
  editable: boolean;
  onCoordinateChange?: (coordinate: { latitud: number; longitud: number }) => void;
}) {
  useMapEvents({
    click: (event) => {
      if (!editable || !onCoordinateChange) return;
      onCoordinateChange({ latitud: event.latlng.lat, longitud: event.latlng.lng });
    },
  });
  return null;
}

function FocusCoordinate({ latitud, longitud }: { latitud: number; longitud: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([latitud, longitud], Math.max(map.getZoom(), 15), { animate: true, duration: 0.4 });
  }, [latitud, longitud, map]);
  return null;
}

export default function ReporteLocationMap({
  coordinate,
  editable,
  onCoordinateChange,
}: ReporteLocationMapProps) {
  const height = 220;
  const [tileError, setTileError] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const config = useMemo(() => getWebMaptilerConfig(), []);
  const initialCenter: [number, number] = coordinate
    ? [coordinate.latitud, coordinate.longitud]
    : DEFAULT_CENTER;

  if (!config) {
    return (
      <View style={[styles.unavailable, { height }]}>
        <Text style={styles.unavailableTitle}>Mapa web no disponible</Text>
        <Text style={styles.unavailableText}>Falta EXPO_PUBLIC_MAPTILER_WEB_API_KEY para mostrar la ubicación.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapContainer
        center={initialCenter}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <MapInteraction editable={editable} onCoordinateChange={onCoordinateChange} />
        {coordinate ? <FocusCoordinate latitud={coordinate.latitud} longitud={coordinate.longitud} /> : null}
        <TileLayer
          key={tileAttempt}
          url={config.tileUrl}
          attribution={config.attribution}
          tileSize={config.tileSize}
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />

        {coordinate ? (
          <Marker
            position={[coordinate.latitud, coordinate.longitud]}
            icon={markerIcon}
            draggable={editable}
            eventHandlers={{
              dragend: (event) => {
                if (!editable || !onCoordinateChange) return;
                const position = (event.target as L.Marker).getLatLng();
                onCoordinateChange({ latitud: position.lat, longitud: position.lng });
              },
            }}
          />
        ) : null}
      </MapContainer>

      {tileError ? (
        <View style={styles.tileError}>
          <Text style={styles.tileErrorText}>No se pudieron cargar los mapas.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setTileError(false);
              setTileAttempt((attempt) => attempt + 1);
            }}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {editable ? <Text style={styles.hint}>Toca el mapa o arrastra el pin para ajustar la ubicación</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#E2E8F0',
  },
  unavailable: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5C26B',
    backgroundColor: '#FFF7E6',
  },
  unavailableTitle: { fontSize: 16, fontWeight: '700', color: '#92400E' },
  unavailableText: { fontSize: 13, lineHeight: 19, color: '#92400E', textAlign: 'center', maxWidth: 420 },
  hint: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    zIndex: 500,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  tileError: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(127,29,29,0.94)',
  },
  tileErrorText: { color: '#FFFFFF', fontSize: 12, flex: 1 },
  retryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
