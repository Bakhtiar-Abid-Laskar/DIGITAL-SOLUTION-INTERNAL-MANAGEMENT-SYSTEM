import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { Job } from '../../types/job';
import { colors, radius, shadow, spacing, typography, SPRING, getStatusCard, getPriorityCard } from '../../tokens';

interface JobCardProps {
  job: Job & { technician_name?: string };
  onPress: (jobId: string) => void;
  index?: number;
  isTechnicianView?: boolean;
  suppressEnter?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const JobCard = React.memo(function JobCard({ job, onPress, index = 0, isTechnicianView = false, suppressEnter = false }: JobCardProps) {
  const { fill, ink } = getStatusCard(job.status);
  const { ink: priorityColor, fill: priorityBg } = getPriorityCard(job.priority);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderLeftColor: ink, // Left border is always the status color
  }), [scale, ink]);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, SPRING);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING);
  };



  const card = (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPress={() => onPress(job.id)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Job ${job.job_code}. Priority: ${job.priority}. Status: ${job.status}.`}
    >
      {/* Job code + status label row */}
      <View style={styles.headerRow}>
        <Text style={[styles.jobCode, { color: ink }]} numberOfLines={1}>
          {job.job_code}
        </Text>
        {/* Badge background = darker tint (using Fg color with opacity over background) */}
        <View style={[styles.statusChip, { backgroundColor: ink + '1A' }]}>
          <Text style={[styles.statusChipText, { color: ink }]}>
            {job.status === 'Waiting for Materials' ? 'Waiting' : job.status}
          </Text>
        </View>
      </View>

      {/* Customer + device */}
      <Text style={[styles.customerName, { color: colors.textPrimary }]} numberOfLines={1}>
        {job.customer_name}
      </Text>
      <Text style={[styles.deviceLine, { color: colors.textSecondary }]} numberOfLines={1}>
        {job.device_type}
        {job.reported_issue ? `  ·  ${job.reported_issue}` : ''}
      </Text>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Text style={[styles.footerLeft, { color: colors.textMuted }]} numberOfLines={1}>
          {!isTechnicianView && job.technician_name
            ? `Tech: ${job.technician_name}`
            : getTimeAgo(job.created_at)}
        </Text>
        {job.priority !== 'Normal' && (
          <View style={[
            styles.priorityChip,
            { backgroundColor: priorityBg }
          ]}>
            <Text style={[
              styles.priorityChipText,
              { color: priorityColor }
            ]}>
              {job.priority}
            </Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );

  if (suppressEnter) return card;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
      {card}
    </Animated.View>
  );
});

export default JobCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: colors.border,
    // Removed shadow for flat B2B aesthetic
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  jobCode: {
    ...typography.bodyBold,
    letterSpacing: 0.5,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusChipText: {
    ...typography.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  customerName: {
    ...typography.h3,
    marginBottom: spacing.xxs,
  },
  deviceLine: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    ...typography.caption,
    flex: 1,
  },
  priorityChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  priorityChipText: {
    ...typography.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

