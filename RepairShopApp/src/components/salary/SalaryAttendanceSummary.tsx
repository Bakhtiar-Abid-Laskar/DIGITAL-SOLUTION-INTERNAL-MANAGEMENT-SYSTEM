import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { ChevronRight } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';

interface Props {
  workingDays: number;
  presentDays: number;
  halfdayCount: number;
  leaveCount: number;
  onPress?: () => void;
}

export function SalaryAttendanceSummary({ workingDays, presentDays, halfdayCount, leaveCount, onPress }: Props) {
  const stats = [
    { label: 'Working Days', value: workingDays },
    { label: 'Present',      value: presentDays },
    { label: 'Half-Days',    value: halfdayCount },
    { label: 'Leave',        value: leaveCount },
  ];

  const cardContent = (
    <View style={styles.card}>
      <View style={styles.statsRow}>
        {stats.map(({ label, value }) => (
          <View key={label} style={styles.attBox}>
            <Text style={styles.attValue}>{value ?? '—'}</Text>
            <Text style={styles.attLabel}>{label}</Text>
          </View>
        ))}
      </View>
      {onPress && (
        <View style={styles.footerLink}>
          <Text style={styles.footerText}>View Attendance Records</Text>
          <ChevronRight size={14} color={colors.primary} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <AppPressable onPress={onPress} activeOpacity={0.8}>
        {cardContent}
      </AppPressable>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  attBox: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  attValue: { ...typography.h3, color: colors.textPrimary, fontSize: 20 },
  attLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});
