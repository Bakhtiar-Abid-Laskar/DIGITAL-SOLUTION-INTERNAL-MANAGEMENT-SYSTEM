import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../tokens';

type StaffRateInfo = {
  monthly_salary: number;
  base_pay: number;
  allowed_leave_days: number;
  absent_day_deduction: number;
  halfday_deduction: number;
  penalty_tier1_amount: number;
  penalty_tier2_amount: number;
  ot_rate_per_hour: number;
};

const fmtCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
});

const Row = ({ label, value, color, prefix = '' }: { label: string; value: number | string; color?: string; prefix?: string }) => (
  <View style={styles.lineRow}>
    <Text style={styles.lineLabel}>{label}</Text>
    <Text style={[styles.lineValue, color ? { color } : {}]}>
      {prefix}{typeof value === 'number' ? fmtCurrency.format(value) : value}
    </Text>
  </View>
);

interface Props {
  rates: StaffRateInfo;
}

export function SalaryRatesCard({ rates }: Props) {
  return (
    <View style={styles.card}>
      <Row label="Fixed Monthly Salary" value={rates.monthly_salary || rates.base_pay || 0} />
      <View style={styles.lineRow}>
        <Text style={styles.lineLabel}>Allowed Leave Days</Text>
        <Text style={styles.lineValue}>{rates.allowed_leave_days ?? 2} per month</Text>
      </View>
      <Row label="Leave/Absent Deduction" value={rates.absent_day_deduction || 0} color={colors.accentRed} prefix="−" />
      <Row label="Half-Day Deduction" value={rates.halfday_deduction || 80} color={colors.accentRed} prefix="−" />
      <Row label="Late/Early 1st Hr Penalty" value={rates.penalty_tier1_amount || 30} color={colors.accentRed} prefix="−" />
      <Row label="Late/Early >1 Hr Penalty" value={rates.penalty_tier2_amount || 60} color={colors.accentRed} prefix="−" />
      <Row label="Overtime (OT) Rate / Hr" value={rates.ot_rate_per_hour || 0} color={colors.accentBlue} prefix="+" />
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
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  lineLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  lineValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
});
