import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
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
import { fitArtboard } from '../../theme/figmaArtboard';
import { getReporteStatusVisual } from '../../services/reportesListModel';

const dateTime = (value?: string) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return { time: '--:--', elapsed: '—' };
  const date = new Date(value);
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  const elapsed = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes}min`;
  return { time, elapsed };
};

const dateLabel = (value?: string) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Fecha no disponible';
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function ReporteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reporteId = parseInt(id || '0', 10);
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const scale = fitArtboard(width, height);
  const [reporte, setReporte] = useState<ReporteDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [statusNeedsRefresh, setStatusNeedsRefresh] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);
  const [comentario, setComentario] = useState('');
  const [ubicacionActual, setUbicacionActual] = useState<{ latitude: number; longitude: number } | null>(null);
  const [evidenceConfirmed, setEvidenceConfirmed] = useState(false);
  const sync = useFieldSync();
  const operationsRef = useRef(sync.operations);
  operationsRef.current = sync.operations;
  const { location, obtenerUbicacionActual } = useLocation(reporteId, reporte?.estatus);

  const cargarReporte = useCallback(async () => {
    try {
      const data = await reportesService.getDetalle(reporteId);
      setReporte(data);
      return true;
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo cargar el reporte');
      return false;
    } finally {
      setLoading(false);
    }
  }, [reporteId]);

  useEffect(() => {
    void cargarReporte();
    setEvidenceConfirmed(false);
    setStatusNeedsRefresh(false);
  }, [cargarReporte]);

  const pendingStatus = sync.operations.some((operation) => operation.kind === 'status' && operation.reportId === reporteId);
  useEffect(() => {
    if (pendingStatus) setStatusNeedsRefresh(true);
    if (!statusNeedsRefresh || guardando || sync.isLoading || sync.error || !sync.isOnline) return;
    let cancelled = false;
    void refreshReportAfterStatus(reporteId, operationsRef.current, cargarReporte).then((refreshed) => {
      if (refreshed && !cancelled) setStatusNeedsRefresh(false);
    });
    return () => { cancelled = true; };
  }, [pendingStatus, statusNeedsRefresh, guardando, sync.isLoading, sync.isSyncing, sync.error, sync.isOnline, reporteId, cargarReporte]);

  useEffect(() => { if (location) setUbicacionActual(location); }, [location]);

  const resolutionReady = evidenceConfirmed || hasResolutionEvidence(reporteId, reporte?.evidencias ?? [], sync.operations);
  const handleActualizarEstatus = async (nuevoEstatus: FieldStatus, comentariosResolucion?: string) => {
    if (!reporte || guardando || pendingStatus || statusNeedsRefresh || sync.isLoading || sync.error
      || !getAllowedNextStatuses(reporte.estatus).includes(nuevoEstatus)
      || (nuevoEstatus === 5 && !resolutionReady)) return;
    setGuardando(true);
    setStatusNeedsRefresh(true);
    try {
      const result = await reportesService.actualizarEstatus(reporteId, { estatus: nuevoEstatus });
      await sync.refresh();
      const feedback = operationFeedbackMessages[getOperationFeedback(result)];
      const note = comentariosResolucion?.trim()
        ? ' La descripción se muestra en pantalla, pero el servicio actual no la envía al servidor.'
        : '';
      Alert.alert('Estado del reporte', `${feedback}${note}`);
      setComentario('');
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo guardar el estado');
    } finally {
      setGuardando(false);
    }
  };

  const handleAtender = async () => {
    if (!reporte || guardando || pendingStatus || statusNeedsRefresh || sync.isLoading || sync.error) return;
    if (reporte.estatus === 4) {
      setResolviendo(true);
      return;
    }
    const next = getAllowedNextStatuses(reporte.estatus)[0];
    if (next) await handleActualizarEstatus(next);
  };

  const handleEvidenciaExitosa = (result: SyncResult) => {
    void sync.refresh();
    if (getOperationFeedback(result) === 'synced') setEvidenceConfirmed(true);
    if (sync.isOnline) void cargarReporte();
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#253C96" /><Text style={styles.loadingText}>Cargando reporte...</Text></View>;
  if (!reporte) return <View style={styles.stage}><View style={styles.errorScreen}><SyncStatus {...sync} onRetry={() => { void sync.syncNow(); }} /><Text style={styles.bodyCopy}>No se pudo cargar el reporte. Necesitas conexión para consultar el detalle.</Text><TouchableOpacity style={styles.primaryAction} onPress={() => { void cargarReporte(); }}><Text style={styles.primaryActionText}>Reintentar carga</Text></TouchableOpacity></View></View>;

  if (reporte.estatus === 5 || reporte.estatus === 6 || reporte.estatus === 7) {
    return <View style={styles.stage}>
      <View style={[styles.artboard, { transform: [{ scale }] }]}>
        <View style={styles.completedIcon}><Text style={styles.completedMark}>✓</Text></View>
        <Text style={styles.completedTitle}>¡Reporte completado!</Text>
        <Text style={styles.completedCopy}>El reporte {reporte.folio || `REP-${reporte.id}`} ha sido marcado como completado con éxito</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.completedAction} onPress={() => router.replace('/(tabs)')}><Text style={styles.completedActionText}>Volver a reportes</Text></TouchableOpacity>
      </View>
    </View>;
  }

  const folio = reporte.folio || `REP-${reporte.id}`;
  const statusVisual = getReporteStatusVisual(reporte.estatus);
  const timing = dateTime(reporte.fechaRecibido);
  const pending = pendingStatus || statusNeedsRefresh || guardando || sync.isLoading || !!sync.error;
  return <View style={styles.stage}>
    <View style={[styles.artboard, { transform: [{ scale }] }]}>
      {resolviendo ? <>
        <Text style={styles.pageTitleResolution}>Completar reporte</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al detalle" style={styles.backButton} onPress={() => setResolviendo(false)}><Ionicons name="arrow-back" size={28} color="#2200FF" /></TouchableOpacity>
        <View style={styles.resolutionHeader}>
          <Ionicons name="document-text-outline" size={16} color="#015FEB" />
          <Text style={styles.resolutionFolio}>{folio}</Text>
        </View>
        <View style={styles.compactCard}>
          <Text style={styles.compactTitle}>{reporte.categoria || 'Reporte'}</Text>
          <Text style={styles.compactSubtitle}>Sector {reporte.direccion || '---'} · {dateLabel(reporte.fechaRecibido)}</Text>
        </View>
        <Text style={styles.workLabel}>Descripcion del trabajo realizado</Text>
        <View style={styles.workCard}>
          <TextInput value={comentario} onChangeText={setComentario} maxLength={500} multiline textAlignVertical="top" style={styles.workInput} placeholder="Describe lo que se hizo para resolver el reporte, o dictalo por voz con el boton de abajo" placeholderTextColor="rgba(29,47,64,0.55)" accessibilityLabel="Descripción del trabajo realizado" />
          <Text style={styles.counter}>{comentario.length}/500</Text>
        </View>
        {reporte.estatus === 4 ? <View style={styles.evidenceArea}><EvidenciaUploader idReporte={reporteId} onSuccess={handleEvidenciaExitosa} disabled={guardando || pendingStatus} /></View> : null}
        <Text style={styles.photoHint}>Las fotos ayudan a demostrar que el problema se soluciono</Text>
        {reporte.estatus !== 4 && <Text style={styles.statusHint}>Completa la atención del reporte para habilitar la evidencia de resolución.</Text>}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: pending || reporte.estatus !== 4 || !resolutionReady }} disabled={pending || reporte.estatus !== 4 || !resolutionReady} style={[styles.resolutionAction, (pending || reporte.estatus !== 4 || !resolutionReady) && styles.disabledAction]} onPress={() => { void handleActualizarEstatus(5, comentario); }}>
          <Text style={styles.resolutionActionText}>{guardando ? 'Guardando…' : 'Marcar como completado'}</Text>
        </TouchableOpacity>
        {sync.pendingCount > 0 || sync.failedCount > 0 || sync.requiresAuthentication || sync.error ? <View style={styles.detailSync}><SyncStatus {...sync} onRetry={() => { void sync.syncNow(); }} /></View> : null}
      </> : <>
        <Text style={styles.pageTitle}>{reporte.categoria || 'Reporte'}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a reportes" style={styles.backButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={28} color="#2200FF" /></TouchableOpacity>
        <View style={styles.detailHeader}>
          <View style={styles.folioContainer}><Ionicons name="document-text-outline" size={16} color="#015FEB" /><Text style={styles.folio}>{folio}</Text></View>
          <View style={[styles.statusBadge, { backgroundColor: statusVisual.background }]}><Text style={[styles.statusBadgeText, { color: statusVisual.color }]}>{statusVisual.label}</Text></View>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Abrir mapa del reporte" style={styles.mapPreview} onPress={() => router.push('/(tabs)/mapa')} />
        <View style={styles.timeCard}>
          <Ionicons name="time-outline" size={16} color="#9CA3AF" style={styles.clockIcon} />
          <View style={styles.timeColumn}><Text style={styles.timeTitle}>Hora de registro</Text><Text style={styles.timeMuted}>{timing.time}</Text></View>
          <View style={styles.elapsedColumn}><Text style={styles.timeTitle}>Tiempo transcurrido</Text><Text style={styles.elapsedText}>{timing.elapsed}</Text></View>
        </View>
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>Descripcion del reporte</Text>
          <Text numberOfLines={4} style={styles.descriptionText}>{reporte.descripcion || 'Sin descripción disponible.'}</Text>
          <Text numberOfLines={1} style={styles.descriptionMetadata}>Sector: {reporte.direccion || '---'} · {dateLabel(reporte.fechaRecibido)}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={ubicacionActual ? `Ubicación marcada ${ubicacionActual.latitude.toFixed(4)}, ${ubicacionActual.longitude.toFixed(4)}` : 'Marcar ubicación'} accessibilityState={{ disabled: guardando }} disabled={guardando} style={styles.locationButton} onPress={() => { void obtenerUbicacionActual(); }}>
          <Ionicons name="location-outline" size={24} color="#2200FF" /><Text style={styles.locationButtonText}>Marcar ubicación</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: pending || !getAllowedNextStatuses(reporte.estatus).length }} disabled={pending || !getAllowedNextStatuses(reporte.estatus).length} style={[styles.attendButton, (pending || !getAllowedNextStatuses(reporte.estatus).length) && styles.disabledAction]} onPress={() => { void handleAtender(); }}>
          <Text style={styles.attendButtonText}>{guardando ? 'Guardando…' : 'Atender reporte'}</Text>
        </TouchableOpacity>
        {sync.pendingCount > 0 || sync.failedCount > 0 || sync.requiresAuthentication || sync.error ? <View style={styles.detailSync}><SyncStatus {...sync} onRetry={() => { void sync.syncNow(); }} /></View> : null}
      </>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center' },
  artboard: { width: 412, height: 917, backgroundColor: '#F2F2F2' },
  loadingContainer: { flex: 1, backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#64748B', fontSize: 16, fontFamily: 'InriaSans_400Regular' },
  errorScreen: { padding: 24, gap: 20 },
  bodyCopy: { color: '#1D2F40', fontFamily: 'InriaSans_400Regular', fontSize: 15, lineHeight: 22 },
  pageTitle: { position: 'absolute', left: 52, top: 73, height: 29, fontFamily: 'InriaSans_700Bold', fontSize: 24, lineHeight: 29, color: '#253C96' },
  pageTitleResolution: { position: 'absolute', left: 52, top: 73, height: 29, fontFamily: 'InriaSans_700Bold', fontSize: 24, lineHeight: 29, color: '#253C96' },
  backButton: { position: 'absolute', left: 18, top: 84, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  detailHeader: { position: 'absolute', left: 52, right: 33, top: 105, height: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  folioContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  folio: { color: '#015FEB', fontFamily: 'InriaSans_700Bold', fontSize: 14, lineHeight: 17 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontFamily: 'InriaSans_700Bold', fontSize: 12, lineHeight: 14 },
  mapPreview: { position: 'absolute', left: 0, top: 154, width: 412, height: 231, backgroundColor: '#D9D9D9' },
  timeCard: { position: 'absolute', left: 18, top: 404, width: 375, height: 72, borderWidth: 1, borderColor: '#E7F3FF', borderRadius: 18, backgroundColor: '#F8FAFF', flexDirection: 'row', alignItems: 'flex-start' },
  clockIcon: { position: 'absolute', left: 14, top: 25 },
  timeColumn: { position: 'absolute', left: 38, top: 9, gap: 7 },
  elapsedColumn: { position: 'absolute', right: 9, top: 9, gap: 7 },
  timeTitle: { fontFamily: 'InriaSans_700Bold', fontSize: 16, lineHeight: 19, color: '#1D2F40' },
  timeMuted: { fontFamily: 'InriaSans_300Light', fontSize: 16, lineHeight: 19, color: 'rgba(29,47,64,0.55)' },
  elapsedText: { fontFamily: 'InriaSans_700Bold', fontSize: 16, lineHeight: 19, color: '#0184FF' },
  descriptionCard: { position: 'absolute', left: 18, top: 495, width: 375, height: 159, borderWidth: 1, borderColor: '#E7F3FF', borderRadius: 18, backgroundColor: '#F8FAFF' },
  descriptionTitle: { position: 'absolute', left: 14, top: 14, fontFamily: 'InriaSans_700Bold', fontSize: 16, lineHeight: 19, color: '#1D2F40' },
  descriptionText: { position: 'absolute', left: 14, top: 42, width: 348, maxHeight: 72, fontFamily: 'InriaSans_400Regular', fontSize: 15, lineHeight: 18, color: 'rgba(29,47,64,0.76)' },
  descriptionMetadata: { position: 'absolute', left: 14, top: 123, width: 348, fontFamily: 'InriaSans_400Regular', fontSize: 15, lineHeight: 18, color: 'rgba(0,0,0,0.45)' },
  locationButton: { position: 'absolute', left: 25, top: 766, width: 357, height: 44, borderRadius: 12, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#0184FF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 3 },
  locationButtonText: { color: '#2200FF', fontFamily: 'InriaSans_700Bold', fontSize: 18, lineHeight: 22 },
  attendButton: { position: 'absolute', left: 25, top: 835, width: 357, height: 44, borderRadius: 12, backgroundColor: '#0184FF', alignItems: 'center', justifyContent: 'center', shadowColor: '#0184FF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 3 },
  attendButtonText: { color: '#FFF', fontFamily: 'InriaSans_700Bold', fontSize: 18, lineHeight: 22 },
  disabledAction: { opacity: 1 },
  resolutionHeader: { position: 'absolute', left: 52, top: 105, height: 22, flexDirection: 'row', alignItems: 'center', gap: 6 },
  resolutionFolio: { color: '#015FEB', fontFamily: 'InriaSans_700Bold', fontSize: 14, lineHeight: 17 },
  compactCard: { position: 'absolute', left: 18, top: 158, width: 375, height: 72, borderWidth: 1, borderColor: '#E7F3FF', borderRadius: 18, backgroundColor: '#F8FAFF' },
  compactTitle: { position: 'absolute', left: 20, top: 9, fontFamily: 'InriaSans_700Bold', fontSize: 16, lineHeight: 19, color: '#1D2F40' },
  compactSubtitle: { position: 'absolute', left: 20, top: 35, right: 11, fontFamily: 'InriaSans_300Light', fontSize: 15, lineHeight: 19, color: 'rgba(29,47,64,0.55)' },
  workLabel: { position: 'absolute', left: 28, top: 241, fontFamily: 'InriaSans_700Bold', fontSize: 16, lineHeight: 19, color: '#1D2F40' },
  workCard: { position: 'absolute', left: 18, top: 278, width: 375, height: 159, borderWidth: 1, borderColor: '#E7F3FF', borderRadius: 18, backgroundColor: '#F8FAFF' },
  workInput: { position: 'absolute', left: 14, top: 14, width: 348, height: 105, padding: 0, fontFamily: 'InriaSans_400Regular', fontSize: 15, lineHeight: 18, color: '#1D2F40' },
  counter: { position: 'absolute', right: 11, bottom: 5, fontFamily: 'InriaSans_400Regular', fontSize: 15, lineHeight: 18, color: 'rgba(0,0,0,0.34)' },
  evidenceArea: { position: 'absolute', left: 25, top: 468, width: 353 },
  photoHint: { position: 'absolute', left: 28, top: 540, width: 352, textAlign: 'center', fontFamily: 'InriaSans_300Light', fontSize: 14, lineHeight: 17, color: 'rgba(0,0,0,0.72)' },
  statusHint: { position: 'absolute', left: 28, top: 570, width: 352, textAlign: 'center', fontFamily: 'InriaSans_400Regular', fontSize: 12, lineHeight: 16, color: '#9A3412' },
  resolutionAction: { position: 'absolute', left: 25, top: 835, width: 357, height: 44, borderRadius: 12, backgroundColor: '#0184FF', alignItems: 'center', justifyContent: 'center', shadowColor: '#0184FF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 3 },
  resolutionActionText: { color: '#FFF', fontFamily: 'InriaSans_700Bold', fontSize: 18, lineHeight: 22 },
  detailSync: { position: 'absolute', left: 0, right: 0, top: 0 },
  completedIcon: { position: 'absolute', left: 128, top: 235, width: 157, height: 157, borderRadius: 79, backgroundColor: 'rgba(18,234,22,0.35)', alignItems: 'center', justifyContent: 'center' },
  completedMark: { color: '#0FA875', fontFamily: 'InriaSans_400Regular', fontSize: 82, lineHeight: 86, includeFontPadding: false },
  completedTitle: { position: 'absolute', left: 70, top: 404, width: 273, textAlign: 'center', color: '#253C96', fontFamily: 'InriaSans_700Bold', fontSize: 28, lineHeight: 34 },
  completedCopy: { position: 'absolute', left: 74, top: 446, width: 264, textAlign: 'center', color: 'rgba(29,47,64,0.58)', fontFamily: 'InriaSans_300Light', fontSize: 16, lineHeight: 19 },
  completedAction: { position: 'absolute', left: 28, top: 519, width: 357, height: 44, borderRadius: 12, backgroundColor: '#0184FF', alignItems: 'center', justifyContent: 'center', shadowColor: '#0184FF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 3 },
  completedActionText: { color: '#FFF', fontFamily: 'InriaSans_700Bold', fontSize: 18, lineHeight: 22 },
  primaryAction: { backgroundColor: '#0184FF', borderRadius: 12, alignItems: 'center', padding: 14 },
  primaryActionText: { color: '#FFF', fontFamily: 'InriaSans_700Bold', fontSize: 16 },
});
