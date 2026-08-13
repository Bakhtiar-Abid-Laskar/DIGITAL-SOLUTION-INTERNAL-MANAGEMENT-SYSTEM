import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, shadow } from '../../tokens';

const { width } = Dimensions.get('window');

function ShimmerBlock({ w, h, rad = 8 }: { w: number | string; h: number; rad?: number }) {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1500, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.shimmerBox, { width: w as any, height: h, borderRadius: rad }]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, animStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

export default function SkeletonCard() {
  const cardWidth = width - spacing.lg * 2;

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <View style={styles.row}>
        <ShimmerBlock w={110} h={18} />
        <ShimmerBlock w={70} h={22} rad={radius.pill} />
      </View>

      <ShimmerBlock w={160} h={14} />

      <View style={{ marginTop: spacing.xs }}>
        <ShimmerBlock w="90%" h={12} />
      </View>

      <View style={[styles.row, { marginTop: spacing.base }]}>
        <ShimmerBlock w={90} h={12} />
        <ShimmerBlock w={50} h={18} rad={radius.pill} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ flex: 1, padding: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    padding: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shimmerBox: {
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
});
