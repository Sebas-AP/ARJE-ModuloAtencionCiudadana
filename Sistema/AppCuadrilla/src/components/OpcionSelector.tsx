import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { APP_THEME } from '../theme/appTheme';

interface OpcionSelectorProps {
  label: string;
  options: { value: number; label: string }[];
  selected: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Option value that reveals the free-text input below (e.g. "Otro"). */
  freeTextOptionValue?: number;
  freeTextValue?: string;
  onFreeTextChange?: (text: string) => void;
  freeTextPlaceholder?: string;
}

export const OpcionSelector: React.FC<OpcionSelectorProps> = ({
  label,
  options,
  selected,
  onChange,
  disabled = false,
  freeTextOptionValue,
  freeTextValue = '',
  onFreeTextChange,
  freeTextPlaceholder = 'Especifica el motivo',
}) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.options}>
      {options.map(({ value, label: optionLabel }) => (
        <TouchableOpacity
          key={value}
          accessibilityRole="button"
          accessibilityState={{ disabled, selected: value === selected }}
          disabled={disabled}
          onPress={() => onChange(value)}
          style={[styles.option, value === selected && styles.selected, disabled && styles.disabled]}
        >
          <Text style={[styles.text, value === selected && styles.textSelected]}>{optionLabel}</Text>
        </TouchableOpacity>
      ))}
    </View>
    {selected === freeTextOptionValue && (
      <TextInput
        value={freeTextValue}
        onChangeText={onFreeTextChange}
        editable={!disabled}
        maxLength={500}
        multiline
        placeholder={freeTextPlaceholder}
        placeholderTextColor="rgba(29,47,64,0.55)"
        style={styles.freeText}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { gap: 10 },
  label: { fontSize: 14, fontWeight: '700', color: APP_THEME.colors.royal },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { padding: 10, borderWidth: 1, borderColor: APP_THEME.colors.primary, borderRadius: 8 },
  selected: { borderColor: APP_THEME.colors.primary, backgroundColor: '#E8F1FF' },
  disabled: { opacity: 0.5 },
  text: { color: '#253C96', fontSize: 12, fontWeight: '600' },
  textSelected: { fontWeight: '700' },
  freeText: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: APP_THEME.colors.border,
    borderRadius: APP_THEME.radius.input,
    backgroundColor: '#FFF',
    padding: 10,
    color: APP_THEME.colors.ink,
    fontFamily: 'InriaSans_400Regular',
    fontSize: 14,
    textAlignVertical: 'top',
  },
});
