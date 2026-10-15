import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert, TextInput, TouchableOpacity } from 'react-native';
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
import { APP_THEME } from '../../theme/appTheme';
import { filterReportes, type ReportStatusFilter } from '../../services/reportesListModel';

export default function ReportesScreen() {
  const router = useRouter();
  const [reportes, setReportes] = useState<ReporteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cuadrilla, setCuadrilla] = useState<CuadrillaDTO | null>(null);
  const [reportsConfirmed, setReportsConfirmed] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ReportStatusFilter>('all');
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
  const visibleReportes = filterReportes(reportes, query, status);

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
        data={visibleReportes}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<View>
          <Text style={styles.title}>Reportes</Text>
          <Text style={styles.searchTitle}>Buscar reportes</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Buscar por ID, tipo o sector ..." placeholderTextColor="#8FAFD9" style={styles.search} accessibilityLabel="Buscar reportes" />
          <View style={styles.filters}>{([['all', 'Todos'], ['pending', 'Pendientes'], ['inProgress', 'En proceso'], ['completed', 'Completados']] as const).map(([value, label]) => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: status === value }} onPress={() => setStatus(value)} style={[styles.filter, status === value && styles.filterActive]}><Text style={[styles.filterText, status === value && styles.filterTextActive]}>{label}</Text></TouchableOpacity>)}</View>
          {cuadrilla ? <View>
          <DisponibilidadSelector
            currentAvailability={cuadrilla.estatusDisponibilidad}
            activeReportCount={activeReportCount}
            disabled={savingAvailability || pendingAvailability || sync.isLoading || !!sync.error}
            onChange={cambiarDisponibilidad}
          />
          {pendingAvailability && <Text style={styles.pendingText}>Cambio de disponibilidad pendiente o rechazado. Sincroniza y revisa el resultado.</Text>}
          </View> : null}</View>}
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
            <Text style={styles.emptyTitle}>{reportes.length ? 'No se encontraron reportes' : 'Sin reportes asignados'}</Text>
            <Text style={styles.emptyText}>
              {reportes.length ? 'Prueba con otra búsqueda o filtro.' : 'Cuando se te asigne un reporte, aparecerá aquí automáticamente.'}
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
    backgroundColor: APP_THEME.colors.canvas,
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
  title: { color: APP_THEME.colors.royal, fontSize: 24, fontWeight: '800', marginBottom: 22 },
  searchTitle: { color: APP_THEME.colors.royal, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  search: { height: 38, borderWidth: 1, borderColor: '#9CA3AF', borderRadius: 9, backgroundColor: '#F5F6FB', paddingHorizontal: 14, color: APP_THEME.colors.ink, marginBottom: 14 },
  filters: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: APP_THEME.colors.border, paddingBottom: 14, marginBottom: 18 },
  filter: { borderWidth: 1, borderColor: APP_THEME.colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }, filterActive: { backgroundColor: '#015FEB' }, filterText: { fontSize: 12, color: '#015FEB' }, filterTextActive: { color: '#FFF' },
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
