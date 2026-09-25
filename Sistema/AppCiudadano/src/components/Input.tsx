import React from 'react';
import { StyleSheet, Text, TextInput, View, Animated, Easing } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING, FONT_SIZES } from '../constants';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'decimal-pad';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  disabled?: boolean;
  required?: boolean;
  style?: any;
  inputStyle?: any;
  containerStyle?: any;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
}

export const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  (
    {
      label,
      placeholder,
      value,
      onChangeText,
      error,
      helperText,
      secureTextEntry = false,
      multiline = false,
      numberOfLines = 4,
      maxLength,
      keyboardType = 'default',
      leftIcon,
      rightIcon,
      onRightIconPress,
      disabled = false,
      required = false,
      style,
      inputStyle,
      containerStyle,
      autoCapitalize = 'sentences',
      autoCorrect = true,
      onBlur,
      onFocus,
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [showError, setShowError] = React.useState(false);

    const borderColor = error && showError
      ? COLORS.error
      : isFocused
        ? COLORS.borderFocus
        : COLORS.border;

    const labelColor = error && showError
      ? COLORS.error
      : isFocused
        ? COLORS.primary
        : COLORS.textSecondary;

    const animatedBorderWidth = new Animated.Value(1);
    const animatedBorderColor = new Animated.Value(0);

    React.useEffect(() => {
      if (isFocused) {
        Animated.timing(animatedBorderWidth, {
          toValue: 2,
          duration: 150,
          useNativeDriver: false,
        }).start();
        Animated.timing(animatedBorderColor, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }).start();
      } else {
        Animated.timing(animatedBorderWidth, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }).start();
        Animated.timing(animatedBorderColor, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }).start();
      }
    }, [isFocused]);

    const handleBlur = () => {
      setIsFocused(false);
      setShowError(true);
      onBlur?.();
    };

    const handleFocus = () => {
      setIsFocused(true);
      setShowError(false);
      onFocus?.();
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Animated.View
            style={[
              styles.labelContainer,
              {
                transform: [
                  {
                    translateY: isFocused || value.length > 0 ? -24 : 0,
                  },
                  {
                    scale: isFocused || value.length > 0 ? 0.85 : 1,
                  },
                ],
              },
            ]}
          >
            <Text style={[styles.label, { color: labelColor }]}>
              {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
          </Animated.View>
        )}
        <View style={styles.inputWrapper}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              multiline ? styles.inputMultiline : {},
              { borderColor, borderWidth: animatedBorderWidth },
              inputStyle,
            ]}
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            numberOfLines={numberOfLines}
            maxLength={maxLength}
            keyboardType={keyboardType}
            editable={!disabled}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholderTextColor={COLORS.textTertiary}
            selectionColor={COLORS.primary}
          />
          {rightIcon && (
            <View style={styles.iconRight}>
              {React.isValidElement(rightIcon)
                ? React.cloneElement(rightIcon as React.ReactElement<{ onPress?: () => void; style?: any }>, {
                    onPress: onRightIconPress,
                    style: [{ color: isFocused ? COLORS.primary : COLORS.textTertiary }, (rightIcon.props as any).style],
                  })
                : rightIcon}
            </View>
          )}
        </View>
        {(error && showError) || helperText ? (
          <Text style={[
            styles.helperText,
            error && showError ? styles.errorText : {},
          ]}>
            {error && showError ? error : helperText}
          </Text>
        ) : null}
        {maxLength && (
          <Text style={styles.charCount}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: SPACING.xs,
  },
  labelContainer: {
    position: 'absolute',
    left: SPACING.md,
    top: SPACING.md,
    zIndex: 1,
    pointerEvents: 'none',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  required: {
    color: COLORS.error,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    paddingVertical: SPACING.md,
    minHeight: 48,
  },
  inputMultiline: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    textAlignVertical: 'top',
  },
  iconLeft: {
    marginRight: SPACING.sm,
  },
  iconRight: {
    marginLeft: SPACING.sm,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  errorText: {
    color: COLORS.error,
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'right',
    marginTop: -SPACING.xs,
  },
});