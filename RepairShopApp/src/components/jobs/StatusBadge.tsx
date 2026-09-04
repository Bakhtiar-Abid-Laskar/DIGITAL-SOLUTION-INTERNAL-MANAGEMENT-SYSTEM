import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, Wrench, Package, CheckCircle2, UserPlus, AlertTriangle } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { radius, typography, colors } from '../../tokens';

const icons: Record<string, React.ElementType> = {
  'Received': Clock,
  'In Progress': Wrench,
  'Waiting for Materials': Package,
  'Completed': CheckCircle2,
  'Assigned': UserPlus,
  'Urgent': AlertTriangle,
};

export default function StatusBadge({ status, isUrgent = false }: { status: string, isUrgent?: boolean }) {
  let bg = colors.statusNormalBg;
  let fg = colors.statusNormalFg;

  if (isUrgent) {
    bg = colors.statusUrgentBg;
    fg = colors.statusUrgentFg;
  } else {
    switch (status) {
      case 'Received':
        bg = colors.statusReceivedBg; fg = colors.statusReceivedFg; break;
      case 'In Progress':
        bg = colors.statusInProgressBg; fg = colors.statusInProgressFg; break;
      case 'Waiting for Materials':
        bg = colors.statusWaitingBg; fg = colors.statusWaitingFg; break;
      case 'Completed':
      case 'Delivered':
        bg = colors.statusCompletedBg; fg = colors.statusCompletedFg; break;
      case 'Assigned':
        bg = colors.statusAssignedBg; fg = colors.statusAssignedFg; break;
      case 'Urgent':
        bg = colors.statusUrgentBg; fg = colors.statusUrgentFg; break;
    }
  }

  const Icon = icons[isUrgent ? 'Urgent' : status] ?? Clock;
  const label = isUrgent ? 'Urgent' : (status === 'Waiting for Materials' ? 'Waiting' : status);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(bg, { duration: 400 }),
  }), [bg]);

  return (
    <Animated.View
      style={[styles.badge, animatedStyle]}
      accessible={true}
      accessibilityLabel={`Status: ${label}`}
    >
      <Icon size={12} color={fg} />
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.label,
    fontSize: 10,
    textTransform: 'uppercase',
  },
});
