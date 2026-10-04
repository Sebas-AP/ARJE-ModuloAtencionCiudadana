import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { ReporteDTO, PrioridadReporte, EstatusReporteLabels, EstatusReporteColors } from '../types';

interface ReporteCardProps {
  reporte: ReporteDTO;
  onPress: () => void;
}

export const ReporteCard: React.FC<ReporteCardProps> = ({ reporte, onPress }) => {
  const prioridad = (reporte.prioridad || 'Media') as PrioridadReporte;
  const prioridadColor = {
    Critica: '#EF4444',
    Alta: '#F97316',
    Media: '#F59A1E',
    Baja: '#22C55E',
  }[prioridad] || '#F59A1E';

  const estatusLabel = EstatusReporteLabels[reporte.estatus] || String(reporte.estatus);
  const estatusColor = EstatusReporteColors[reporte.estatus] || '#64748B';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.folioContainer}>
          <Text style={styles.folioLabel}>Folio:</Text>
          <Text style={styles.folioValue}>{reporte.folio || `REP-${reporte.id}`}</Text>
        </View>
        <View style={[styles.prioridadBadge, { backgroundColor: prioridadColor }]}>
          <Text style={styles.prioridadText}>{prioridad}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.categoria}>{reporte.categoria || 'Sin categoría'}</Text>
        <Text style={styles.descripcion}>{reporte.descripcion}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.ubicacionRow}>
          <Text style={styles.ubicacionIcon}>📍</Text>
          <Text style={styles.ubicacionText} numberOfLines={1}>
            {reporte.direccion || 'Ubicación no disponible'}
          </Text>
        </View>
        <View style={[styles.estatusBadge, { backgroundColor: estatusColor }]}>
          <Text style={styles.estatusText}>{estatusLabel}</Text>
        </View>
      </View>

      {reporte.tiempoEstimado && (
        <View style={styles.tiempoContainer}>
          <Text style={styles.tiempoIcon}>⏱</Text>
          <Text style={styles.tiempoText}>{reporte.tiempoEstimado} min estimados</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  folioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  folioLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  folioValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#19244E',
  },
  prioridadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  prioridadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  body: {
    marginBottom: 12,
  },
  categoria: {
    fontSize: 15,
    fontWeight: '700',
    color: '#19244E',
    marginBottom: 4,
  },
  descripcion: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ubicacionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  ubicacionIcon: {
    fontSize: 12,
  },
  ubicacionText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  estatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  estatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tiempoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tiempoIcon: {
    fontSize: 13,
  },
  tiempoText: {
    fontSize: 12,
    color: '#F36B2E',
    fontWeight: '600',
  },
});