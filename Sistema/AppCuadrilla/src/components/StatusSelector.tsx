import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EstatusReporteLabels, EstatusReporteColors } from '../types';

type EstatusPermitido = 2 | 3 | 4 | 5; // Asignado, LevantandoInformacion, EnProceso, Completado

interface StatusSelectorProps {
  currentEstatus: number;
  onChange: (estatus: number) => void;
  disabled?: boolean;
}

const ESTATUS_OPCIONES: EstatusPermitido[] = [2, 3, 4, 5];

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentEstatus,
  onChange,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Estado del reporte</Text>
      <View style={styles.options}>
        {ESTATUS_OPCIONES.map((estatus) => (
          <TouchableOpacity
            key={estatus}
            style={[
              styles.option,
              currentEstatus === estatus && styles.optionSelected,
              disabled && styles.optionDisabled,
            ]}
            onPress={() => !disabled && onChange(estatus)}
            disabled={disabled}
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
                currentEstatus === estatus && styles.optionTextSelected,
                disabled && styles.optionTextDisabled,
              ]}
            >
              {EstatusReporteLabels[estatus] || estatus}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
  optionSelected: {
    borderColor: '#253C96',
    backgroundColor: '#EFF6FF',
  },
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
  optionTextSelected: {
    color: '#253C96',
    fontWeight: '700',
  },
  optionTextDisabled: {
    color: '#94A3B8',
  },
});