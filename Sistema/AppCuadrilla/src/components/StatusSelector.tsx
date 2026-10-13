import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EstatusReporteLabels, EstatusReporteColors } from '../types';
import { getAllowedNextStatuses, type FieldStatus } from '../services/fieldUiPolicy';

interface StatusSelectorProps {
  currentEstatus: number;
  onChange: (estatus: FieldStatus) => void;
  hasResolutionEvidence: boolean;
  disabled?: boolean;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentEstatus,
  onChange,
  hasResolutionEvidence,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Estado actual: {EstatusReporteLabels[currentEstatus] || currentEstatus}</Text>
      <View style={styles.options}>
        {getAllowedNextStatuses(currentEstatus).map((estatus) => (
          <TouchableOpacity
            key={estatus}
            style={[
              styles.option,
              (disabled || (estatus === 5 && !hasResolutionEvidence)) && styles.optionDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || (estatus === 5 && !hasResolutionEvidence) }}
            onPress={() => onChange(estatus)}
            disabled={disabled || (estatus === 5 && !hasResolutionEvidence)}
          >
            <View
              style={[
                styles.colorIndicator,
                { backgroundColor: EstatusReporteColors[estatus] || '#64748B' },
              ]}
            />
            <Text
              style={[
                styles.optionText,
                disabled && styles.optionTextDisabled,
              ]}
            >
              {EstatusReporteLabels[estatus] || estatus}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {currentEstatus === 4 && !hasResolutionEvidence && (
        <Text style={styles.hint}>Guarda evidencia de resolución antes de completar el reporte.</Text>
      )}
      {getAllowedNextStatuses(currentEstatus).length === 0 && (
        <Text style={styles.hint}>No hay cambios de estado disponibles para la cuadrilla.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#19244E',
    marginBottom: 10,
  },
  options: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    minWidth: 100,
  },
  hint: { marginTop: 8, fontSize: 12, color: '#64748B' },
  optionDisabled: {
    opacity: 0.5,
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  optionTextDisabled: {
    color: '#94A3B8',
  },
});
