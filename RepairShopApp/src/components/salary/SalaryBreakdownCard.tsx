import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gift, Clock, AlertCircle, CalendarX, Banknote } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';

type SalaryRecord = any;

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 });

const LineRow = ({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: React.ReactNode }) => (
  <View style={styles.lineRow}>
    <View style={styles.iconLabelRow}>
      {icon}
      <Text style={styles.lineLabel}>{label}</Text>
    </View>
    <Text style={[styles.lineValue, color ? { color } : {}]}>{fmt.format(value)}</Text>
  </View>
);

interface Props {
  record: SalaryRecord;
}

export function SalaryBreakdownCard({ record }: Props) {
  const noDeductions = [
    record.late_deduction, record.early_deduction, record.leave_deduction,
    record.halfday_deduction_total, record.absence_deduction_total, record.advance_deducted,
  ].every(v => !v || v === 0);

  return (
    <>
      {/* Earnings */}
      <Text style={styles.sectionTitle}>Earnings</Text>
      <View style={styles.card}>
        <LineRow label="Fixed Monthly Salary" value={record.monthly_salary_base || 0} />
        {(record.bonus_amount || 0) > 0 && (
          <LineRow label="Bonus" value={record.bonus_amount} color={colors.accentGreen}
            icon={<Gift size={14} color={colors.accentGreen} />} />
        )}
        {(record.overtime_pay || 0) > 0 && (
          <LineRow label="Overtime" value={record.overtime_pay} color={colors.accentBlue}
            icon={<Clock size={14} color={colors.accentBlue} />} />
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Gross Salary</Text>
          <Text style={styles.totalValue}>{fmt.format(record.gross_salary)}</Text>
        </View>
      </View>

      {/* Deductions */}
      <Text style={styles.sectionTitle}>Deductions</Text>
      <View style={styles.card}>
        {((record.late_deduction || 0) > 0 || (record.early_deduction || 0) > 0) && (
          <LineRow
            label="Attendance Penalty (Late / Early)"
            value={(record.late_deduction || 0) + (record.early_deduction || 0)}
            color={colors.accentRed}
            icon={<AlertCircle size={14} color={colors.accentOrange} />}
          />
        )}
        {(record.leave_deduction || 0) > 0 && (
          <LineRow label="Leave Deduction" value={record.leave_deduction} color={colors.accentRed}
            icon={<CalendarX size={14} color={colors.accentOrange} />} />
        )}
        {(record.halfday_deduction_total || 0) > 0 && (
          <LineRow label="Half-Day Deduction" value={record.halfday_deduction_total} color={colors.accentRed} />
        )}
        {(record.absence_deduction_total || 0) > 0 && (
          <LineRow label="Unexcused Absence" value={record.absence_deduction_total} color={colors.accentRed} />
        )}
        {(record.advance_deducted || 0) > 0 && (
          <LineRow label="Advance Salary" value={record.advance_deducted} color={colors.accentRed}
            icon={<Banknote size={14} color={colors.accentRed} />} />
        )}
        {noDeductions && (
          <Text style={[styles.lineLabel, { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.sm }]}>
            No deductions this month
          </Text>
        )}
      </View>
    </>
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
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  iconLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  lineLabel: { ...typography.body, color: colors.textSecondary },
  lineValue: { ...typography.bodyBold, color: colors.textPrimary },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  totalLabel: { ...typography.bodyBold, color: colors.textPrimary },
  totalValue: { ...typography.h3, color: colors.textPrimary },
});
