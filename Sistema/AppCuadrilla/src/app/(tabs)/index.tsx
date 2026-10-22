import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { isActiveAssignedStatus } from '../../services/fieldApiContract';
import { APP_THEME } from '../../theme/appTheme';

const filters: { value: ReportStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' }, { value: 'inProgress', label: 'En proceso' }, { value: 'pending', label: 'Pendiente' }, { value: 'completed', label: 'Completado' },
];

export default function ReportesScreen() {
  const router = useRouter();
  const [reportes, setReportes] = useState<ReporteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cuadrilla, setCuadrilla] = useState<CuadrillaDTO | null>(null);
  const [reportsConfirmed, setReportsConfirmed] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ReportStatusFilter>('all');
  const sync = useFieldSync();
  const cargarReportes = useCallback(async () => {
    try {
      const session = await authService.getCurrentCuadrilla();
      if (!session) { setReportsConfirmed(false); setLoadError('La sesión de cuadrilla ya no está disponible. Inicia sesión nuevamente.'); return; }
      const [current, data] = await Promise.all([getCuadrillaActual(), reportesService.getAsignados(session.id)]);
      setCuadrilla(current); setReportes(data); setReportsConfirmed(true); setLoadError(null);
    } catch (error: unknown) { setReportsConfirmed(false); setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los reportes'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  const cambiarCuadrilla = async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  };
  useFocusEffect(useCallback(() => { void cargarReportes(); }, [cargarReportes]));
  useEffect(() => { const interval = setInterval(cargarReportes, 30_000); return () => clearInterval(interval); }, [cargarReportes]);
  const pendingAvailability = sync.operations.some((operation) => operation.kind === 'availability');
  const activeReportCount = reportsConfirmed && sync.isOnline ? Math.max(reportes.filter((report) => isActiveAssignedStatus(report.estatus)).length, sync.operations.some((operation) => operation.kind === 'status') ? 1 : 0) : null;
  const cambiarDisponibilidad = async (availability: Availability) => {
    if (!cuadrilla || savingAvailability || pendingAvailability || sync.isLoading || sync.error || (availability === 1 && !canSelectAvailable(activeReportCount))) return;
    setSavingAvailability(true);
    try { const result = await queueAvailability(availability); await sync.refresh(); if (getOperationFeedback(result) === 'synced') await cargarReportes(); Alert.alert('Disponibilidad', operationFeedbackMessages[getOperationFeedback(result)]); }
    catch (error: unknown) { Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo guardar la disponibilidad'); }
    finally { setSavingAvailability(false); }
  };
  const visibleReportes = filterReportes(reportes, query, status);
  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={APP_THEME.colors.royal} /><Text style={styles.loadingText}>Cargando reportes...</Text></View>;
  return <SafeAreaView style={styles.screen} edges={['top']}>
    <FlatList data={visibleReportes} keyExtractor={(item) => String(item.id)} showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargarReportes(); }} colors={[APP_THEME.colors.royal]} />}
      ListHeaderComponent={<View style={styles.header}>
        <View style={styles.titleRow}><Text style={styles.title}>Reportes</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar sesión y cambiar cuadrilla" onPress={() => { void cambiarCuadrilla(); }} style={styles.changeCrewButton}><Ionicons name="log-out-outline" size={18} color="#015FEB" /><Text style={styles.changeCrewText}>Cambiar cuadrilla</Text></TouchableOpacity></View>
        {cuadrilla ? <Text style={styles.crewName}>Sesión: {cuadrilla.nombre}</Text> : null}
        {loadError ? <View style={styles.loadError}><Text style={styles.loadErrorText}>{loadError}</Text><TouchableOpacity accessibilityRole="button" onPress={() => { setRefreshing(true); void cargarReportes(); }}><Text style={styles.retryText}>Reintentar</Text></TouchableOpacity></View> : null}
        <Text style={styles.searchTitle}>Buscar reportes</Text>
        <View style={styles.search}><Ionicons name="search-outline" size={20} color="#8FAFD9" /><TextInput value={query} onChangeText={setQuery} placeholder="Buscar por ID, tipo o sector..." placeholderTextColor="#8FAFD9" style={styles.searchInput} accessibilityLabel="Buscar reportes" /></View>
        <Text style={styles.statusLabel}>Estado</Text><View style={styles.filters}>{filters.map(({ value, label }) => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: status === value }} onPress={() => setStatus(value)} style={[styles.filter, status === value && styles.filterActive]}><Text style={[styles.filterText, status === value && styles.filterTextActive]}>{label}</Text></TouchableOpacity>)}</View>
      </View>}
      renderItem={({ item }) => <View style={styles.cardWrap}><ReporteCard reporte={item} onPress={() => router.push(`/reporte/${item.id}`)} />{sync.operations.some((operation) => 'reportId' in operation && operation.reportId === item.id) && <Text style={styles.pendingText}>Sincronización pendiente para este reporte.</Text>}</View>}
      ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyTitle}>{reportes.length ? 'No se encontraron reportes' : 'Sin reportes asignados'}</Text><Text style={styles.emptyText}>{reportes.length ? 'Prueba con otra búsqueda o filtro.' : 'Cuando se te asigne un reporte, aparecerá aquí automáticamente.'}</Text></View>}
      ListFooterComponent={cuadrilla ? <View style={styles.availabilityFooter}><DisponibilidadSelector currentAvailability={cuadrilla.estatusDisponibilidad} activeReportCount={activeReportCount} disabled={savingAvailability || pendingAvailability || sync.isLoading || !!sync.error} onChange={cambiarDisponibilidad} />{pendingAvailability && <Text style={styles.pendingText}>Disponibilidad pendiente o rechazada. Sincroniza para revisar el resultado.</Text>}</View> : null} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_THEME.colors.canvas }, loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: APP_THEME.colors.canvas }, loadingText: { fontSize: 16, color: APP_THEME.colors.muted, fontFamily: 'InriaSans_400Regular' },
  listContent: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 44, paddingBottom: 32 }, header: { gap: 11, paddingHorizontal: 4, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.12)', marginBottom: 20 }, titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, title: { fontFamily: 'InriaSans_700Bold', fontSize: 24, lineHeight: 29, color: APP_THEME.colors.royal }, changeCrewButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5 }, changeCrewText: { fontFamily: 'InriaSans_700Bold', fontSize: 13, color: '#015FEB' }, crewName: { marginTop: -7, fontFamily: 'InriaSans_400Regular', fontSize: 13, color: APP_THEME.colors.muted }, loadError: { borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', borderRadius: APP_THEME.radius.input, padding: 10, gap: 7 }, loadErrorText: { color: '#991B1B', fontFamily: 'InriaSans_400Regular', fontSize: 13, lineHeight: 18 }, retryText: { color: '#015FEB', fontFamily: 'InriaSans_700Bold', fontSize: 13 }, searchTitle: { fontFamily: 'InriaSans_700Bold', fontSize: 16, color: APP_THEME.colors.royal },
  search: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#9CA3AF', borderRadius: APP_THEME.radius.input, backgroundColor: '#F5F6FB' }, searchInput: { flex: 1, minHeight: 41, padding: 0, fontFamily: 'InriaSans_400Regular', fontSize: 16, color: APP_THEME.colors.ink }, statusLabel: { marginTop: 3, fontFamily: 'InriaSans_700Bold', fontSize: 16, color: APP_THEME.colors.ink },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, filter: { minHeight: 28, borderWidth: 1, borderColor: APP_THEME.colors.primary, borderRadius: 8, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, filterActive: { backgroundColor: '#015FEB', borderColor: '#015FEB' }, filterText: { fontFamily: 'InriaSans_400Regular', fontSize: 16, color: '#015FEB' }, filterTextActive: { color: '#FFF' },
  cardWrap: { marginBottom: 14 }, availabilityFooter: { marginTop: 6 }, emptyContainer: { minHeight: 260, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 12 }, emptyTitle: { fontFamily: 'InriaSans_700Bold', fontSize: 18, color: APP_THEME.colors.royal, textAlign: 'center' }, emptyText: { fontFamily: 'InriaSans_400Regular', fontSize: 14, color: APP_THEME.colors.muted, textAlign: 'center', lineHeight: 20 }, pendingText: { color: '#9A3412', fontFamily: 'InriaSans_400Regular', fontSize: 12, marginTop: 5 },
});
