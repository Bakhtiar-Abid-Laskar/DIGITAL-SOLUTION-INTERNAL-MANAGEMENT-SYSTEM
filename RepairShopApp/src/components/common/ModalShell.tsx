import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, Pressable, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { colors, radius, spacing, shadow, SPRING } from '../../tokens';

interface ModalShellProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const { height } = Dimensions.get('window');

export default function ModalShell({ visible, onClose, children }: ModalShellProps) {
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);
  const [shouldRender, setShouldRender] = useState(visible);

  if (visible && !shouldRender) {
    setShouldRender(true);
  }

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING);
      opacity.value = withSpring(1, { damping: 20, stiffness: 150, overshootClamping: true });
    } else {
      translateY.value = withSpring(height, SPRING);
      opacity.value = withSpring(0, { damping: 20, stiffness: 150, overshootClamping: true }, (finished) => {
        if (finished) {
          runOnJS(setShouldRender)(false);
        }
      });
    }
  }, [visible]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!shouldRender) return null;

  return (
    <Modal
      transparent
      visible={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, animatedOverlayStyle]} />
        </Pressable>
        
        <Animated.View style={[styles.sheet, animatedSheetStyle]}>
          <View style={styles.dragHandle} />
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 27, 24, 0.4)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl + 8 : spacing.xl,
    paddingHorizontal: spacing.xl,
    maxHeight: height * 0.85,
    minHeight: 180,
    ...shadow.card,
  },
  dragHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  content: {
    flexShrink: 1,
  },
});
