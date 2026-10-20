import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReporteDTO } from '../types';
import { toReporteCardModel, getReporteStatusVisual } from '../services/reportesListModel';
import { APP_THEME } from '../theme/appTheme';

interface ReporteCardProps {
  reporte: ReporteDTO;
  onPress: () => void;
}

export const ReporteCard: React.FC<ReporteCardProps> = ({ reporte, onPress }) => {
  const model = toReporteCardModel(reporte);
  const status = getReporteStatusVisual(reporte.estatus);

  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${model.folio}, ${status.label}, ${model.category}, ${model.date}`} style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.folioContainer}>
          <Ionicons name="document-text-outline" size={16} color="#015FEB" />
          <Text numberOfLines={1} style={styles.folioValue}>{model.folio}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.category}>{model.category}</Text>
        <Text numberOfLines={1} style={styles.date}>Fecha de registro: {model.date}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { width: '100%', minHeight: 127, padding: 15, gap: 12, backgroundColor: APP_THEME.colors.surface, borderWidth: 1, borderColor: APP_THEME.colors.border, borderRadius: APP_THEME.radius.card },
  header: { minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  folioContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  folioValue: { fontFamily: 'InriaSans_700Bold', fontSize: 14, lineHeight: 17, color: '#015FEB' },
  statusBadge: { minHeight: 22, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontFamily: 'InriaSans_700Bold', fontSize: 12, lineHeight: 14 },
  divider: { height: 1, backgroundColor: '#E5E7EB' },
  details: { gap: 6 },
  category: { fontFamily: 'InriaSans_700Bold', fontSize: 16, lineHeight: 19, color: '#1D1B20' },
  date: { fontFamily: 'InriaSans_400Regular', fontSize: 13, lineHeight: 16, color: '#6B7280' },
});
