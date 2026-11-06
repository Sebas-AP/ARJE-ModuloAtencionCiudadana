import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useReportePublicoDetalle } from '../hooks/useReportes';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TIPO_PROBLEMA_LABELS,
  TIPO_EVIDENCIA_LABELS,
} from '../constants';
import { EstatusReporte, EvidenciaPublicoDTO } from '../types';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import ReporteLocationMap from '../components/ReporteLocationMap';
import { isValidReportCoordinate } from '../services/reportLocationModel';

type ReporteDetalleRouteProp = RouteProp<RootStackParamList, 'ReporteDetalle'>;
type ReporteDetalleNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReporteDetalle'>;

const getStatusBadge = (estatus: EstatusReporte) => {
  switch (estatus) {
    case EstatusReporte.EnProceso:
    case EstatusReporte.Asignado:
      return { label: 'En Proceso', bg: COLORS.badgeEnProcesoBg, text: COLORS.badgeEnProcesoText };
    case EstatusReporte.Completado:
    case EstatusReporte.Cerrado:
      return { label: 'Resuelto', bg: COLORS.badgeResueltoBg, text: COLORS.badgeResueltoText };
    case EstatusReporte.Nuevo:
    case EstatusReporte.LevantandoInformacion:
    default:
      return { label: 'Pendiente', bg: COLORS.badgePendienteBg, text: COLORS.badgePendienteText };
  }
};

const Shell = ({ onBack, children }: { onBack: () => void; children: React.ReactNode }) => (
  <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="light-content" backgroundColor={COLORS.electricBlue} />
    <View style={styles.container}>
      <View style={styles.blueHeaderSpacer} />
      <View style={styles.sheetContainer}>
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.portalLabel}>Portal Ciudadano</Text>
        </View>
        {children}
      </View>
    </View>
  </SafeAreaView>
);

export const ReporteDetalleScreen = () => {
  const route = useRoute<ReporteDetalleRouteProp>();
  const navigation = useNavigation<ReporteDetalleNavigationProp>();
  const { id, numeroContrato } = route.params;
  const { reporte, loading, error, refetch } = useReportePublicoDetalle();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (id && numeroContrato) {
      refetch(id, numeroContrato);
    }
  }, [id, numeroContrato, refetch]);

  const goBack = () => navigation.goBack();

  if (loading) {
    return (
      <Shell onBack={goBack}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centerText}>Cargando reporte...</Text>
        </View>
      </Shell>
    );
  }

  if (error || !reporte) {
    return (
      <Shell onBack={goBack}>
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.centerText}>{error || 'No se pudo cargar el reporte'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => id && numeroContrato && refetch(id, numeroContrato)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </Shell>
    );
  }

  const badge = getStatusBadge(reporte.estatus);
  const evidencias = reporte.evidencias || [];

  return (
    <Shell onBack={goBack}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{TIPO_PROBLEMA_LABELS[reporte.tipoProblema] || 'Reporte'}</Text>

        <View style={styles.folioBadgeRow}>
          <View style={styles.folioRow}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color={COLORS.primary} />
            <Text style={styles.folioText}>{reporte.folio}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoCardCol}>
            <View style={styles.infoCardHeaderRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoCardLabel}>Fecha de registro</Text>
            </View>
            <Text style={styles.infoCardValue}>{formatDate(reporte.fechaRecibido)}</Text>
          </View>
          {reporte.tiempoEstimado != null && (
            <View style={styles.infoCardCol}>
              <Text style={[styles.infoCardLabel, styles.infoCardLabelRight]}>Tiempo estimado</Text>
              <Text style={[styles.infoCardValue, styles.infoCardValueAccent]}>{reporte.tiempoEstimado} min</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Descripción del reporte</Text>
          <Text style={styles.description}>{reporte.descripcion}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ubicación</Text>
          <Text style={styles.coords}>{reporte.latitud.toFixed(6)}, {reporte.longitud.toFixed(6)}</Text>
          {isValidReportCoordinate({ latitud: reporte.latitud, longitud: reporte.longitud }) ? (
            <View style={styles.locationMap}>
              <ReporteLocationMap coordinate={{ latitud: reporte.latitud, longitud: reporte.longitud }} editable={false} />
            </View>
          ) : (
            <Text style={styles.emptyText}>Ubicación no disponible</Text>
          )}
        </View>

        {(reporte.numeroContrato || reporte.nombreCiudadano) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información</Text>
            {reporte.numeroContrato && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>No. contrato</Text>
                <Text style={styles.infoValue}>{reporte.numeroContrato}</Text>
              </View>
            )}
            {reporte.nombreCiudadano && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nombre</Text>
                <Text style={styles.infoValue}>{reporte.nombreCiudadano}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Evidencias ({evidencias.length})</Text>
          {evidencias.length === 0 ? (
            <Text style={styles.emptyText}>Sin evidencias</Text>
          ) : (
            <View style={styles.evidenciaGrid}>
              {evidencias.map((ev: EvidenciaPublicoDTO) => (
                <View key={ev.id} style={styles.evidenciaItem}>
                  <Image source={{ uri: ev.archivoUrl }} style={styles.evidenciaImg} resizeMode="cover" />
                  <Text style={styles.evidenciaLabel}>{TIPO_EVIDENCIA_LABELS[ev.tipo] || 'Evidencia'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Seguimiento de cuadrilla</Text>
          <Text style={styles.emptyText}>No disponible en consulta pública</Text>
        </View>

        {reporte.estatus !== EstatusReporte.Cerrado && (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('CrearReporte')}
            activeOpacity={0.88}
          >
            <MaterialCommunityIcons name="plus" size={20} color={COLORS.white} />
            <Text style={styles.ctaButtonText}>Nuevo reporte</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Shell>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.electricBlue },
  container: { flex: 1, backgroundColor: COLORS.electricBlue },
  blueHeaderSpacer: { height: 16, backgroundColor: COLORS.electricBlue },
  sheetContainer: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  portalLabel: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.md },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.primary },
  folioBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  folioRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  folioText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: FONT_WEIGHTS.semibold },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  infoCardCol: { gap: 4 },
  infoCardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoCardLabel: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textDark },
  infoCardLabelRight: { textAlign: 'right' },
  infoCardValue: { fontSize: FONT_SIZES.sm, color: COLORS.textTertiary },
  infoCardValueAccent: { color: COLORS.primary, fontWeight: FONT_WEIGHTS.bold, textAlign: 'right' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textDark, marginBottom: SPACING.sm },
  description: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 22 },
  coords: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  locationMap: { marginTop: SPACING.sm, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, marginBottom: SPACING.sm },
  infoLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  infoValue: { fontSize: FONT_SIZES.sm, color: COLORS.textDark, fontWeight: FONT_WEIGHTS.medium, flexShrink: 1, textAlign: 'right' },
  evidenciaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  evidenciaItem: { width: 100 },
  evidenciaImg: { width: 100, height: 100, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceVariant },
  evidenciaLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textTertiary },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.actionBlue,
    height: 52,
    borderRadius: 16,
    shadowColor: COLORS.actionBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaButtonText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  centerText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center' },
  retryButton: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  retryButtonText: { color: COLORS.primary, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold },
});
