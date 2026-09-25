import React, { useEffect, useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Card, Button, StatusChip } from '../components';
import { useReporteDetalle } from '../hooks';
import { reportesService } from '../services/reportes';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TIPO_PROBLEMA_LABELS,
  TIPO_PROBLEMA_ICONS,
  TIPO_PROBLEMA_COLORS,
  ESTATUS_REPORTE_COLORS,
  ESTATUS_REPORTE_LABELS,
  ESTATUS_REPORTE_ICONS,
  TIPO_EVIDENCIA_LABELS,
} from '../constants';
import { EstatusReporte, SeguimientoUbicacionDTO } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ReporteDetalleRouteProp = RouteProp<RootStackParamList, 'ReporteDetalle'>;
type ReporteDetalleNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReporteDetalle'>;

export const ReporteDetalleScreen = () => {
  const route = useRoute<ReporteDetalleRouteProp>();
  const navigation = useNavigation<ReporteDetalleNavigationProp>();
  const { id } = route.params;
  const { reporte, loading, error, refetch } = useReporteDetalle(id);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderSeguimiento = ({ item }: { item: SeguimientoUbicacionDTO }) => (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDot} />
      <View style={styles.timelineContent}>
        <Text style={styles.timelineDate}>{new Date(item.fecha).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={styles.timelineText}>
          {item.cuadrilla?.nombre || 'Cuadrilla'} · {item.latitud.toFixed(6)}, {item.longitud.toFixed(6)}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.centerText}>Cargando reporte...</Text>
      </View>
    );
  }

  if (error || !reporte) {
    return (
      <View style={styles.centerBox}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.error} />
        <Text style={styles.centerText}>{error || 'No se pudo cargar el reporte'}</Text>
        <Button title="Reintentar" onPress={refetch} variant="outline" size="sm" />
      </View>
    );
  }

  const tipoColor = TIPO_PROBLEMA_COLORS[reporte.tipoProblema] || COLORS.primary;
  const estatusColor = ESTATUS_REPORTE_COLORS[reporte.estatus] || COLORS.textTertiary;
  const evidencias = reporte.evidencias || [];
  const seguimientos = reporte.seguimientosUbicacion;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerSection}>
        <View style={styles.headerCard}>
          <View style={[styles.headerIcon, { backgroundColor: tipoColor + '18' }]}>
            <MaterialCommunityIcons name={TIPO_PROBLEMA_ICONS[reporte.tipoProblema] as any} size={40} color={tipoColor} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{TIPO_PROBLEMA_LABELS[reporte.tipoProblema] || 'Reporte'}</Text>
            <Text style={styles.headerId}>Reporte #{reporte.id}</Text>
          </View>
        </View>

        <StatusChip
          status={ESTATUS_REPORTE_LABELS[reporte.estatus] || 'Sin estado'}
          label="Estatus"
          color={estatusColor}
          icon={<MaterialCommunityIcons name={ESTATUS_REPORTE_ICONS[reporte.estatus] as any} size={16} color={estatusColor} />}
        />

        <Card style={styles.card}>
          <Text style={styles.cardSectionTitle}>Descripción</Text>
          <Text style={styles.description}>{reporte.descripcion}</Text>

          <View style={styles.divider} />

          <Text style={styles.cardSectionTitle}>Ubicación</Text>
          <Text style={styles.coords}>{reporte.latitud.toFixed(6)}, {reporte.longitud.toFixed(6)}</Text>

          <View style={styles.divider} />

          <Text style={styles.cardSectionTitle}>Información</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha recibido</Text>
            <Text style={styles.infoValue}>{formatDate(reporte.fechaRecibido)}</Text>
          </View>
          {reporte.numeroContrato && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contrato</Text>
              <Text style={styles.infoValue}>{reporte.numeroContrato}</Text>
            </View>
          )}
          {reporte.nombreCiudadano && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ciudadano</Text>
              <Text style={styles.infoValue}>{reporte.nombreCiudadano}</Text>
            </View>
          )}
          {reporte.telefonoCiudadano && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{reporte.telefonoCiudadano}</Text>
            </View>
          )}
          {reporte.tiempoEstimado != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tiempo estimado</Text>
              <Text style={styles.infoValue}>{reporte.tiempoEstimado} min</Text>
            </View>
          )}
          {reporte.cuadrillaAsignada && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cuadrilla asignada</Text>
              <Text style={styles.infoValue}>{reporte.cuadrillaAsignada.nombre}</Text>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardSectionTitle}>Evidencias ({evidencias.length})</Text>
          {evidencias.length === 0 ? (
            <Text style={styles.emptyText}>Sin evidencias</Text>
          ) : (
            <View style={styles.evidenciaGrid}>
              {evidencias.map((ev) => (
                <View key={ev.id} style={styles.evidenciaItem}>
                  <Image source={{ uri: ev.archivoUrl }} style={styles.evidenciaImg} resizeMode="cover" />
                  <Text style={styles.evidenciaLabel}>{TIPO_EVIDENCIA_LABELS[ev.tipo] || 'Evidencia'}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardSectionTitle}>Seguimiento de cuadrilla</Text>
          {seguimientos.length === 0 ? (
            <Text style={styles.emptyText}>Sin seguimiento aún</Text>
          ) : (
            <View>
              {seguimientos.map((s) => renderSeguimiento({ item: s }))}
            </View>
          )}
        </Card>

        {reporte.estatus !== EstatusReporte.Cerrado && (
          <Button
            title="Nuevo reporte"
            onPress={() => navigation.navigate('CrearReporte')}
            variant="outline"
            fullWidth
            leftIcon={<MaterialCommunityIcons name="plus" size={20} color={COLORS.primary} />}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.md },
  headerSection: { gap: SPACING.md },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerIcon: { width: 72, height: 72, borderRadius: BORDER_RADIUS.xl, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, gap: 2 },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  headerId: { fontSize: FONT_SIZES.sm, color: COLORS.textTertiary },
  card: { padding: SPACING.md },
  cardSectionTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text, marginBottom: SPACING.sm },
  description: { fontSize: FONT_SIZES.md, color: COLORS.text, lineHeight: 24 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  coords: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, marginBottom: SPACING.sm },
  infoLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  infoValue: { fontSize: FONT_SIZES.sm, color: COLORS.text, fontWeight: FONT_WEIGHTS.medium, flexShrink: 1, textAlign: 'right' },
  evidenciaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  evidenciaItem: { width: 100 },
  evidenciaImg: { width: 100, height: 100, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceVariant },
  evidenciaLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textTertiary },
  timelineItem: { flexDirection: 'row', gap: SPACING.md, paddingLeft: SPACING.xs, paddingBottom: SPACING.md },
  timelineDot: { width: 12, height: 12, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.primary, marginTop: SPACING.xs },
  timelineContent: { flex: 1 },
  timelineDate: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, color: COLORS.text },
  timelineText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: SPACING.xl, gap: SPACING.md },
  centerText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center' },
});