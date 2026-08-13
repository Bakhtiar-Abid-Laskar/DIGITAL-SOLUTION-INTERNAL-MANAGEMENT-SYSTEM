import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, Wrench, Package, CheckCircle2, UserPlus } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { JobStatus } from '../../types/job';
import { radius, typography, colors } from '../../tokens';
import { useAppConfig } from '../../context/AppConfigContext';

const icons: Record<string, React.ElementType> = {
  'Received': Clock,
  'In Progress': Wrench,
  'Waiting for Materials': Package,
  'Completed': CheckCircle2,
  'Assigned': UserPlus,
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  const { getJobStatusColor } = useAppConfig();
  const ink = getJobStatusColor(status);
  const fill = ink + '33'; // 20% opacity


  const Icon = icons[status as string] ?? Clock;

  const label = status === 'Waiting for Materials' ? 'Waiting' : status;

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(fill, { duration: 400 }),
  }), [fill]);

  return (
    <Animated.View
      style={[styles.badge, animatedStyle]}
      accessible={true}
      accessibilityLabel={`Status: ${status}`}
    >
      <Icon size={11} color={colors.textPrimary} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
