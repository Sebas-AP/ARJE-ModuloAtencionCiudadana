import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { reportesService } from '../../services/reportesService';
import { useLocation } from '../../hooks/useLocation';
import { StatusSelector } from '../../components/StatusSelector';
import { EvidenciaUploader } from '../../components/EvidenciaUploader';
import { SyncStatus } from '../../components/SyncStatus';
import { useFieldSync } from '../../hooks/useFieldSync';
import { getAllowedNextStatuses, getOperationFeedback, hasResolutionEvidence, operationFeedbackMessages, refreshReportAfterStatus, type FieldStatus } from '../../services/fieldUiPolicy';
import type { SyncResult } from '../../services/syncService';
import { ReporteDTO, EstatusReporteLabels, EstatusReporteColors, PrioridadColors } from '../../types';
import { APP_THEME } from '../../theme/appTheme';

export default function ReporteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reporteId = parseInt(id || '0', 10);
  const router = useRouter();

  const [reporte, setReporte] = useState<ReporteDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [statusNeedsRefresh, setStatusNeedsRefresh] = useState(false);
  const [ubicacionActual, setUbicacionActual] = useState<{ latitude: number; longitude: number } | null>(null);
  const [evidenceConfirmed, setEvidenceConfirmed] = useState(false);
  const sync = useFieldSync();
  const operationsRef = useRef(sync.operations);
  operationsRef.current = sync.operations;

  const { location, obtenerUbicacionActual, iniciarSeguimiento, detenerSeguimiento, tracking, canTrack } = useLocation(reporteId, reporte?.estatus);

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
    // Reconcile on this report's queue changes, not each unrelated three-second queue snapshot.
    void refreshReportAfterStatus(reporteId, operationsRef.current, cargarReporte).then((refreshed) => {
      if (refreshed && !cancelled) setStatusNeedsRefresh(false);
    });
    return () => { cancelled = true; };
  }, [pendingStatus, statusNeedsRefresh, guardando, sync.isLoading, sync.isSyncing, sync.error, sync.isOnline, reporteId, cargarReporte]);

  useEffect(() => {
    if (location) {
      setUbicacionActual(location);
    }
  }, [location]);

  const resolutionReady = evidenceConfirmed || hasResolutionEvidence(reporteId, reporte?.evidencias ?? [], sync.operations);

  const handleActualizarEstatus = async (nuevoEstatus: FieldStatus) => {
    if (!reporte || guardando || pendingStatus || statusNeedsRefresh || sync.isLoading || sync.error
      || !getAllowedNextStatuses(reporte.estatus).includes(nuevoEstatus)
      || (nuevoEstatus === 5 && !resolutionReady)) return;

    setGuardando(true);
    setStatusNeedsRefresh(true);
    try {
      const data = { estatus: nuevoEstatus };

      const result = await reportesService.actualizarEstatus(reporteId, data);
      await sync.refresh();
      Alert.alert('Estado del reporte', operationFeedbackMessages[getOperationFeedback(result)]);
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo guardar el estado');
    } finally {
      setGuardando(false);
    }
  };

  const toggleSeguimiento = async () => {
    if (tracking) {
      await detenerSeguimiento();
    } else {
      try {
        await iniciarSeguimiento();
      } catch (error: unknown) {
        Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo iniciar el seguimiento');
      }
    }
  };

  const handleEvidenciaExitosa = (result: SyncResult) => {
    void sync.refresh();
    if (getOperationFeedback(result) === 'synced') {
      setEvidenceConfirmed(true);
    }
    if (sync.isOnline) void cargarReporte();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#253C96" />
        <Text style={styles.loadingText}>Cargando reporte...</Text>
      </View>
    );
  }

  if (!reporte) {
    return (
      <View style={styles.container}>
        <SyncStatus {...sync} onRetry={() => { void sync.syncNow(); }} />
        <View style={styles.section}>
          <Text style={styles.infoValue}>No se pudo cargar el reporte. Necesitas conexión para consultar el detalle.</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.seguimientoButton} onPress={() => { void cargarReporte(); }}>
            <Text style={styles.seguimientoButtonText}>Reintentar carga</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const prioridad = (reporte.prioridad || 'Media') as keyof typeof PrioridadColors;
  const prioridadColor = PrioridadColors[prioridad] || '#F59A1E';
  const estatusLabel = EstatusReporteLabels[reporte.estatus] || String(reporte.estatus);
  const estatusColor = EstatusReporteColors[reporte.estatus] || '#64748B';

  if (reporte.estatus === 5) {
    return <View style={styles.completedScreen}>
      <View style={styles.completedIcon}><Text style={styles.completedMark}>✓</Text></View>
      <Text style={styles.completedTitle}>Reporte completado</Text>
      <Text style={styles.completedCopy}>La evidencia y el cambio de estado se guardaron para su sincronización.</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.primaryAction} onPress={() => router.replace('/(tabs)')}><Text style={styles.primaryActionText}>Volver a reportes</Text></TouchableOpacity>
    </View>;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SyncStatus {...sync} onRetry={() => { void sync.syncNow(); }} />
        {/* Header del reporte */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.folioContainer}>
              <Text style={styles.folioLabel}>FOLIO</Text>
              <Text style={styles.folioValue}>{reporte.folio || `REP-${reporte.id}`}</Text>
            </View>
            <View style={[styles.prioridadBadge, { backgroundColor: prioridadColor }]}>
              <Text style={styles.prioridadText}>{prioridad}</Text>
            </View>
          </View>

          <View style={styles.estatusContainer}>
            <View style={[styles.estatusBadge, { backgroundColor: estatusColor }]}>
              <Text style={styles.estatusText}>{estatusLabel}</Text>
            </View>
          </View>
        </View>

        {/* Categoría y descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del reporte</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Categoría:</Text>
            <Text style={styles.infoValue}>{reporte.categoria || 'Sin clasificar'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Descripción:</Text>
            <Text style={styles.infoValue}>{reporte.descripcion}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ubicación:</Text>
            <Text style={styles.infoValue}>{reporte.direccion || 'No registrada'}</Text>
          </View>

          {reporte.tiempoEstimado && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tiempo estimado:</Text>
              <Text style={styles.infoValue}>{reporte.tiempoEstimado} minutos</Text>
            </View>
          )}
        </View>

        {/* Coordenadas y mapa */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coordenadas</Text>
          
          <View style={styles.coordsContainer}>
            <View style={styles.coordItem}>
              <Text style={styles.coordLabel}>Latitud</Text>
              <Text style={styles.coordValue}>{reporte.latitud.toFixed(6)}</Text>
            </View>
            <View style={styles.coordItem}>
              <Text style={styles.coordLabel}>Longitud</Text>
              <Text style={styles.coordValue}>{reporte.longitud.toFixed(6)}</Text>
            </View>
          </View>

          {ubicacionActual && (
            <View style={styles.ubicacionActual}>
              <Text style={styles.ubicacionActualLabel}>Tu ubicación actual:</Text>
              <Text style={styles.ubicacionActualCoords}>
                {ubicacionActual.latitude.toFixed(6)}, {ubicacionActual.longitude.toFixed(6)}
              </Text>
            </View>
          )}
        </View>

        {/* Selector de estado */}
        <View style={styles.section}>
          <StatusSelector
            currentEstatus={reporte.estatus}
            onChange={handleActualizarEstatus}
            hasResolutionEvidence={resolutionReady}
            disabled={guardando || pendingStatus || statusNeedsRefresh || sync.isLoading || !!sync.error}
          />
          {pendingStatus && <Text style={styles.infoValue}>Hay un cambio de estado pendiente o rechazado. Sincroniza y revisa el resultado antes de continuar.</Text>}
          {statusNeedsRefresh && !pendingStatus && <Text style={styles.infoValue}>Esperando confirmar el estado del reporte con el servidor antes de continuar.</Text>}
        </View>

        {/* Evidencias existentes */}
        {reporte.evidencias && reporte.evidencias.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidencias ({reporte.evidencias.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.evidenciasList}>
              {reporte.evidencias.map((ev, index) => (
                <View key={ev.id || index} style={styles.evidenciaItem}>
                  <Image
                    source={{ uri: ev.archivoUrl }}
                    style={styles.evidenciaImage}
                  />
                  <Text style={styles.evidenciaTipo}>
                    {ev.tipo === 1 ? 'Inicial' : 'Resolución'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Subida de evidencia de resolución */}
        {reporte.estatus === 4 || reporte.estatus === 5 ? (
          <View style={styles.section}>
            <EvidenciaUploader
              idReporte={reporteId}
              onSuccess={handleEvidenciaExitosa}
              disabled={guardando}
            />
          </View>
        ) : null}

        {/* Botón de seguimiento GPS */}
        <View style={styles.section}>
          <TouchableOpacity accessibilityRole="button" style={styles.locationButton} onPress={() => { void obtenerUbicacionActual(); }} disabled={guardando}>
            <Text style={styles.locationButtonText}>Marcar ubicación</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.seguimientoButton,
              tracking && styles.seguimientoButtonActive,
            ]}
            onPress={toggleSeguimiento}
            disabled={guardando || !canTrack}
          >
            <Text style={[
              styles.seguimientoButtonText,
              tracking && styles.seguimientoButtonTextActive,
            ]}>
              {tracking ? '⏹ Detener seguimiento GPS' : '▶ Iniciar seguimiento GPS'}
            </Text>
            {tracking && <Text style={styles.seguimientoIndicator}>● EN VIVO</Text>}
          </TouchableOpacity>
          
          <Text style={styles.seguimientoHint}>
            {canTrack
              ? 'Envía tu ubicación al servidor cada 5 minutos mientras atiendes el reporte.'
              : 'El seguimiento GPS sólo está disponible durante levantamiento o mientras el reporte está en proceso.'}
          </Text>
        </View>

        {/* Información del ciudadano */}
        {reporte.nombreCiudadano && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Datos del ciudadano</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre:</Text>
              <Text style={styles.infoValue}>{reporte.nombreCiudadano}</Text>
            </View>
            {reporte.telefonoCiudadano && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Teléfono:</Text>
                <Text style={styles.infoValue}>{reporte.telefonoCiudadano}</Text>
              </View>
            )}
            {reporte.numeroContrato && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contrato:</Text>
                <Text style={styles.infoValue}>{reporte.numeroContrato}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    backgroundColor: APP_THEME.colors.surface,
    borderWidth: 1,
    borderColor: APP_THEME.colors.border,
    borderRadius: APP_THEME.radius.card,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#015FEB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  folioContainer: {
    gap: 4,
  },
  folioLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_THEME.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  folioValue: {
    fontSize: 22,
    fontWeight: '800',
    color: APP_THEME.colors.royal,
    letterSpacing: 1,
  },
  prioridadBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  prioridadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  estatusContainer: {
    alignSelf: 'flex-start',
  },
  estatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
  },
  estatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#19244E',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    minWidth: 100,
  },
  infoValue: {
    fontSize: 13,
    color: '#19244E',
    flex: 1,
  },
  coordsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  coordItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  coordLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  coordValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#19244E',
    fontFamily: 'monospace',
  },
  ubicacionActual: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  ubicacionActualLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  ubicacionActualCoords: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    fontFamily: 'monospace',
  },
  evidenciasList: {
    gap: 10,
    paddingBottom: 4,
  },
  evidenciaItem: {
    width: 120,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  evidenciaImage: {
    width: 120,
    height: 90,
  },
  evidenciaTipo: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    padding: 6,
    backgroundColor: '#F8FAFC',
  },
  seguimientoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#F36B2E',
  },
  seguimientoButtonActive: {
    backgroundColor: '#253C96',
    borderColor: '#253C96',
  },
  seguimientoButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F36B2E',
  },
  seguimientoButtonTextActive: {
    color: '#FFFFFF',
  },
  seguimientoIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
  },
  seguimientoHint: {
    fontSize: 11,
    color: '#9A3412',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  locationButton: { paddingVertical: 13, borderRadius: 12, borderWidth: 2, borderColor: APP_THEME.colors.primary, alignItems: 'center', marginBottom: 10, backgroundColor: '#FFF' },
  locationButtonText: { color: APP_THEME.colors.primary, fontWeight: '700', fontSize: 16 },
  completedScreen: { flex: 1, backgroundColor: APP_THEME.colors.canvas, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 18 },
  completedIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D1FAE5' },
  completedMark: { color: '#10B981', fontSize: 54, fontWeight: '800' },
  completedTitle: { color: APP_THEME.colors.royal, fontSize: 26, fontWeight: '800' },
  completedCopy: { color: APP_THEME.colors.muted, textAlign: 'center', lineHeight: 22 },
  primaryAction: { backgroundColor: APP_THEME.colors.primary, borderRadius: APP_THEME.radius.button, paddingVertical: 14, paddingHorizontal: 28, marginTop: 14 },
  primaryActionText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
