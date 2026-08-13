import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Modal } from 'react-native';
import { AppPressable } from './AppPressable';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';
import { colors, radius, shadow, spacing, typography, SPRING } from '../../tokens';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  visible: boolean;
  title: string;
  message?: string;
  type: ToastType;
  onHide: () => void;
  duration?: number;
}

export function Toast({ visible, title, message, type, onHide, duration = 4000 }: ToastProps) {
  const insets = useSafeAreaInsets();

  // Animate the banner vertically
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(insets.top + spacing.md, SPRING);
      opacity.value = withTiming(1, { duration: 200 });

      const timeout = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timeout);
    } else {
      translateY.value = withTiming(-120, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, insets.top]);

  const handleDismiss = () => {
    translateY.value = withTiming(-120, { duration: 250 }, (finished) => {
      if (finished) {
        scheduleOnRN(onHide);
      }
    });
    opacity.value = withTiming(0, { duration: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 color={colors.accentGreen} size={20} />;
      case 'error':
        return <AlertCircle color={colors.accentRed} size={20} />;
      case 'info':
      default:
        return <Info color={colors.accentBlue} size={20} />;
    }
  };

  if (!visible) return null;

  // Render inside a transparent Modal so it truly overlays everything
  // and is never clipped by parent overflow:hidden containers or sibling z-index
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      {/* Pointer-events pass through the overlay area to non-toast content */}
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View style={[styles.container, animatedStyle]}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>{getIcon()}</View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{title}</Text>
              {message && <Text style={styles.message}>{message}</Text>}
            </View>
            <AppPressable style={styles.closeButton} onPress={handleDismiss}>
              <X color={colors.textSecondary} size={18} />
            </AppPressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Full-screen overlay that passes touch events through, except to the banner itself
  overlay: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.nav,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
  },
});
