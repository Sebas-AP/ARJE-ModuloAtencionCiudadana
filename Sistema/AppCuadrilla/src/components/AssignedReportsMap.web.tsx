import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { AssignedMapMarker } from '../services/mapaAsignadosModel';
import type { WebOwnLocation } from '../services/webMapModel';
import type { MaptilerConfig } from '../services/maptilerConfig';

export interface MapFocusRequest {
  latitud: number;
  longitud: number;
  requestId: number;
}

interface AssignedReportsMapProps {
  markers: AssignedMapMarker[];
  selectedId: number | null;
  ownLocation: WebOwnLocation | null;
  config: MaptilerConfig | null;
  focusRequest?: MapFocusRequest;
  onSelectReporte: (id: number) => void;
  height?: number;
}

function createReportIcon(estatus: number, selected: boolean) {
  const color = estatus === 4 ? '#22C55E' : estatus === 3 ? '#F97316' : '#3B82F6';
  const size = selected ? 34 : 26;
  const html = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" width="${size}" height="${size}">
      <circle cx="17" cy="17" r="13" fill="${color}" stroke="#FFFFFF" stroke-width="${selected ? 4 : 3}"/>
      <circle cx="17" cy="17" r="4" fill="#FFFFFF"/>
    </svg>
  `;
  return L.divIcon({
    html,
    className: 'arje-report-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const ownIcon = L.divIcon({
  html: '<div style="width:22px;height:22px;border-radius:11px;background:#253C96;border:3px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.35);box-sizing:border-box"></div>',
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FocusMap({ request }: { request?: MapFocusRequest }) {
  const map = useMap();
  useEffect(() => {
    if (!request) return;
    map.flyTo([request.latitud, request.longitud], Math.max(map.getZoom(), 15), { animate: true });
  }, [request, map]);
  return null;
}

export function AssignedReportsMap({
  markers,
  selectedId,
  ownLocation,
  config,
  focusRequest,
  onSelectReporte,
  height = 420,
}: AssignedReportsMapProps) {
  const [tileError, setTileError] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const selectedMarker = markers.find((marker) => marker.id === selectedId) ?? markers[0];
  const initialCenter = useMemo<[number, number]>(() => {
    if (selectedMarker) return [selectedMarker.latitud, selectedMarker.longitud];
    if (ownLocation) return [ownLocation.latitude, ownLocation.longitude];
    return [23.6345, -102.5528];
  }, [selectedMarker, ownLocation]);
  const initialZoom = selectedMarker || ownLocation ? 14 : 5;

  if (!config) {
    return (
      <View style={[styles.unavailable, { height }]}>
        <Text style={styles.unavailableTitle}>Mapa web no disponible</Text>
        <Text style={styles.unavailableText}>
          Falta EXPO_PUBLIC_MAPTILER_WEB_API_KEY. Los reportes siguen disponibles en la lista.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#CBD5E1' }}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <FocusMap request={focusRequest} />
        <TileLayer
          key={tileAttempt}
          url={config.tileUrl}
          attribution={config.attribution}
          tileSize={config.tileSize}
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />

        {markers.map((marker) => (
          <Marker
            key={`reporte-${marker.id}`}
            position={[marker.latitud, marker.longitud]}
            icon={createReportIcon(marker.estatus, marker.id === selectedId)}
            eventHandlers={{ click: () => onSelectReporte(marker.id) }}
          >
            <Popup>REP-{marker.id}</Popup>
          </Marker>
        ))}

        {ownLocation ? (
          <Marker position={[ownLocation.latitude, ownLocation.longitude]} icon={ownIcon}>
            <Popup>Tu ubicación</Popup>
          </Marker>
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
    </View>
  );
}

const styles = StyleSheet.create({
  unavailable: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F5C26B',
    backgroundColor: '#FFF7E6',
  },
  unavailableTitle: { fontSize: 16, fontWeight: '700', color: '#92400E' },
  unavailableText: { fontSize: 13, lineHeight: 19, color: '#92400E', textAlign: 'center', maxWidth: 420 },
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
