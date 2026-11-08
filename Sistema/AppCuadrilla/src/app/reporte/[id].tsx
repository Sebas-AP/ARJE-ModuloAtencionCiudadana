import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, TextInput, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { reportesService } from '../../services/reportesService';
import { useLocation } from '../../hooks/useLocation';
import { EvidenciaUploader } from '../../components/EvidenciaUploader';
import { OpcionSelector } from '../../components/OpcionSelector';
import { SyncStatus } from '../../components/SyncStatus';
import { useFieldSync } from '../../hooks/useFieldSync';
import { getAllowedNextStatuses, getOperationFeedback, hasResolutionEvidence, operationFeedbackMessages, refreshReportAfterStatus, type FieldStatus } from '../../services/fieldUiPolicy';
import type { SyncResult } from '../../services/syncService';
import { MotivoEnProcesoLabels, MotivoResolucionLabels, ReporteDTO } from '../../types';
import { getReporteStatusVisual } from '../../services/reportesListModel';
import { APP_THEME } from '../../theme/appTheme';

const dateTime = (value?: string) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return { time: '--:--', elapsed: '—' };
  const date = new Date(value); const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  return { time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), elapsed: minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes}min` };
};
const dateLabel = (value?: string) => !value || Number.isNaN(new Date(value).getTime()) ? 'Fecha no disponible' : new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

const UNIDAD_TIEMPO_OPTIONS = [{ value: 1, label: 'Horas' }, { value: 2, label: 'Días' }];
const MOTIVO_EN_PROCESO_OTRO = 5;
const MOTIVO_RESOLUCION_OTRO = 6;
const MOTIVO_EN_PROCESO_OPTIONS = Object.entries(MotivoEnProcesoLabels).map(([value, label]) => ({ value: Number(value), label }));
const MOTIVO_RESOLUCION_OPTIONS = Object.entries(MotivoResolucionLabels).map(([value, label]) => ({ value: Number(value), label }));

export default function ReporteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reporteId = parseInt(id || '0', 10); const router = useRouter();
  const [reporte, setReporte] = React.useState<ReporteDTO | null>(null); const [loading, setLoading] = React.useState(true); const [guardando, setGuardando] = React.useState(false);
  const [statusNeedsRefresh, setStatusNeedsRefresh] = React.useState(false); const [resolviendo, setResolviendo] = React.useState(false); const [comentario, setComentario] = React.useState('');
  const [estimado, setEstimado] = React.useState(''); const [unidadEstimado, setUnidadEstimado] = React.useState(1);
  const [motivoEnProceso, setMotivoEnProceso] = React.useState<number | null>(null);
  const [motivoEnProcesoDetalle, setMotivoEnProcesoDetalle] = React.useState('');
  const [motivoResolucion, setMotivoResolucion] = React.useState<number | null>(null);
  const [ubicacionActual, setUbicacionActual] = React.useState<{ latitude: number; longitude: number } | null>(null); const [evidenceConfirmed, setEvidenceConfirmed] = React.useState(false);
  const sync = useFieldSync();
  const operationsRef = useRef(sync.operations);

  // Update ref when sync.operations changes
  useEffect(() => {
    operationsRef.current = sync.operations;
  }, [sync.operations]);

  const { location, obtenerUbicacionActual } = useLocation(reporteId, reporte?.estatus);
  const cargarReporte = useCallback(async () => {
    try {
      const data = await reportesService.getDetalle(reporteId);
      setReporte(data);
      setEstimado(data.tiempoEstimado ? String(data.tiempoEstimado) : '');
      setUnidadEstimado(data.tiempoEstimadoUnidad ?? 1);
      setMotivoEnProceso(data.motivoEnProceso ?? null);
      setMotivoEnProcesoDetalle(data.motivoEnProcesoDetalle ?? '');
      setMotivoResolucion(data.motivoResolucion ?? null);
      return true;
    }
    catch (error: unknown) { Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo cargar el reporte'); return false; }
    finally { setLoading(false); }
  }, [reporteId]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      await cargarReporte();
      if (mounted) {
        setEvidenceConfirmed(false);
        setStatusNeedsRefresh(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [cargarReporte]);

  const pendingStatus = sync.operations.some((operation) => operation.kind === 'status' && operation.reportId === reporteId);
  const pendingReportOperation = sync.operations.some((operation) => 'reportId' in operation && operation.reportId === reporteId);

  // Update statusNeedsRefresh when pendingStatus changes
  useEffect(() => {
    if (pendingStatus) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatusNeedsRefresh(true);
    }
  }, [pendingStatus]);

  // Auto-refresh when status operation completes
  useEffect(() => {
    if (!statusNeedsRefresh || guardando || sync.isLoading || sync.error || !sync.isOnline) return;
    let cancelled = false;
    refreshReportAfterStatus(reporteId, operationsRef.current, cargarReporte).then((refreshed) => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (refreshed && !cancelled) setStatusNeedsRefresh(false);
    });
    return () => { cancelled = true; };
  }, [pendingStatus, statusNeedsRefresh, guardando, sync.isLoading, sync.isSyncing, sync.error, sync.isOnline, reporteId, cargarReporte]);

  useEffect(() => {
    if (location) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUbicacionActual(location);
    }
  }, [location]);
  const resolutionReady = evidenceConfirmed || hasResolutionEvidence(reporteId, reporte?.evidencias ?? [], sync.operations);
  const pending = pendingReportOperation || statusNeedsRefresh || guardando || sync.isLoading || !!sync.error;
  const handleActualizarEstatus = async (
    nuevoEstatus: FieldStatus,
    extra?: { motivoEnProceso?: number; motivoEnProcesoDetalle?: string; motivoResolucion?: number; comentariosResolucion?: string }
  ) => {
    if (!reporte || pending || !getAllowedNextStatuses(reporte.estatus).includes(nuevoEstatus) || (nuevoEstatus === 5 && !resolutionReady)) return;
    setGuardando(true); setStatusNeedsRefresh(true);
    try {
      const result = await reportesService.actualizarEstatus(reporteId, { estatus: nuevoEstatus, ...extra });
      await sync.refresh();
      Alert.alert('Estado del reporte', operationFeedbackMessages[getOperationFeedback(result)]);
      setComentario('');
    }
    catch (error: unknown) { Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo guardar el estado'); }
    finally { setGuardando(false); }
  };
  const handleGuardarEstimado = async () => {
    const value = Number(estimado);
    const limite = unidadEstimado === 2 ? 30 : 240;
    if (!Number.isInteger(value) || value < 1 || value > limite) {
      Alert.alert('Tiempo estimado', `Ingresa un valor entre 1 y ${limite} ${unidadEstimado === 2 ? 'días' : 'horas'}.`);
      return;
    }
    if (pending) return; setGuardando(true);
    try { const result = await reportesService.actualizarTiempoEstimado(reporteId, value, unidadEstimado); await sync.refresh(); Alert.alert('Tiempo estimado', operationFeedbackMessages[getOperationFeedback(result)]); }
    catch (error: unknown) { Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo actualizar el tiempo estimado'); }
    finally { setGuardando(false); }
  };
  const handleGuardarMotivoProceso = async () => {
    if (pending || motivoEnProceso == null || (motivoEnProceso === MOTIVO_EN_PROCESO_OTRO && !motivoEnProcesoDetalle.trim())) return;
    setGuardando(true);
    try {
      const result = await reportesService.actualizarMotivoEnProceso(reporteId, motivoEnProceso, motivoEnProcesoDetalle);
      await sync.refresh();
      Alert.alert('Motivo del proceso', operationFeedbackMessages[getOperationFeedback(result)]);
    }
    catch (error: unknown) { Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo actualizar el motivo'); }
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
  if (reporte.estatus === 5 || reporte.estatus === 7) return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}><View style={styles.completeScreen}><View style={styles.completedIcon}><Text style={styles.completedMark}>✓</Text></View><Text style={styles.completedTitle}>{reporte.estatus === 7 ? 'Reporte cerrado' : '¡Reporte completado!'}</Text><Text style={styles.completedCopy}>{reporte.estatus === 7 ? `El reporte ${reporte.folio || `REP-${reporte.id}`} fue cerrado correctamente.` : `El reporte ${reporte.folio || `REP-${reporte.id}`} ha sido marcado como completado con éxito.`}</Text><TouchableOpacity accessibilityRole="button" style={[styles.primaryAction, styles.completeAction]} onPress={() => router.replace('/(tabs)')}><Text style={styles.primaryActionText}>Volver a reportes</Text></TouchableOpacity></View></SafeAreaView>;
  const folio = reporte.folio || `REP-${reporte.id}`; const statusVisual = getReporteStatusVisual(reporte.estatus); const timing = dateTime(reporte.fechaRecibido); const canUpdateEstimate = [2, 3, 4].includes(reporte.estatus); const canSetMotivoProceso = [3, 4].includes(reporte.estatus);
  const faltaMotivoProceso = reporte.estatus === 3 && (motivoEnProceso == null || (motivoEnProceso === MOTIVO_EN_PROCESO_OTRO && !motivoEnProcesoDetalle.trim()));
  const faltaMotivoResolucion = motivoResolucion == null || (motivoResolucion === MOTIVO_RESOLUCION_OTRO && !comentario.trim());
  return <SafeAreaView style={styles.screen} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.titleRow}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a reportes" style={styles.backButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color="#2200FF" /></TouchableOpacity><View><Text style={styles.pageTitle}>{resolviendo ? 'Completar reporte' : reporte.categoria || 'Reporte'}</Text><View style={styles.folioContainer}><Ionicons name="document-text-outline" size={16} color="#015FEB" /><Text style={styles.folio}>{folio}</Text></View></View></View>
    {!resolviendo && <View style={[styles.statusBadge, { backgroundColor: statusVisual.background }]}><Text style={[styles.statusBadgeText, { color: statusVisual.color }]}>{statusVisual.label}</Text></View>}
    {resolviendo ? <>
      <View style={styles.card}><Text style={styles.cardTitle}>{reporte.categoria || 'Reporte'}</Text><Text style={styles.muted}>Sector {reporte.direccion || '---'} · {dateLabel(reporte.fechaRecibido)}</Text></View>
      <View style={styles.card}>
        <OpcionSelector
          label="Motivo de la resolución"
          options={MOTIVO_RESOLUCION_OPTIONS}
          selected={motivoResolucion}
          onChange={setMotivoResolucion}
          disabled={pending}
          freeTextOptionValue={MOTIVO_RESOLUCION_OTRO}
          freeTextValue={comentario}
          onFreeTextChange={setComentario}
          freeTextPlaceholder="Describe cómo se resolvió el reporte"
        />
      </View>
      {reporte.estatus === 4 && <View style={styles.evidenceArea}><EvidenciaUploader idReporte={reporteId} onSuccess={handleEvidenciaExitosa} disabled={pending} /></View>}
      <Text style={styles.helperText}>{reporte.estatus === 4 ? 'Adjunta evidencia de resolución antes de completar el reporte.' : 'Completa la atención del reporte para habilitar la evidencia de resolución.'}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: pending || reporte.estatus !== 4 || !resolutionReady || faltaMotivoResolucion }} disabled={pending || reporte.estatus !== 4 || !resolutionReady || faltaMotivoResolucion} style={[styles.primaryAction, (pending || reporte.estatus !== 4 || !resolutionReady || faltaMotivoResolucion) && styles.disabledAction]} onPress={() => { void handleActualizarEstatus(5, { motivoResolucion: motivoResolucion!, comentariosResolucion: motivoResolucion === MOTIVO_RESOLUCION_OTRO ? comentario : undefined }); }}><Text style={styles.primaryActionText}>{guardando ? 'Guardando…' : 'Marcar como completado'}</Text></TouchableOpacity>
    </> : <>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Abrir mapa del reporte" style={styles.mapPreview} onPress={() => router.push({ pathname: '/(tabs)/mapa', params: { reporteId: String(reporteId) } })}><Ionicons name="map-outline" size={32} color="#64748B" /><Text style={styles.mapText}>Ver ubicación en el mapa</Text></TouchableOpacity>
      <View style={styles.card}><View style={styles.timeRow}><View><Text style={styles.timeTitle}>Hora de registro</Text><Text style={styles.muted}>{timing.time}</Text></View><View><Text style={styles.timeTitle}>Tiempo transcurrido</Text><Text style={styles.elapsedText}>{timing.elapsed}</Text></View></View></View>
      {(reporte.nombreCiudadano || reporte.telefonoCiudadano) && <View style={styles.card}><Text style={styles.cardTitle}>Datos de contacto</Text>
        {reporte.nombreCiudadano && <Text style={styles.descriptionText}>{reporte.nombreCiudadano}</Text>}
        {reporte.telefonoCiudadano && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Llamar a ${reporte.telefonoCiudadano}`} onPress={() => { void Linking.openURL(`tel:${reporte.telefonoCiudadano}`); }}><Text style={[styles.descriptionText, styles.phoneLink]}>{reporte.telefonoCiudadano}</Text></TouchableOpacity>}
      </View>}
      <View style={styles.card}><Text style={styles.cardTitle}>Descripción del reporte</Text><Text style={styles.descriptionText}>{reporte.descripcion || 'Sin descripción disponible.'}</Text><Text style={styles.muted}>Sector: {reporte.direccion || '---'} · {dateLabel(reporte.fechaRecibido)}</Text></View>
      {canUpdateEstimate && <View style={styles.card}><Text style={styles.cardTitle}>Tiempo estimado de reparación</Text><View style={styles.estimateRow}><TextInput value={estimado} onChangeText={setEstimado} keyboardType="number-pad" maxLength={4} placeholder={unidadEstimado === 2 ? 'Días' : 'Horas'} placeholderTextColor="#8FAFD9" accessibilityLabel="Tiempo estimado" style={styles.estimateInput} /><TouchableOpacity accessibilityRole="button" disabled={pending} onPress={() => { void handleGuardarEstimado(); }} style={[styles.secondaryAction, pending && styles.disabledAction]}><Text style={styles.secondaryActionText}>Guardar</Text></TouchableOpacity></View><View style={styles.unidadRow}><OpcionSelector label="Unidad" options={UNIDAD_TIEMPO_OPTIONS} selected={unidadEstimado} onChange={setUnidadEstimado} disabled={pending} /></View></View>}
      {canSetMotivoProceso && <View style={styles.card}>
        <OpcionSelector
          label="Motivo por el que el reporte está en proceso"
          options={MOTIVO_EN_PROCESO_OPTIONS}
          selected={motivoEnProceso}
          onChange={setMotivoEnProceso}
          disabled={pending}
          freeTextOptionValue={MOTIVO_EN_PROCESO_OTRO}
          freeTextValue={motivoEnProcesoDetalle}
          onFreeTextChange={setMotivoEnProcesoDetalle}
        />
        {reporte.estatus === 4 && <TouchableOpacity accessibilityRole="button" disabled={pending || motivoEnProceso == null || (motivoEnProceso === MOTIVO_EN_PROCESO_OTRO && !motivoEnProcesoDetalle.trim())} onPress={() => { void handleGuardarMotivoProceso(); }} style={[styles.secondaryAction, styles.guardarMotivoAction, (pending || motivoEnProceso == null) && styles.disabledAction]}><Text style={styles.secondaryActionText}>Guardar motivo</Text></TouchableOpacity>}
      </View>}
      {reporte.estatus === 6 ? <View style={styles.supervisionCard}><Text style={styles.cardTitle}>Validar supervisión</Text><Text style={styles.muted}>Confirma la reparación o recházala para que vuelva a estar en proceso.</Text><TextInput value={comentario} onChangeText={setComentario} maxLength={1000} multiline placeholder="Observaciones de supervisión (opcional)" placeholderTextColor="#8FAFD9" style={styles.supervisionInput} accessibilityLabel="Observaciones de supervisión" /><View style={styles.supervisionActions}><TouchableOpacity accessibilityRole="button" disabled={pending} onPress={() => { void handleResolverSupervision(false); }} style={[styles.rejectAction, pending && styles.disabledAction]}><Text style={styles.rejectText}>Rechazar y reabrir</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" disabled={pending} onPress={() => { void handleResolverSupervision(true); }} style={[styles.primaryAction, styles.compactAction, pending && styles.disabledAction]}><Text style={styles.primaryActionText}>Confirmar supervisión</Text></TouchableOpacity></View></View> : <>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={ubicacionActual ? `Ubicación marcada ${ubicacionActual.latitude.toFixed(4)}, ${ubicacionActual.longitude.toFixed(4)}` : 'Marcar ubicación'} accessibilityState={{ disabled: guardando }} disabled={guardando} style={styles.locationButton} onPress={() => { void obtenerUbicacionActual(); }}><Ionicons name="location-outline" size={22} color="#2200FF" /><Text style={styles.locationButtonText}>Marcar ubicación</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: pending || !getAllowedNextStatuses(reporte.estatus).length || faltaMotivoProceso }} disabled={pending || !getAllowedNextStatuses(reporte.estatus).length || faltaMotivoProceso} style={[styles.primaryAction, (pending || !getAllowedNextStatuses(reporte.estatus).length || faltaMotivoProceso) && styles.disabledAction]} onPress={() => {
          if (reporte.estatus === 4) { setResolviendo(true); return; }
          const next = getAllowedNextStatuses(reporte.estatus)[0];
          if (!next) return;
          if (next === 4) {
            if (motivoEnProceso == null) return;
            void handleActualizarEstatus(4, { motivoEnProceso, motivoEnProcesoDetalle: motivoEnProceso === MOTIVO_EN_PROCESO_OTRO ? motivoEnProcesoDetalle : undefined });
          } else {
            void handleActualizarEstatus(next);
          }
        }}><Text style={styles.primaryActionText}>{guardando ? 'Guardando…' : reporte.estatus === 4 ? 'Completar reporte' : 'Atender reporte'}</Text></TouchableOpacity>
      </>}
    </>}
    {(sync.pendingCount > 0 || sync.failedCount > 0 || sync.requiresAuthentication || sync.error) && <SyncStatus {...sync} onRetry={() => { void sync.syncNow(); }} />}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F2F2' }, loadingContainer: { flex: 1, backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center', gap: 12 }, loadingText: { color: APP_THEME.colors.muted, fontSize: 16, fontFamily: 'InriaSans_400Regular' }, errorScreen: { flex: 1, padding: 24, gap: 20, justifyContent: 'center' }, bodyCopy: { color: APP_THEME.colors.ink, fontFamily: 'InriaSans_400Regular', fontSize: 15, lineHeight: 22 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40, gap: 16 }, titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: 1 }, pageTitle: { fontFamily: 'InriaSans_700Bold', fontSize: 24, lineHeight: 29, color: APP_THEME.colors.royal }, folioContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }, folio: { color: '#015FEB', fontFamily: 'InriaSans_700Bold', fontSize: 14 }, statusBadge: { alignSelf: 'flex-start', borderRadius: APP_THEME.radius.pill, paddingHorizontal: 11, paddingVertical: 5, marginLeft: 40 }, statusBadgeText: { fontFamily: 'InriaSans_700Bold', fontSize: 12 },
  mapPreview: { minHeight: 231, marginHorizontal: -18, borderRadius: 0, backgroundColor: '#D9D9D9', alignItems: 'center', justifyContent: 'center', gap: 8 }, mapText: { color: APP_THEME.colors.ink, fontFamily: 'InriaSans_700Bold', fontSize: 15 }, card: { padding: 15, gap: 10, borderWidth: 1, borderColor: APP_THEME.colors.border, borderRadius: APP_THEME.radius.card, backgroundColor: APP_THEME.colors.surface }, timeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 20 }, timeTitle: { fontFamily: 'InriaSans_700Bold', fontSize: 16, color: APP_THEME.colors.ink }, elapsedText: { fontFamily: 'InriaSans_700Bold', fontSize: 16, color: APP_THEME.colors.primary, marginTop: 7 }, muted: { fontFamily: 'InriaSans_400Regular', fontSize: 14, lineHeight: 20, color: APP_THEME.colors.muted, marginTop: 5 }, cardTitle: { fontFamily: 'InriaSans_700Bold', fontSize: 16, lineHeight: 20, color: APP_THEME.colors.ink }, descriptionText: { fontFamily: 'InriaSans_400Regular', fontSize: 15, lineHeight: 21, color: APP_THEME.colors.ink },
  phoneLink: { color: APP_THEME.colors.primary, fontFamily: 'InriaSans_700Bold', textDecorationLine: 'underline' },
  estimateRow: { flexDirection: 'row', gap: 10, alignItems: 'center' }, estimateInput: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: '#9CA3AF', borderRadius: APP_THEME.radius.input, paddingHorizontal: 12, color: APP_THEME.colors.ink, fontFamily: 'InriaSans_400Regular', fontSize: 16, backgroundColor: '#FFF' }, secondaryAction: { minHeight: 44, borderRadius: APP_THEME.radius.button, paddingHorizontal: 16, backgroundColor: '#E8F1FF', justifyContent: 'center' }, secondaryActionText: { color: APP_THEME.colors.royal, fontFamily: 'InriaSans_700Bold', fontSize: 14, textAlign: 'center' },
  unidadRow: { marginTop: 2 }, guardarMotivoAction: { alignSelf: 'flex-start', paddingHorizontal: 20 },
  locationButton: { minHeight: 48, borderRadius: APP_THEME.radius.button, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: APP_THEME.colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 2 }, locationButtonText: { color: '#2200FF', fontFamily: 'InriaSans_700Bold', fontSize: 17 }, primaryAction: { minHeight: 44, borderRadius: 12, backgroundColor: APP_THEME.colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: APP_THEME.colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 3, paddingHorizontal: 16 }, primaryActionText: { color: '#FFF', fontFamily: 'InriaSans_700Bold', fontSize: 16, textAlign: 'center' }, disabledAction: { opacity: 0.5 },
  evidenceArea: { alignItems: 'center' }, helperText: { textAlign: 'center', color: APP_THEME.colors.muted, fontFamily: 'InriaSans_400Regular', fontSize: 13, lineHeight: 18 },
  supervisionCard: { padding: 15, gap: 12, borderRadius: APP_THEME.radius.card, backgroundColor: '#FFF7E6', borderWidth: 1, borderColor: '#F5C26B' }, supervisionInput: { minHeight: 82, borderWidth: 1, borderColor: '#E0B25E', borderRadius: APP_THEME.radius.input, backgroundColor: '#FFF', padding: 10, color: APP_THEME.colors.ink, fontFamily: 'InriaSans_400Regular', fontSize: 14 }, supervisionActions: { gap: 10 }, rejectAction: { minHeight: 46, borderWidth: 1, borderColor: '#B45309', borderRadius: APP_THEME.radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, rejectText: { color: '#B45309', fontFamily: 'InriaSans_700Bold', fontSize: 15 }, compactAction: { minHeight: 46 },
  completeScreen: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 211 }, completedIcon: { width: 157, height: 157, borderRadius: 78.5, backgroundColor: 'rgba(18,234,22,0.24)', alignItems: 'center', justifyContent: 'center' }, completedMark: { color: '#0FA875', fontFamily: 'InriaSans_400Regular', fontSize: 84 }, completedTitle: { textAlign: 'center', color: APP_THEME.colors.royal, fontFamily: 'InriaSans_700Bold', fontSize: 24, lineHeight: 29, marginTop: 12 }, completedCopy: { textAlign: 'center', color: APP_THEME.colors.muted, fontFamily: 'InriaSans_400Regular', fontSize: 16, lineHeight: 22, marginTop: 10, maxWidth: 264 }, completeAction: { width: '100%', maxWidth: 357, marginTop: 22 },
});
