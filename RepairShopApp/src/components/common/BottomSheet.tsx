import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  Pressable,
  PanResponder,
  Animated as RNAnimated,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '../../tokens';

// NOTE: GestureDetector from react-native-gesture-handler has been intentionally
// removed from this component. React Native Modals mount in a separate native
// view tree, making GestureHandlerRootView coverage unreliable across Expo Go
// and EAS builds. Swipe-to-dismiss is implemented using the built-in PanResponder
// which works identically across all environments with zero native linking issues.

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 100;
const DISMISS_VELOCITY = 500;

export default function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const [showModal, setShowModal] = useState(visible);

  // Sync showModal when visible flips to true
  useEffect(() => {
    if (visible) setShowModal(true);
  }, [visible]);

  const translateY    = useSharedValue(SCREEN_HEIGHT);
  const opacity       = useSharedValue(0);

  // dragY is a plain RN Animated value used by PanResponder (not Reanimated).
  // We apply it as a second transform so Reanimated's spring entrance doesn't
  // interfere with the live drag.
  const dragY = useRef(new RNAnimated.Value(0)).current;

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // ─── Entrance / Exit animation (Reanimated spring) ───────────────────────
  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      translateY.value = withSpring(0, { damping: 26, stiffness: 400, overshootClamping: true });
      opacity.value    = withTiming(0.4, { duration: 300 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, { damping: 26, stiffness: 400, overshootClamping: true });
      opacity.value    = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) runOnJS(setShowModal)(false);
      });
    }
  }, [visible]);

  // ─── Swipe-to-dismiss (built-in PanResponder — no native linking needed) ──
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD || g.vy * 1000 > DISMISS_VELOCITY) {
          dragY.setValue(0);
          onCloseRef.current();
        } else {
          RNAnimated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 26,
            stiffness: 400,
          }).start();
        }
      },
    })
  ).current;

  const animatedBackdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const animatedSheetStyle    = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!showModal) return null;

  return (
    <Modal visible={showModal} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
        </Pressable>

        <Animated.View style={[styles.sheet, animatedSheetStyle]}>
          {/* Drag handle — PanResponder attached here */}
          <RNAnimated.View
            style={[styles.handleContainer, { transform: [{ translateY: dragY }] }]}
            {...panResponder.panHandlers}
          >
            <View style={styles.handle} />
          </RNAnimated.View>

          {/* Content is NOT wrapped in the drag responder so taps still work */}
          <RNAnimated.View style={{ transform: [{ translateY: dragY }] }}>
            {children}
          </RNAnimated.View>
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
