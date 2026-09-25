import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Animated, Keyboard, Platform, DimensionValue } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../constants';
import { Button } from './Button';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  closeOnOverlayPress?: boolean;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  style?: any;
}

export const ModalContainer = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  closeOnOverlayPress = true,
  showCloseButton = true,
  footer,
  style,
}: ModalProps) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]).start();
      Keyboard.dismiss();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 50, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) {
          // Animation complete
        }
      });
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleOverlayPress = () => {
    if (closeOnOverlayPress) onClose();
  };

  const widthMap: Record<NonNullable<ModalProps['size']>, DimensionValue> = {
    sm: '80%',
    md: '90%',
    lg: '95%',
    full: '100%',
  };

  const maxHeightMap: Record<NonNullable<ModalProps['size']>, DimensionValue> = {
    sm: '60%',
    md: '75%',
    lg: '85%',
    full: '95%',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim },
        ]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleOverlayPress}
      />
      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={[styles.modal, { width: widthMap[size], maxHeight: maxHeightMap[size] }]}>
          {(title || showCloseButton) && (
            <View style={styles.header}>
              <View style={styles.headerContent}>
                {title && <Text style={styles.title}>{title}</Text>}
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
              {showCloseButton && (
                <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.content}>{children}</View>
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </Animated.View>
    </Modal>
  );
};

import { Easing } from 'react-native';

export const BottomSheet = ({
  visible,
  onClose,
  title,
  children,
  height = '50%',
  handleStyle,
  contentStyle,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: string | number;
  handleStyle?: any;
  contentStyle?: any;
}) => {
  const translateY = React.useRef(new Animated.Value(Platform.OS === 'ios' ? 0 : 1)).current;

  React.useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [visible, translateY]);

  const animatedStyle = {
    transform: [
      {
        translateY: translateY.interpolate({
          inputRange: [0, 1],
          outputRange: [0, '100%'] as string[],
        }),
      },
    ],
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity onPress={onClose} style={styles.overlay} activeOpacity={1} />
      <Animated.View style={[styles.bottomSheet, animatedStyle]}>
        <TouchableOpacity onPress={onClose} style={styles.handleContainer}>
          <View style={[styles.handle, handleStyle]} />
        </TouchableOpacity>
        {title && <Text style={styles.bottomSheetTitle}>{title}</Text>}
        <View style={[styles.bottomSheetContent, contentStyle]}>{children}</View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: { flex: 1 },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  closeIcon: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.textTertiary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  content: {
    padding: SPACING.lg,
    maxHeight: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '90%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textTertiary,
    borderRadius: BORDER_RADIUS.full,
  },
  bottomSheetTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bottomSheetContent: {
    padding: SPACING.lg,
    flex: 1,
  },
});