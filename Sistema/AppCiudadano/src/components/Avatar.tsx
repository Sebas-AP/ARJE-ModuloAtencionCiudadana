import React from 'react';
import { StyleSheet, View, Text, Image, ImageSourcePropType } from 'react-native';
import { COLORS, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants';

interface AvatarProps {
  source?: ImageSourcePropType;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  style?: any;
  backgroundColor?: string;
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const FONT_SIZE_MAP = {
  xs: FONT_SIZES.xs,
  sm: FONT_SIZES.sm,
  md: FONT_SIZES.md,
  lg: FONT_SIZES.lg,
  xl: FONT_SIZES.xxl,
};

export const Avatar = ({
  source,
  name,
  size = 'md',
  shape = 'circle',
  style,
  backgroundColor,
}: AvatarProps) => {
  const dimension = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const borderRadius = shape === 'circle' ? BORDER_RADIUS.full : BORDER_RADIUS.md;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const getColorFromName = (name: string) => {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#10B981', '#06B6D4',
      '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (source) {
    return (
      <Image
        source={source}
        style={[
          styles.avatar,
          { width: dimension, height: dimension, borderRadius },
          style,
        ]}
        resizeMode="cover"
      />
    );
  }

  const bgColor = backgroundColor || (name ? getColorFromName(name) : COLORS.primary);
  const initials = name ? getInitials(name) : '?';

  return (
    <View
      style={[
        styles.avatar,
        { width: dimension, height: dimension, borderRadius, backgroundColor: bgColor },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize, color: COLORS.white }]}>{initials}</Text>
    </View>
  );
};

export const AvatarGroup = ({
  avatars,
  maxVisible = 3,
  size = 'sm',
  style,
}: {
  avatars: (ImageSourcePropType | { name: string; source?: ImageSourcePropType })[];
  maxVisible?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  style?: any;
}) => {
  const visibleAvatars = avatars.slice(0, maxVisible);
  const remaining = avatars.length - maxVisible;

  return (
    <View style={[styles.group, style]}>
      {visibleAvatars.map((avatar, index) => (
        <View key={index} style={styles.groupItem}>
          {typeof avatar === 'object' && 'name' in avatar ? (
            <Avatar name={avatar.name} source={avatar.source} size={size} />
          ) : (
            <Avatar source={avatar} size={size} />
          )}
        </View>
      ))}
      {remaining > 0 && (
        <View style={[styles.groupItem, styles.groupMore]}>
          <Text style={{ color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.medium }}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: FONT_WEIGHTS.bold,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupItem: {
    marginLeft: -8,
    borderWidth: 2,
    borderColor: COLORS.background,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  groupMore: {
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
});