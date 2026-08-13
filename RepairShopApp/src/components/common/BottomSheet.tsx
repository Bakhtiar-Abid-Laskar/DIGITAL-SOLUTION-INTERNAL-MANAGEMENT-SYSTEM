import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Modal, Dimensions, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '../../tokens';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 100;

export default function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const [showModal, setShowModal] = useState(visible);

  if (visible && !showModal) {
    setShowModal(true);
  }

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  const handleCloseRef = useRef(onClose);
  useEffect(() => {
    handleCloseRef.current = onClose;
  }, [onClose]);

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > 500) {
        runOnJS(handleCloseRef.current)();
      } else {
        translateY.value = withSpring(0, { damping: 26, stiffness: 400, overshootClamping: true });
      }
    });

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 26, stiffness: 400, overshootClamping: true });
      opacity.value = withTiming(0.4, { duration: 300 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, { damping: 26, stiffness: 400, overshootClamping: true });
      opacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(setShowModal)(false);
        }
      });
    }
  }, [visible]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!showModal) return null;

  return (
    <Modal visible={showModal} transparent={true} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
        </Pressable>

        <Animated.View style={[styles.sheet, animatedSheetStyle]}>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={styles.handleContainer}>
              <View style={styles.handle} />
            </Animated.View>
          </GestureDetector>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.navBackground,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
});
