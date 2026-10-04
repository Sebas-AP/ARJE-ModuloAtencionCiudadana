import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocation } from '../../hooks/useLocation';
import { authService } from '../../services/authService';
import { reportesService } from '../../services/reportesService';
import { ReporteDTO } from '../../types';

export default function MapaScreen() {
  const [mapReady, setMapReady] = useState(false);
  const [reporte, setReporte] = useState<ReporteDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  const { location, iniciarSeguimiento, tracking } = useLocation();

  const cargarDatos = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user?.idCuadrilla) {
        setError('No se encontró cuadrilla asignada');
        setLoading(false);
        return;
      }

      const reportes = await reportesService.getAsignados(user.idCuadrilla);
      if (reportes.length > 0) {
        const reporteActivo = reportes.find(r => r.estatus === 4 || r.estatus === 3) || reportes[0];
        setReporte(reporteActivo);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    
    // Obtener ubicación inicial
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      .then(loc => setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (location) {
      setUserLocation(location);
    }
  }, [location]);

  const region = reporte
    ? {
        latitude: reporte.latitud,
        longitude: reporte.longitud,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 21.8853,
        longitude: -102.2916,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };

  const handleMapReady = () => {
    setMapReady(true);
  };

  const centrarEnReporte = () => {
    if (reporte && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: reporte.latitud,
        longitude: reporte.longitud,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
  };

  const centrarEnUsuario = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#253C96" />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={cargarDatos}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onMapReady={handleMapReady}
        customMapStyle={mapStyle}
      >
        {/* Marcador del reporte */}
        {reporte && (
          <Marker
            coordinate={{ latitude: reporte.latitud, longitude: reporte.longitud }}
            title={reporte.categoria || 'Reporte'}
            description={reporte.direccion || ''}
            pinColor="#EF4444"
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerPin} />
            </View>
          </Marker>
        )}

        {/* Marcador de ubicación del usuario */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Tu ubicación"
            description={tracking ? 'Seguimiento activo' : 'Ubicación actual'}
            pinColor="#253C96"
          >
            <View style={styles.userMarkerContainer}>
              <View style={[
                styles.userMarkerPin,
                tracking && styles.userMarkerPinActive,
              ]} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Panel inferior con info */}
      <View style={styles.bottomPanel}>
        {reporte ? (
          <>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{reporte.categoria || 'Sin categoría'}</Text>
                <Text style={styles.infoValue}>{reporte.folio || `REP-${reporte.id}`}</Text>
              </View>
              <TouchableOpacity style={styles.centerButton} onPress={centrarEnReporte}>
                <Text style={styles.centerButtonText}>Centrar reporte</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Dirección</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{reporte.direccion || 'No disponible'}</Text>
              </View>
              <TouchableOpacity style={styles.centerButton} onPress={centrarEnUsuario}>
                <Text style={styles.centerButtonText}>Mi ubicación</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.noReporte}>
            <Text style={styles.noReporteText}>No hay reportes asignados</Text>
            <TouchableOpacity style={styles.centerButton} onPress={centrarEnUsuario}>
              <Text style={styles.centerButtonText}>Ver mi ubicación</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botón de seguimiento */}
        {reporte && (
          <TouchableOpacity
            style={[
              styles.trackingButton,
              tracking && styles.trackingButtonActive,
            ]}
            onPress={() => {
              if (tracking) {
                // El hook maneja el stop
              } else {
                iniciarSeguimiento();
              }
            }}
          >
            <Text style={[
              styles.trackingButtonText,
              tracking && styles.trackingButtonTextActive,
            ]}>
              {tracking ? '● Seguimiento ACTIVO' : '○ Activar seguimiento GPS'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const mapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#F5F5F5' }],
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#F5F5F5' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#BDBDBD' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#EEEEEE' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#E8E8E8' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9E9E9E' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#DADADA' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9E9E9E' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: '#E5E5E5' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#EEEEEE' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#C9C9C9' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9E9E9E' }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#253C96',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  map: {
    flex: 1,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#19244E',
  },
  centerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  centerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#253C96',
  },
  noReporte: {
    alignItems: 'center',
    gap: 12,
  },
  noReporteText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  trackingButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#F36B2E',
    alignItems: 'center',
  },
  trackingButtonActive: {
    backgroundColor: '#253C96',
    borderColor: '#253C96',
  },
  trackingButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F36B2E',
  },
  trackingButtonTextActive: {
    color: '#FFFFFF',
  },
  markerContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userMarkerContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#253C96',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userMarkerPinActive: {
    backgroundColor: '#22C55E',
    borderColor: '#FFFFFF',
  },
});