import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { authService } from '../../services/authService';
import { reportesService } from '../../services/reportesService';
import { ReporteCard } from '../../components/ReporteCard';
import { DisponibilidadSelector } from '../../components/DisponibilidadSelector';
import { useFieldSync } from '../../hooks/useFieldSync';
import { getCuadrillaActual } from '../../services/api';
import { queueAvailability } from '../../services/fieldOperationsService';
import { canSelectAvailable, getOperationFeedback, operationFeedbackMessages, type Availability } from '../../services/fieldUiPolicy';
import { ReporteDTO, CuadrillaDTO } from '../../types';

export default function ReportesScreen() {
  const router = useRouter();
  const [reportes, setReportes] = useState<ReporteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cuadrilla, setCuadrilla] = useState<CuadrillaDTO | null>(null);
  const [reportsConfirmed, setReportsConfirmed] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const sync = useFieldSync();

  const cargarReportes = useCallback(async () => {
    try {
      const session = await authService.getCurrentCuadrilla();
      if (!session) {
        setReportsConfirmed(false);
        Alert.alert('Error', 'No se encontró la cuadrilla asignada');
        return;
      }

      const [current, data] = await Promise.all([getCuadrillaActual(), reportesService.getAsignados(session.id)]);
      setCuadrilla(current);
      setReportes(data);
      setReportsConfirmed(true);
    } catch (error: unknown) {
      setReportsConfirmed(false);
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudieron cargar los reportes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void cargarReportes(); }, [cargarReportes]));
  useEffect(() => {
    const interval = setInterval(cargarReportes, 30_000);
    return () => clearInterval(interval);
  }, [cargarReportes]);

  const pendingAvailability = sync.operations.some((operation) => operation.kind === 'availability');
  const activeReportCount = reportsConfirmed && sync.isOnline
    ? Math.max(reportes.length, cuadrilla?.reportesActivosCount ?? 0,
      sync.operations.some((operation) => operation.kind === 'status') ? 1 : 0)
    : null;

  const cambiarDisponibilidad = async (availability: Availability) => {
    if (!cuadrilla || savingAvailability || pendingAvailability || sync.isLoading || sync.error
      || (availability === 1 && !canSelectAvailable(activeReportCount))) return;
    setSavingAvailability(true);
    try {
      const result = await queueAvailability(availability);
      await sync.refresh();
      if (getOperationFeedback(result) === 'synced') await cargarReportes();
      Alert.alert('Disponibilidad', operationFeedbackMessages[getOperationFeedback(result)]);
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo guardar la disponibilidad');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    cargarReportes();
  };

  const renderItem = ({ item }: { item: ReporteDTO }) => (
    <View>
      <ReporteCard reporte={item} onPress={() => router.push(`/reporte/${item.id}`)} />
      {sync.operations.some((operation) => 'reportId' in operation && operation.reportId === item.id)
        && <Text style={styles.pendingText}>Este reporte tiene operaciones pendientes de sincronización.</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#253C96" />
        <Text style={styles.loadingText}>Cargando reportes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reportes}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={cuadrilla ? <View>
          <DisponibilidadSelector
            currentAvailability={cuadrilla.estatusDisponibilidad}
            activeReportCount={activeReportCount}
            disabled={savingAvailability || pendingAvailability || sync.isLoading || !!sync.error}
            onChange={cambiarDisponibilidad}
          />
          {pendingAvailability && <Text style={styles.pendingText}>Cambio de disponibilidad pendiente o rechazado. Sincroniza y revisa el resultado.</Text>}
        </View> : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#253C96']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin reportes asignados</Text>
            <Text style={styles.emptyText}>
              Cuando se te asigne un reporte, aparecerá aquí automáticamente.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pendingText: { color: '#9A3412', fontSize: 12, marginBottom: 12 },
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#19244E',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
});
