import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../constants';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: 'default' | 'outlined' | 'filter';
  color?: string;
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  disabled?: boolean;
  style?: any;
}

export const Chip = ({
  label,
  selected = false,
  onPress,
  variant = 'default',
  color,
  icon,
  removable = false,
  onRemove,
  disabled = false,
  style,
}: ChipProps) => {
  const bgColor = selected ? (color || COLORS.primary) : 
    variant === 'outlined' ? 'transparent' : COLORS.surfaceVariant;
  const textColor = selected ? COLORS.white : 
    variant === 'outlined' ? (color || COLORS.primary) : COLORS.text;
  const borderColor = variant === 'outlined' ? (color || COLORS.primary) : 'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        {
          backgroundColor: bgColor,
          borderColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.8}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {removable && !disabled && (
        <TouchableOpacity onPress={onRemove} style={styles.removeButton} activeOpacity={0.7}>
          <Text style={[styles.removeIcon, { color: textColor }]}>✕</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export const FilterChip = ({
  label,
  count,
  selected = false,
  onPress,
  style,
}: {
  label: string;
  count?: number;
  selected?: boolean;
  onPress?: () => void;
  style?: any;
}) => (
  <TouchableOpacity onPress={onPress} style={[styles.filterChip, selected && styles.filterChipSelected, style]} activeOpacity={0.8}>
    <Text style={[styles.filterChipLabel, selected && styles.filterChipLabelSelected]}>{label}</Text>
    {count !== undefined && (
      <View style={[styles.filterChipCount, selected && styles.filterChipCountSelected]}>
        <Text style={[styles.filterChipCountText, selected && styles.filterChipCountTextSelected]}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

export const StatusChip = ({
  status,
  label,
  color,
  icon,
}: {
  status: string;
  label: string;
  color: string;
  icon?: React.ReactNode;
}) => (
  <View style={[styles.statusChip, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
    {icon && <View style={styles.statusIcon}>{icon}</View>}
    <View style={styles.statusContent}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusLabel, { color }]}>{label}</Text>
    </View>
    <Text style={[styles.statusValue, { color }]}>{status}</Text>
  </View>
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  icon: {
    marginRight: SPACING.xs,
  },
  removeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  removeIcon: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 14,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text,
  },
  filterChipLabelSelected: {
    color: COLORS.white,
  },
  filterChipCount: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  filterChipCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterChipCountText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  filterChipCountTextSelected: {
    color: COLORS.white,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  statusIcon: {
    marginRight: SPACING.xs,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
  },
  statusLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    marginLeft: SPACING.xs,
  },
});