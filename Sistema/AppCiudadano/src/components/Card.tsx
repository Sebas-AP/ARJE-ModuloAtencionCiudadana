import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants';

interface CardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  elevation?: number;
  padding?: number;
  margin?: number;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
}

export const Card = ({
  children,
  style,
  onPress,
  elevation = 2,
  padding = SPACING.md,
  margin = 0,
  borderColor = COLORS.border,
  borderWidth = 1,
  backgroundColor = COLORS.white,
}: CardProps) => {
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      onPress={onPress}
      style={[
        styles.card,
        {
          padding,
          margin,
          elevation,
          shadowColor: COLORS.black,
          shadowOffset: { width: 0, height: elevation },
          shadowOpacity: 0.1,
          shadowRadius: elevation * 2,
          borderColor,
          borderWidth,
          backgroundColor,
        },
        style,
      ]}
      activeOpacity={0.9}
    >
      {children}
    </Component>
  );
};

export const CardHeader = ({ title, subtitle, action, style }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: any;
}) => (
  <View style={[styles.header, style]}>
    <View style={styles.headerContent}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </View>
    {action}
  </View>
);

export const CardContent = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[styles.content, style]}>{children}</View>
);

export const CardFooter = ({ children, style, divider = true }: { children: React.ReactNode; style?: any; divider?: boolean }) => (
  <View style={[styles.footer, divider && styles.footerDivider, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  content: {},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  footerDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});