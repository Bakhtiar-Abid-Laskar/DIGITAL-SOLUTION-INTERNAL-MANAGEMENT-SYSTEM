import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Minus, Flame, Zap } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { JobPriority } from '../../types/job';
import { radius, typography, colors } from '../../tokens';
import { useAppConfig } from '../../context/AppConfigContext';

const icons: Record<JobPriority, React.ElementType> = {
  'Normal': Minus,
  'High': Flame,
  'Urgent': Zap,
};

export default function PriorityBadge({ priority }: { priority: JobPriority }) {
  const { getPriorityColor } = useAppConfig();
  const ink = getPriorityColor(priority);
  const fill = ink + '33'; // 20% opacity


  const Icon = icons[priority] ?? Minus;
  const isUrgent = priority === 'Urgent';
  const isNormal = priority === 'Normal';

  const scale = useSharedValue(1);

  useEffect(() => {
    if (isUrgent) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1,    { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = 1;
    }
  }, [isUrgent]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.badge,
        { backgroundColor: isNormal ? 'transparent' : fill },
        isNormal && { borderWidth: 1, borderColor: colors.border },
        animatedStyle,
      ]}
      accessible={true}
      accessibilityLabel={`Priority: ${priority}`}
    >
      <Icon size={11} color={isNormal ? ink : colors.textPrimary} />
      <Text style={[styles.text, { color: isNormal ? ink : colors.textPrimary }]}>{priority}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.label,
    fontSize: 11,
  },
});
