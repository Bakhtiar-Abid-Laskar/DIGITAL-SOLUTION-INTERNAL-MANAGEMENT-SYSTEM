import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../tokens';

interface Props {
  workingDays: number;
  presentDays: number;
  halfdayCount: number;
  leaveCount: number;
}

export function SalaryAttendanceSummary({ workingDays, presentDays, halfdayCount, leaveCount }: Props) {
  const stats = [
    { label: 'Working Days', value: workingDays },
    { label: 'Present',      value: presentDays },
    { label: 'Half-Days',    value: halfdayCount },
    { label: 'Leave',        value: leaveCount },
  ];

  return (
    <View style={styles.card}>
      {stats.map(({ label, value }) => (
        <View key={label} style={styles.attBox}>
          <Text style={styles.attValue}>{value ?? '—'}</Text>
          <Text style={styles.attLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
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
});
