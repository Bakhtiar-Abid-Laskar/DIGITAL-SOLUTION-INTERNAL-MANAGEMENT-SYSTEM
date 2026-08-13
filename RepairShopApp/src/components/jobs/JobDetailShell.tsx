import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, StyleProp, ViewStyle } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Navigation } from 'lucide-react-native';
import { Job } from '../../types/job';
import { formatDate, formatTime } from '@repairshop/shared';
import AppHeader from '../common/AppHeader';
import SectionLabel from '../common/SectionLabel';
import DetailRow from '../common/DetailRow';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { colors, radius, spacing, shadow, getStatusCard, typography, BOTTOM_TAB_HEIGHT } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';

export interface JobDetailShellProps {
  job: Job;
  feedbackMessage?: string | null;
  children?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export default function JobDetailShell({
  job,
  feedbackMessage,
  children,
  contentContainerStyle,
}: JobDetailShellProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav');
  
  const { fill, ink } = getStatusCard(job.status);

  return (
    <View style={styles.container}>
      <AppHeader title={job.job_code} showBack={true} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding }, contentContainerStyle]}>
        
        {/* Pastel status header */}
        <View style={[styles.statusHeader, { backgroundColor: fill }]}>
          <Text style={[styles.statusJobCode, { color: colors.textPrimary }]}>{job.job_code}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge status={job.status} />
            <PriorityBadge priority={job.priority} />
            {job.job_type === 'Onsite' && (
              <View style={[styles.typeBadge, { backgroundColor: ink + '1C' }]}>
                <Navigation size={11} color={colors.textPrimary} />
                <Text style={[styles.typeBadgeText, { color: colors.textPrimary }]}>Onsite</Text>
              </View>
            )}
          </View>
          {job.completed_at && (
            <Text style={[styles.completedAt, { color: ink + 'B3' }]}>
              Completed {formatDate(job.completed_at)} at {formatTime(job.completed_at)}
            </Text>
          )}
        </View>

        {/* Feedback strip */}
        {feedbackMessage && (
          <Animated.View entering={FadeInUp.duration(300)} style={styles.feedbackStrip}>
            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
          </Animated.View>
        )}

        {/* Customer & Issue */}
        <SectionLabel title="CUSTOMER" />
        <View style={styles.card}>
          <DetailRow label="Name" value={job.customer_name} showDivider />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Contact</Text>
            <AppPressable onPress={() => Linking.openURL(`tel:${job.customer_contact}`)}>
              <Text style={[styles.rowValueText, styles.link, { color: colors.statusInProgressFg }]}>{job.customer_contact}</Text>
            </AppPressable>
          </View>
          {job.customer_email && (
            <>
              <View style={styles.divider} />
              <DetailRow label="Email" value={job.customer_email} />
            </>
          )}
        </View>

        {/* Device & Issue */}
        <SectionLabel title="DEVICE & ISSUE" />
        <View style={[styles.card, styles.cardSpaced]}>
          <DetailRow label="Device"   value={job.device_type} showDivider />
          <DetailRow label="Job Type" value={job.job_type} />
          <Text style={styles.subLabel}>Reported Issue</Text>
          <View style={styles.box}>
            <Text style={styles.boxText}>{job.reported_issue}</Text>
          </View>
          {job.remarks && (
            <>
              <Text style={styles.subLabel}>Remarks</Text>
              <View style={styles.box}>
                <Text style={styles.boxText}>{job.remarks}</Text>
              </View>
            </>
          )}
        </View>

        {/* Custom Role Content */}
        {children}

      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
  },
  statusHeader: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  statusJobCode: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  typeBadgeText: {
    ...typography.label,
    fontSize: 10,
  },
  completedAt: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  feedbackStrip: {
    backgroundColor: colors.statusCompletedBg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  feedbackText: {
    ...typography.caption,
    color: colors.statusCompletedFg,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  // Extra top margin between consecutive cards (e.g. Customer -> Device & Issue)
  cardSpaced: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  rowValueText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  link: {
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  subLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.base,
    marginBottom: spacing.xs,
  },
  box: {
    backgroundColor: colors.backgroundAlt,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boxText: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
