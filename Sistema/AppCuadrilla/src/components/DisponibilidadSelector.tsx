import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { canSelectAvailable, type Availability } from '../services/fieldUiPolicy';
import { APP_THEME } from '../theme/appTheme';

interface DisponibilidadSelectorProps {
  currentAvailability: number;
  activeReportCount: number | null;
  disabled?: boolean;
  onChange: (availability: Availability) => void;
}

const options: { value: Availability; label: string }[] = [
  { value: 1, label: 'Disponible' },
  { value: 2, label: 'Ocupada' },
  { value: 3, label: 'Fuera de servicio' },
];

export const DisponibilidadSelector: React.FC<DisponibilidadSelectorProps> = ({
  currentAvailability, activeReportCount, disabled = false, onChange,
}) => (
  <View style={styles.container}>
    <Text style={styles.label}>Disponibilidad de la cuadrilla</Text>
    <View style={styles.options}>
      {options.map(({ value, label }) => {
        const unavailable = disabled || value === currentAvailability || (value === 1 && !canSelectAvailable(activeReportCount));
        return (
          <TouchableOpacity
            key={value}
            accessibilityRole="button"
            accessibilityState={{ disabled: unavailable, selected: value === currentAvailability }}
            disabled={unavailable}
            onPress={() => onChange(value)}
            style={[styles.option, value === currentAvailability && styles.selected, unavailable && styles.disabled]}
          >
            <Text style={styles.text}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
    {!canSelectAvailable(activeReportCount) && <Text style={styles.hint}>
      {activeReportCount === null ? 'Actualiza los reportes para confirmar si puedes estar disponible.' : 'Disponible se habilita al terminar todos los reportes activos y sincronizar.'}
    </Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, backgroundColor: APP_THEME.colors.surface, borderWidth: 1, borderColor: APP_THEME.colors.border, borderRadius: APP_THEME.radius.card, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: APP_THEME.colors.royal },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { padding: 10, borderWidth: 1, borderColor: APP_THEME.colors.primary, borderRadius: 8 },
  selected: { borderColor: APP_THEME.colors.primary, backgroundColor: '#E8F1FF' },
  disabled: { opacity: 0.5 },
  text: { color: '#253C96', fontSize: 12, fontWeight: '600' },
  hint: { color: '#64748B', fontSize: 12 },
});
