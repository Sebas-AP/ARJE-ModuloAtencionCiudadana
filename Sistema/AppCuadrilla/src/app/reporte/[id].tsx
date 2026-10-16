import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { reportesService } from '../../services/reportesService';
import { useLocation } from '../../hooks/useLocation';
import { EvidenciaUploader } from '../../components/EvidenciaUploader';
import { SyncStatus } from '../../components/SyncStatus';
import { useFieldSync } from '../../hooks/useFieldSync';
import { getAllowedNextStatuses, getOperationFeedback, hasResolutionEvidence, operationFeedbackMessages, refreshReportAfterStatus, type FieldStatus } from '../../services/fieldUiPolicy';
import type { SyncResult } from '../../services/syncService';
import { ReporteDTO } from '../../types';
import { getReporteStatusVisual } from '../../services/reportesListModel';
import { APP_THEME } from '../../theme/appTheme';

const dateTime = (value?: string) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return { time: '--:--', elapsed: '—' };
  const date = new Date(value); const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  return { time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), elapsed: minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes}min` };
};
const dateLabel = (value?: string) => !value || Number.isNaN(new Date(value).getTime()) ? 'Fecha no disponible' : new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function ReporteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reporteId = parseInt(id || '0', 10); const router = useRouter();
  const [reporte, setReporte] = useState<ReporteDTO | null>(null); const [loading, setLoading] = useState(true); const [guardando, setGuardando] = useState(false);
  const [statusNeedsRefresh, setStatusNeedsRefresh] = useState(false); const [resolviendo, setResolviendo] = useState(false); const [comentario, setComentario] = useState('');
  const [estimado, setEstimado] = useState(''); const [ubicacionActual, setUbicacionActual] = useState<{ latitude: number; longitude: number } | null>(null); const [evidenceConfirmed, setEvidenceConfirmed] = useState(false);
  const sync = useFieldSync(); const operationsRef = useRef(sync.operations); operationsRef.current = sync.operations;
  const { location, obtenerUbicacionActual } = useLocation(reporteId, reporte?.estatus);
  const cargarReporte = useCallback(async () => {
    try { const data = await reportesService.getDetalle(reporteId); setReporte(data); setEstimado(data.tiempoEstimado ? String(data.tiempoEstimado) : ''); return true; }
    catch (error: unknown) { Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo cargar el reporte'); return false; }
    finally { setLoading(false); }
  }, [reporteId]);
  useEffect(() => { void cargarReporte(); setEvidenceConfirmed(false); setStatusNeedsRefresh(false); }, [cargarReporte]);
  const pendingStatus = sync.operations.some((operation) => operation.kind === 'status' && operation.reportId === reporteId);
  const pendingReportOperation = sync.operations.some((operation) => 'reportId' in operation && operation.reportId === reporteId);
  useEffect(() => {
    if (pendingStatus) setStatusNeedsRefresh(true);
    if (!statusNeedsRefresh || guardando || sync.isLoading || sync.error || !sync.isOnline) return;
    let cancelled = false;
    void refreshReportAfterStatus(reporteId, operationsRef.current, cargarReporte).then((refreshed) => { if (refreshed && !cancelled) setStatusNeedsRefresh(false); });
    return () => { cancelled = true; };
  }, [pendingStatus, statusNeedsRefresh, guardando, sync.isLoading, sync.isSyncing, sync.error, sync.isOnline, reporteId, cargarReporte]);
  useEffect(() => { if (location) setUbicacionActual(location); }, [location]);
  const resolutionReady = evidenceConfirmed || hasResolutionEvidence(reporteId, reporte?.evidencias ?? [], sync.operations);
  const pending = pendingReportOperation || statusNeedsRefresh || guardando || sync.isLoading || !!sync.error;
  const handleActualizarEstatus = async (nuevoEstatus: FieldStatus, comentariosResolucion?: string) => {
    if (!reporte || pending || !getAllowedNextStatuses(reporte.estatus).includes(nuevoEstatus) || (nuevoEstatus === 5 && !resolutionReady)) return;
    setGuardando(true); setStatusNeedsRefresh(true);
    try { const result = await reportesService.actualizarEstatus(reporteId, { estatus: nuevoEstatus, comentariosResolucion }); await sync.refresh(); Alert.alert('Estado del reporte', operationFeedbackMessages[getOperationFeedback(result)]); setComentario(''); }
    catch (error: unknown) { Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo guardar el estado'); }
    finally { setGuardando(false); }
  };
  const handleGuardarEstimado = async () => {
    const value = Number(estimado);
    if (!Number.isInteger(value) || value < 1 || value > 1440) { Alert.alert('Tiempo estimado', 'Ingresa un valor entre 1 y 1440 minutos.'); return; }
    if (pending) return; setGuardando(true);
    try { const result = await reportesService.actualizarTiempoEstimado(reporteId, value); await sync.refresh(); Alert.alert('Tiempo estimado', operationFeedbackMessages[getOperationFeedback(result)]); }
    catch (error: unknown) { Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo actualizar el tiempo estimado'); }
    finally { setGuardando(false); }
  };
  const handleResolverSupervision = async (confirmaReparacion: boolean) => {
    if (!reporte || pending) return; setGuardando(true);
    try { const result = await reportesService.resolverSupervision(reporteId, confirmaReparacion, comentario); await sync.refresh(); Alert.alert('Supervisión', operationFeedbackMessages[getOperationFeedback(result)]); setComentario(''); if (getOperationFeedback(result) === 'synced') await cargarReporte(); }
    catch (error: unknown) { Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo registrar la supervisión'); }
    finally { setGuardando(false); }
  };
  const handleEvidenciaExitosa = (result: SyncResult) => { void sync.refresh(); if (getOperationFeedback(result) === 'synced') setEvidenceConfirmed(true); if (sync.isOnline) void cargarReporte(); };
  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={APP_THEME.colors.royal} /><Text style={styles.loadingText}>Cargando reporte...</Text></View>;
  if (!reporte) return <SafeAreaView style={styles.screen}><View style={styles.errorScreen}><SyncStatus {...sync} onRetry={() => { void sync.syncNow(); }} /><Text style={styles.bodyCopy}>No se pudo cargar el reporte. Necesitas conexión para consultar el detalle.</Text><TouchableOpacity style={styles.primaryAction} onPress={() => { void cargarReporte(); }}><Text style={styles.primaryActionText}>Reintentar carga</Text></TouchableOpacity></View></SafeAreaView>;
  if (reporte.estatus === 5 || reporte.estatus === 7) return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}><View style={styles.completeScreen}><View style={styles.completedIcon}><Text style={styles.completedMark}>✓</Text></View><Text style={styles.completedTitle}>{reporte.estatus === 7 ? 'Reporte cerrado' : '¡Reporte completado!'}</Text><Text style={styles.completedCopy}>El reporte {reporte.folio || `REP-${reporte.id}`} fue actualizado correctamente.</Text><TouchableOpacity accessibilityRole="button" style={styles.primaryAction} onPress={() => router.replace('/(tabs)')}><Text style={styles.primaryActionText}>Volver a reportes</Text></TouchableOpacity></View></SafeAreaView>;
  const folio = reporte.folio || `REP-${reporte.id}`; const statusVisual = getReporteStatusVisual(reporte.estatus); const timing = dateTime(reporte.fechaRecibido); const canUpdateEstimate = [2, 3, 4].includes(reporte.estatus);
  return <SafeAreaView style={styles.screen} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.titleRow}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a reportes" style={styles.backButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color="#2200FF" /></TouchableOpacity><View><Text style={styles.pageTitle}>{resolviendo ? 'Completar reporte' : reporte.categoria || 'Reporte'}</Text><View style={styles.folioContainer}><Ionicons name="document-text-outline" size={16} color="#015FEB" /><Text style={styles.folio}>{folio}</Text></View></View></View>
    {!resolviendo && <View style={[styles.statusBadge, { backgroundColor: statusVisual.background }]}><Text style={[styles.statusBadgeText, { color: statusVisual.color }]}>{statusVisual.label}</Text></View>}
    {resolviendo ? <>
      <View style={styles.card}><Text style={styles.cardTitle}>{reporte.categoria || 'Reporte'}</Text><Text style={styles.muted}>Sector {reporte.direccion || '---'} · {dateLabel(reporte.fechaRecibido)}</Text></View>
      <Text style={styles.sectionLabel}>Descripción del trabajo realizado</Text><View style={styles.workCard}><TextInput value={comentario} onChangeText={setComentario} maxLength={2000} multiline textAlignVertical="top" style={styles.workInput} placeholder="Describe lo que se hizo para resolver el reporte" placeholderTextColor="rgba(29,47,64,0.55)" accessibilityLabel="Descripción del trabajo realizado" /><Text style={styles.counter}>{comentario.length}/2000</Text></View>
      {reporte.estatus === 4 && <View style={styles.evidenceArea}><EvidenciaUploader idReporte={reporteId} onSuccess={handleEvidenciaExitosa} disabled={pending} /></View>}
      <Text style={styles.helperText}>{reporte.estatus === 4 ? 'Adjunta evidencia de resolución antes de completar el reporte.' : 'Completa la atención del reporte para habilitar la evidencia de resolución.'}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: pending || reporte.estatus !== 4 || !resolutionReady }} disabled={pending || reporte.estatus !== 4 || !resolutionReady} style={[styles.primaryAction, (pending || reporte.estatus !== 4 || !resolutionReady) && styles.disabledAction]} onPress={() => { void handleActualizarEstatus(5, comentario); }}><Text style={styles.primaryActionText}>{guardando ? 'Guardando…' : 'Marcar como completado'}</Text></TouchableOpacity>
    </> : <>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Abrir mapa del reporte" style={styles.mapPreview} onPress={() => router.push('/(tabs)/mapa')}><Ionicons name="map-outline" size={32} color="#64748B" /><Text style={styles.mapText}>Ver ubicación en el mapa</Text></TouchableOpacity>
      <View style={styles.card}><View style={styles.timeRow}><View><Text style={styles.timeTitle}>Hora de registro</Text><Text style={styles.muted}>{timing.time}</Text></View><View><Text style={styles.timeTitle}>Tiempo transcurrido</Text><Text style={styles.elapsedText}>{timing.elapsed}</Text></View></View></View>
      <View style={styles.card}><Text style={styles.cardTitle}>Descripción del reporte</Text><Text style={styles.descriptionText}>{reporte.descripcion || 'Sin descripción disponible.'}</Text><Text style={styles.muted}>Sector: {reporte.direccion || '---'} · {dateLabel(reporte.fechaRecibido)}</Text></View>
      {canUpdateEstimate && <View style={styles.card}><Text style={styles.cardTitle}>Tiempo estimado de reparación</Text><View style={styles.estimateRow}><TextInput value={estimado} onChangeText={setEstimado} keyboardType="number-pad" maxLength={4} placeholder="Minutos" placeholderTextColor="#8FAFD9" accessibilityLabel="Tiempo estimado en minutos" style={styles.estimateInput} /><TouchableOpacity accessibilityRole="button" disabled={pending} onPress={() => { void handleGuardarEstimado(); }} style={[styles.secondaryAction, pending && styles.disabledAction]}><Text style={styles.secondaryActionText}>Guardar</Text></TouchableOpacity></View></View>}
      {reporte.estatus === 6 ? <View style={styles.supervisionCard}><Text style={styles.cardTitle}>Validar supervisión</Text><Text style={styles.muted}>Confirma la reparación o recházala para que vuelva a estar en proceso.</Text><TextInput value={comentario} onChangeText={setComentario} maxLength={1000} multiline placeholder="Observaciones de supervisión (opcional)" placeholderTextColor="#8FAFD9" style={styles.supervisionInput} accessibilityLabel="Observaciones de supervisión" /><View style={styles.supervisionActions}><TouchableOpacity accessibilityRole="button" disabled={pending} onPress={() => { void handleResolverSupervision(false); }} style={[styles.rejectAction, pending && styles.disabledAction]}><Text style={styles.rejectText}>Rechazar y reabrir</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" disabled={pending} onPress={() => { void handleResolverSupervision(true); }} style={[styles.primaryAction, styles.compactAction, pending && styles.disabledAction]}><Text style={styles.primaryActionText}>Confirmar supervisión</Text></TouchableOpacity></View></View> : <>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={ubicacionActual ? `Ubicación marcada ${ubicacionActual.latitude.toFixed(4)}, ${ubicacionActual.longitude.toFixed(4)}` : 'Marcar ubicación'} accessibilityState={{ disabled: guardando }} disabled={guardando} style={styles.locationButton} onPress={() => { void obtenerUbicacionActual(); }}><Ionicons name="location-outline" size={22} color="#2200FF" /><Text style={styles.locationButtonText}>Marcar ubicación</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: pending || !getAllowedNextStatuses(reporte.estatus).length }} disabled={pending || !getAllowedNextStatuses(reporte.estatus).length} style={[styles.primaryAction, (pending || !getAllowedNextStatuses(reporte.estatus).length) && styles.disabledAction]} onPress={() => { if (reporte.estatus === 4) setResolviendo(true); else { const next = getAllowedNextStatuses(reporte.estatus)[0]; if (next) void handleActualizarEstatus(next); } }}><Text style={styles.primaryActionText}>{guardando ? 'Guardando…' : reporte.estatus === 4 ? 'Completar reporte' : 'Atender reporte'}</Text></TouchableOpacity>
      </>}
    </>}
    {(sync.pendingCount > 0 || sync.failedCount > 0 || sync.requiresAuthentication || sync.error) && <SyncStatus {...sync} onRetry={() => { void sync.syncNow(); }} />}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_THEME.colors.canvas }, loadingContainer: { flex: 1, backgroundColor: APP_THEME.colors.canvas, justifyContent: 'center', alignItems: 'center', gap: 12 }, loadingText: { color: APP_THEME.colors.muted, fontSize: 16, fontFamily: 'InriaSans_400Regular' }, errorScreen: { flex: 1, padding: 24, gap: 20, justifyContent: 'center' }, bodyCopy: { color: APP_THEME.colors.ink, fontFamily: 'InriaSans_400Regular', fontSize: 15, lineHeight: 22 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 16 }, titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: 1 }, pageTitle: { fontFamily: 'InriaSans_700Bold', fontSize: 24, lineHeight: 29, color: APP_THEME.colors.royal }, folioContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }, folio: { color: '#015FEB', fontFamily: 'InriaSans_700Bold', fontSize: 14 }, statusBadge: { alignSelf: 'flex-start', borderRadius: APP_THEME.radius.pill, paddingHorizontal: 11, paddingVertical: 5, marginLeft: 40 }, statusBadgeText: { fontFamily: 'InriaSans_700Bold', fontSize: 12 },
  mapPreview: { minHeight: 180, borderRadius: APP_THEME.radius.card, backgroundColor: '#D9D9D9', alignItems: 'center', justifyContent: 'center', gap: 8 }, mapText: { color: APP_THEME.colors.ink, fontFamily: 'InriaSans_700Bold', fontSize: 15 }, card: { padding: 15, gap: 10, borderWidth: 1, borderColor: APP_THEME.colors.border, borderRadius: APP_THEME.radius.card, backgroundColor: APP_THEME.colors.surface }, timeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 20 }, timeTitle: { fontFamily: 'InriaSans_700Bold', fontSize: 16, color: APP_THEME.colors.ink }, elapsedText: { fontFamily: 'InriaSans_700Bold', fontSize: 16, color: APP_THEME.colors.primary, marginTop: 7 }, muted: { fontFamily: 'InriaSans_400Regular', fontSize: 14, lineHeight: 20, color: APP_THEME.colors.muted, marginTop: 5 }, cardTitle: { fontFamily: 'InriaSans_700Bold', fontSize: 16, lineHeight: 20, color: APP_THEME.colors.ink }, descriptionText: { fontFamily: 'InriaSans_400Regular', fontSize: 15, lineHeight: 21, color: APP_THEME.colors.ink },
  estimateRow: { flexDirection: 'row', gap: 10, alignItems: 'center' }, estimateInput: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: '#9CA3AF', borderRadius: APP_THEME.radius.input, paddingHorizontal: 12, color: APP_THEME.colors.ink, fontFamily: 'InriaSans_400Regular', fontSize: 16, backgroundColor: '#FFF' }, secondaryAction: { minHeight: 44, borderRadius: APP_THEME.radius.button, paddingHorizontal: 16, backgroundColor: '#E8F1FF', justifyContent: 'center' }, secondaryActionText: { color: APP_THEME.colors.royal, fontFamily: 'InriaSans_700Bold', fontSize: 14 },
  locationButton: { minHeight: 48, borderRadius: APP_THEME.radius.button, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: APP_THEME.colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 2 }, locationButtonText: { color: '#2200FF', fontFamily: 'InriaSans_700Bold', fontSize: 17 }, primaryAction: { minHeight: 50, borderRadius: APP_THEME.radius.button, backgroundColor: APP_THEME.colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: APP_THEME.colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 3, paddingHorizontal: 16 }, primaryActionText: { color: '#FFF', fontFamily: 'InriaSans_700Bold', fontSize: 16, textAlign: 'center' }, disabledAction: { opacity: 0.5 },
  sectionLabel: { marginTop: 4, fontFamily: 'InriaSans_700Bold', fontSize: 16, color: APP_THEME.colors.ink }, workCard: { minHeight: 155, borderWidth: 1, borderColor: APP_THEME.colors.border, borderRadius: APP_THEME.radius.card, backgroundColor: APP_THEME.colors.surface, padding: 14 }, workInput: { flex: 1, minHeight: 105, padding: 0, fontFamily: 'InriaSans_400Regular', fontSize: 15, lineHeight: 20, color: APP_THEME.colors.ink }, counter: { alignSelf: 'flex-end', color: APP_THEME.colors.muted, fontSize: 12, fontFamily: 'InriaSans_400Regular' }, evidenceArea: { alignItems: 'center' }, helperText: { textAlign: 'center', color: APP_THEME.colors.muted, fontFamily: 'InriaSans_400Regular', fontSize: 13, lineHeight: 18 },
  supervisionCard: { padding: 15, gap: 12, borderRadius: APP_THEME.radius.card, backgroundColor: '#FFF7E6', borderWidth: 1, borderColor: '#F5C26B' }, supervisionInput: { minHeight: 82, borderWidth: 1, borderColor: '#E0B25E', borderRadius: APP_THEME.radius.input, backgroundColor: '#FFF', padding: 10, color: APP_THEME.colors.ink, fontFamily: 'InriaSans_400Regular', fontSize: 14 }, supervisionActions: { gap: 10 }, rejectAction: { minHeight: 46, borderWidth: 1, borderColor: '#B45309', borderRadius: APP_THEME.radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, rejectText: { color: '#B45309', fontFamily: 'InriaSans_700Bold', fontSize: 15 }, compactAction: { minHeight: 46 },
  completeScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 }, completedIcon: { width: 136, height: 136, borderRadius: 68, backgroundColor: 'rgba(18,234,22,0.24)', alignItems: 'center', justifyContent: 'center' }, completedMark: { color: '#0FA875', fontFamily: 'InriaSans_400Regular', fontSize: 74 }, completedTitle: { textAlign: 'center', color: APP_THEME.colors.royal, fontFamily: 'InriaSans_700Bold', fontSize: 28 }, completedCopy: { textAlign: 'center', color: APP_THEME.colors.muted, fontFamily: 'InriaSans_400Regular', fontSize: 16, lineHeight: 22, marginBottom: 10, maxWidth: 330 },
});
