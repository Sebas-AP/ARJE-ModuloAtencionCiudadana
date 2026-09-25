import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, TIPO_PROBLEMA_LABELS } from '../constants';
import { useReportes } from '../hooks/useReportes';
import { ReporteDTO, EstatusReporte } from '../types';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ConsultaReportes'>;

export const ConsultaReportesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const initialContrato = route.params?.numeroContrato || '';
  const [contratoInput, setContratoInput] = useState(initialContrato);
  const [filtroContrato, setFiltroContrato] = useState(initialContrato);
  const [hasSearched, setHasSearched] = useState(initialContrato.length > 0);

  const { reportes, loading, error, refresh } = useReportes();

  const handleSearch = () => {
    setFiltroContrato(contratoInput.trim());
    setHasSearched(true);
  };

  const reportesFiltrados = useMemo(() => {
    if (!filtroContrato) return reportes;
    return reportes.filter((r) =>
      r.numeroContrato?.toLowerCase().includes(filtroContrato.toLowerCase()) ||
      `FOL-${r.id}`.toLowerCase().includes(filtroContrato.toLowerCase()) ||
      String(r.id) === filtroContrato
    );
  }, [reportes, filtroContrato]);

  const getStatusBadge = (estatus: EstatusReporte) => {
    switch (estatus) {
      case EstatusReporte.EnProceso:
      case EstatusReporte.Asignado:
        return {
          label: 'En Proceso',
          bg: COLORS.badgeEnProcesoBg,
          text: COLORS.badgeEnProcesoText,
        };
      case EstatusReporte.Completado:
      case EstatusReporte.Cerrado:
        return {
          label: 'Resuelto',
          bg: COLORS.badgeResueltoBg,
          text: COLORS.badgeResueltoText,
        };
      case EstatusReporte.Nuevo:
      case EstatusReporte.LevantandoInformacion:
      default:
        return {
          label: 'Pendiente',
          bg: COLORS.badgePendienteBg,
          text: COLORS.badgePendienteText,
        };
    }
  };

  const getTiempoEstimado = (estatus: EstatusReporte) => {
    switch (estatus) {
      case EstatusReporte.EnProceso:
        return '2 - 4 horas';
      case EstatusReporte.Asignado:
        return '4 - 8 horas';
      case EstatusReporte.Completado:
      case EstatusReporte.Cerrado:
        return 'Completado';
      default:
        return 'Por definir';
    }
  };

  const formatFecha = (isoString?: string) => {
    if (!isoString) return '26 Oct 2023';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const renderReportCard = (item: ReporteDTO) => {
    const badge = getStatusBadge(item.estatus);
    const tiempo = getTiempoEstimado(item.estatus);
    const folioStr = item.numeroContrato
      ? `FOL-${item.id}`
      : `FOL-${item.id}`;

    const tituloProblema =
      TIPO_PROBLEMA_LABELS[item.tipoProblema as keyof typeof TIPO_PROBLEMA_LABELS] ||
      item.descripcion.slice(0, 30) ||
      'Incidencia de agua';

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ReporteDetalle', { id: item.id })}
      >
        {/* Header de la tarjeta */}
        <View style={styles.cardHeader}>
          <View style={styles.folioRow}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color={COLORS.primary} />
            <Text style={styles.folioText}>{folioStr}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Título de la incidencia */}
        <Text style={styles.cardTitle}>{tituloProblema}</Text>

        {/* Fecha de registro */}
        <Text style={styles.dateText}>Fecha de registro: {formatFecha(item.fechaRecibido)}</Text>

        {/* Espera estimada */}
        <View style={styles.estimateRow}>
          <MaterialCommunityIcons name="clock-outline" size={15} color={COLORS.textSecondary} />
          <Text style={styles.estimateText}>
            Espera estimada: <Text style={styles.estimateValue}>{tiempo}</Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.electricBlue} />
      <View style={styles.container}>
        {/* Cabecera Azul de la Pantalla */}
        <View style={styles.blueHeaderSpacer} />

        {/* Contenedor Hoja Blanca Redondeada */}
        <View style={styles.sheetContainer}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refresh} colors={[COLORS.primary]} />
            }
          >
            {/* Barra superior de navegación interna */}
            <View style={styles.topNav}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.portalLabel}>Portal Ciudadano</Text>
            </View>

            {/* Título y subtítulo según Figma */}
            <Text style={styles.title}>Consultar reportes</Text>
            <Text style={styles.subtitle}>
              Introduce tu número de contrato para conocer el estatus actual de tus solicitudes de servicio.
            </Text>

            {/* Campo: Número de contrato */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Número de contrato <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <MaterialCommunityIcons name="pound" size={20} color={COLORS.primary} />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={contratoInput}
                  onChangeText={setContratoInput}
                  placeholder="123456"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="numeric"
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />
              </View>
            </View>

            {/* Botón Buscar reportes ➔ */}
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
              activeOpacity={0.88}
            >
              <Text style={styles.searchButtonText}>Buscar reportes</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={styles.searchArrow} />
            </TouchableOpacity>

            {/* Sección: Historial de reportes */}
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Historial de reportes</Text>
              <Text style={styles.historyCount}>
                {reportesFiltrados.length} encontrado{reportesFiltrados.length === 1 ? '' : 's'}
              </Text>
            </View>

            {/* Lista o estados vacío/cargando */}
            {loading && reportes.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando reportes...</Text>
              </View>
            ) : error ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={40} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={refresh}>
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : reportesFiltrados.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="file-document-outline" size={48} color={COLORS.textTertiary} />
                <Text style={styles.emptyTitle}>
                  {hasSearched ? 'No se encontraron reportes' : 'Sin reportes registrados'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {hasSearched
                    ? `No hay incidencias asociadas al contrato "${filtroContrato}".`
                    : 'Ingresa tu número de contrato arriba para consultar tus solicitudes.'}
                </Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {reportesFiltrados.map(renderReportCard)}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.electricBlue,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.electricBlue,
  },
  blueHeaderSpacer: {
    height: 16,
    backgroundColor: COLORS.electricBlue,
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
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
  portalLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  required: {
    color: COLORS.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.cyan, // Borde cyan de Figma
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  inputIconContainer: {
    marginRight: SPACING.sm,
  },
  textInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    height: '100%',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.actionBlue, // #017EF3
    height: 52,
    borderRadius: 16,
    marginBottom: SPACING.xl,
    shadowColor: COLORS.actionBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  searchArrow: {
    marginLeft: SPACING.xs,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  historyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textDark,
  },
  historyCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  cardsList: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  folioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  folioText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  estimateText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  estimateValue: {
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textDark,
  },
  loadingBox: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  emptyBox: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textDark,
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  retryButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});
