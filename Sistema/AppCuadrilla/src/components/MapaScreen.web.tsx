import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { authService } from '../services/authService';
import { reportesService } from '../services/reportesService';
import { EstatusReporteLabels, type ReporteDTO } from '../types';

export default function MapaWebScreen() {
  const [reporte, setReporte] = useState<ReporteDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const cuadrilla = await authService.getCurrentCuadrilla();
      if (!cuadrilla) {
        setError('No se encontró cuadrilla asignada');
        return;
      }

      const reportes = await reportesService.getAsignados(cuadrilla.id);
      setReporte(reportes.find((item) => item.estatus === 3 || item.estatus === 4) ?? reportes[0] ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los reportes');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void cargarDatos(); }, [cargarDatos]));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#253C96" />
        <Text style={styles.muted}>Cargando ubicación del reporte…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>⚠ {error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => { void cargarDatos(); }}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ubicación de intervención</Text>
      <Text style={styles.muted}>El mapa interactivo está disponible en la aplicación móvil.</Text>

      {reporte ? (
        <View style={styles.card}>
          <Text style={styles.category}>{reporte.categoria || 'Sin categoría'}</Text>
          <Text style={styles.folio}>{reporte.folio || `REP-${reporte.id}`}</Text>
          <Text style={styles.detail}>{EstatusReporteLabels[reporte.estatus]}</Text>
          <Text style={styles.detail}>{reporte.direccion || 'Dirección no disponible'}</Text>
          <Text style={styles.coordinates}>Latitud: {reporte.latitud.toFixed(6)}</Text>
          <Text style={styles.coordinates}>Longitud: {reporte.longitud.toFixed(6)}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.detail}>No hay reportes asignados.</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={() => { void cargarDatos(); }}>
        <Text style={styles.buttonText}>Actualizar información</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#253C96' },
  muted: { color: '#475569', lineHeight: 20 },
  card: { gap: 8, padding: 20, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  category: { color: '#253C96', fontSize: 14, fontWeight: '600' },
  folio: { color: '#0F172A', fontSize: 20, fontWeight: '700' },
  detail: { color: '#334155', lineHeight: 20 },
  coordinates: { color: '#64748B', fontFamily: 'monospace' },
  button: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: '#253C96' },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
  error: { color: '#B91C1C', textAlign: 'center' },
});
