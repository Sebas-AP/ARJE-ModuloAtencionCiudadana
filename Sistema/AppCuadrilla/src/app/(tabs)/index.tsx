import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert, TextInput, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { filterReportes, type ReportStatusFilter } from '../../services/reportesListModel';
import { fitArtboard } from '../../theme/figmaArtboard';
import { isActiveAssignedStatus } from '../../services/fieldApiContract';

const filters: { value: ReportStatusFilter; label: string; width: number }[] = [
  { value: 'all', label: 'Todos', width: 61 },
  { value: 'inProgress', label: 'En proceso', width: 88 },
  { value: 'pending', label: 'Pendiente', width: 76 },
  { value: 'completed', label: 'Completado', width: 87 },
];

export default function ReportesScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const scale = fitArtboard(width, height);
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
    ? Math.max(reportes.filter((report) => isActiveAssignedStatus(report.estatus)).length,
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

  const visibleReportes = filterReportes(reportes, query, status);

  const renderItem = ({ item, index }: { item: ReporteDTO; index: number }) => (
    <View style={{ marginLeft: index === 0 ? 8 : 0, marginBottom: index === 0 ? 20 : 27 }}>
      <ReporteCard reporte={item} onPress={() => router.push(`/reporte/${item.id}`)} />
      {sync.operations.some((operation) => 'reportId' in operation && operation.reportId === item.id)
        && <Text style={styles.pendingText}>Sincronización pendiente para este reporte.</Text>}
    </View>
  );

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#253C96" /><Text style={styles.loadingText}>Cargando reportes...</Text></View>;
  }

  return (
    <View style={styles.stage}>
      <View style={[styles.artboard, { transform: [{ scale }] }]}>
        <Text style={styles.title}>Reportes</Text>
        <Text style={styles.searchTitle}>Buscar reportes</Text>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={20} color="#8FAFD9" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Buscar por ID, tipo o sector ..." placeholderTextColor="#8FAFD9" style={styles.searchInput} accessibilityLabel="Buscar reportes" />
        </View>
        <Text style={styles.statusLabel}>Estado:</Text>
        <View style={styles.filters}>
          {filters.map(({ value, label, width: chipWidth }) => (
            <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: status === value }} onPress={() => setStatus(value)} style={[styles.filter, { width: chipWidth }, status === value && styles.filterActive]}>
              <Text style={[styles.filterText, status === value && styles.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.divider} />
        <FlatList
          style={styles.reportList}
          data={visibleReportes}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.reportListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargarReportes(); }} colors={['#253C96']} />}
          ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyTitle}>{reportes.length ? 'No se encontraron reportes' : 'Sin reportes asignados'}</Text><Text style={styles.emptyText}>{reportes.length ? 'Prueba con otra búsqueda o filtro.' : 'Cuando se te asigne un reporte, aparecerá aquí automáticamente.'}</Text></View>}
          ListFooterComponent={cuadrilla ? <View style={styles.availabilityFooter}><DisponibilidadSelector currentAvailability={cuadrilla.estatusDisponibilidad} activeReportCount={activeReportCount} disabled={savingAvailability || pendingAvailability || sync.isLoading || !!sync.error} onChange={cambiarDisponibilidad} />{pendingAvailability && <Text style={styles.pendingText}>Disponibilidad pendiente o rechazada. Sincroniza para revisar el resultado.</Text>}</View> : null}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#F7F9FC', alignItems: 'center', justifyContent: 'center' },
  artboard: { width: 412, height: 917, backgroundColor: '#F7F9FC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#F7F9FC' },
  loadingText: { fontSize: 16, color: '#64748B', fontFamily: 'InriaSans_400Regular' },
  title: { position: 'absolute', left: 24, top: 72, height: 29, fontFamily: 'InriaSans_700Bold', fontSize: 24, lineHeight: 29, color: '#253C96' },
  searchTitle: { position: 'absolute', left: 24, top: 108, height: 19, fontFamily: 'InriaSans_700Bold', fontSize: 16, lineHeight: 19, color: '#253C96' },
  search: { position: 'absolute', left: 24, top: 140, width: 361, height: 33, flexDirection: 'row', alignItems: 'center', gap: 13, paddingLeft: 10, paddingRight: 8, borderWidth: 1, borderColor: '#9CA3AF', borderRadius: 9, backgroundColor: '#F5F6FB' },
  searchInput: { flex: 1, height: 32, paddingVertical: 0, paddingHorizontal: 0, fontFamily: 'InriaSans_300Light', fontSize: 16, lineHeight: 19, color: '#1D2F40' },
  statusLabel: { position: 'absolute', left: 26, top: 183, fontFamily: 'InriaSans_700Bold', fontSize: 16, lineHeight: 19, color: '#1D2F40' },
  filters: { position: 'absolute', left: 27, top: 208, width: 338, height: 20, flexDirection: 'row', gap: 8 },
  filter: { height: 20, borderWidth: 1, borderColor: '#0184FF', borderRadius: 8, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', paddingBottom: 1 },
  filterActive: { backgroundColor: '#015FEB', borderColor: '#015FEB' },
  filterText: { fontFamily: 'InriaSans_400Regular', fontSize: 16, lineHeight: 19, color: '#015FEB' },
  filterTextActive: { color: '#FFF' },
  divider: { position: 'absolute', top: 248, left: 20, width: 371, height: 1, backgroundColor: 'rgba(0,0,0,0.12)' },
  reportList: { position: 'absolute', top: 260, left: 12, width: 388, height: 635 },
  reportListContent: { paddingTop: 15, paddingBottom: 30 },
  availabilityFooter: { width: 375, marginTop: 4 },
  emptyContainer: { width: 375, height: 300, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontFamily: 'InriaSans_700Bold', fontSize: 18, color: '#253C96', textAlign: 'center' },
  emptyText: { fontFamily: 'InriaSans_400Regular', fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  pendingText: { color: '#9A3412', fontFamily: 'InriaSans_400Regular', fontSize: 12, marginTop: 4, marginBottom: 8 },
});
