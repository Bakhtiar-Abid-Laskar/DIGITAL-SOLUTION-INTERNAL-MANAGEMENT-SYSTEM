import React from 'react';
import { Text, StyleSheet, Pressable, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors, radius, spacing, typography, SPRING } from '../../tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.96, SPRING);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          button: styles.secondaryButton,
          text: styles.secondaryText,
          indicatorColor: colors.textPrimary,
        };
      case 'destructive':
        return {
          button: styles.destructiveButton,
          text: styles.destructiveText,
          indicatorColor: colors.textInverse,
        };
      case 'primary':
      default:
        return {
          button: styles.primaryButton,
          text: styles.primaryText,
          indicatorColor: colors.textInverse,
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[styles.baseButton, vStyles.button, disabled && styles.disabled, animatedStyle, style]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={vStyles.indicatorColor} size="small" />
      ) : (
        <Text style={[styles.baseText, vStyles.text]}>{label}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  destructiveButton: {
    backgroundColor: colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    ...typography.bodyBold,
  },
  primaryText: {
    color: colors.textInverse,
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  destructiveText: {
    color: colors.textInverse,
  },
});
