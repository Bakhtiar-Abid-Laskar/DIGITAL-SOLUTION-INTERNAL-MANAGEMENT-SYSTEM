import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronDown, Banknote, Users, CheckCircle, XCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '@repairshop/shared';
import AppHeader from '../../components/common/AppHeader';
import BottomSheet from '../../components/common/BottomSheet';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonList } from '../../components/common/SkeletonCard';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { useToast } from '../../context/ToastContext';

type StaffUser = { id: string; name: string; role: string };

type SalaryBreakdown = {
  user_id: string;
  employee_name: string;
  employee_role: string;
  month: string;
  base_pay: number;
  incentive_pay: number;
  ot_pay: number;
  gross_salary: number;
  working_days: number;
  present_days: number;
  halfday_count: number;
  leave_count: number;
  absent_count: number;
  absence_deduction: number;
  absent_day_deduction: number;
  ot_hours: number;
  ot_rate_per_hour: number;
  advance_deducted: number;
  net_salary: number;
  salary_id?: string;
};

function getMonthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function generateMonthOptions(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

const getRoleBadgeColor = (role: string) => {
  if (role === 'technician') return { bg: colors.statusCompletedBg, fg: colors.accentGreen };
  if (role === 'receptionist') return { bg: colors.statusInProgressBg, fg: colors.primary };
  return { bg: colors.statusWaitingBg, fg: colors.accentBlue };
};

export default function SalaryScreen() {
  const bottomPadding = useBottomInsetPadding('nav');
  const { showToast } = useToast();

  const [month, setMonth] = useState(() => getDefaultMonth());
  const [monthPicker, setMonthPicker] = useState(false);
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [breakdown, setBreakdown] = useState<SalaryBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  const [saving, setSaving] = useState(false);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role')
        .order('name', { ascending: true });
      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setStaffLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStaff();
    }, [])
  );

  const calculateSalary = async (user: StaffUser) => {
    setSelectedUser(user);
    setBreakdown(null);
    setDetailVisible(true);
    setCalculating(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('No active session.');

      const { data, error } = await supabase.functions.invoke('calculate-monthly-salary', {
        body: { user_id: user.id, month },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || !data) throw new Error(error?.message || 'Calculation returned no data.');
      if (data.error) throw new Error(data.error);

      setBreakdown(data.data as SalaryBreakdown);
    } catch (err: any) {
      showToast({ title: 'Calculation Failed', message: err.message, type: 'error' });
      setDetailVisible(false);
    } finally {
      setCalculating(false);
    }
  };

  const markAsPaid = async () => {
    if (!breakdown || !selectedUser) return;
    setSaving(true);
    try {
      if (breakdown.salary_id) {
        // Update existing record
        const { error } = await supabase
          .from('salary')
          .update({
            gross_salary: breakdown.gross_salary,
            net_salary: breakdown.net_salary,
            advance_deducted: breakdown.advance_deducted,
            present_days: breakdown.present_days,
            halfday_count: breakdown.halfday_count,
            ot_hours: breakdown.ot_hours,
            incentive_pay: breakdown.incentive_pay,
          })
          .eq('id', breakdown.salary_id);
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase.from('salary').insert({
          user_id: breakdown.user_id,
          month: `${month}-01`,
          base_pay: breakdown.base_pay,
          incentive_pay: breakdown.incentive_pay,
          working_days: breakdown.working_days,
          present_days: breakdown.present_days,
          halfday_count: breakdown.halfday_count,
          leave_count: breakdown.leave_count,
          ot_hours: breakdown.ot_hours,
          ot_rate_per_hour: breakdown.ot_rate_per_hour,
          absent_day_deduction: breakdown.absent_day_deduction,
          allowed_leave_days: 0,
          absence_deduction: breakdown.absence_deduction,
          advance_deducted: breakdown.advance_deducted,
          gross_salary: breakdown.gross_salary,
          net_salary: breakdown.net_salary,
        });
        if (error) throw error;
      }

      showToast({ title: 'Salary Recorded', message: `${breakdown.employee_name}'s salary for ${getMonthLabel(month)} has been saved.`, type: 'success' });
      setDetailVisible(false);
    } catch (err: any) {
      showToast({ title: 'Save Failed', message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };



  return (
    <View style={styles.container}>
      <AppHeader title="Salary Management" showBack={true} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding }]}>
        {/* Month Picker */}
        <View style={styles.monthRow}>
          <Text style={styles.sectionLabel}>Month</Text>
          <AppPressable style={styles.monthPill} onPress={() => setMonthPicker(true)}>
            <Text style={styles.monthPillText}>{getMonthLabel(month)}</Text>
            <ChevronDown size={16} color={colors.textSecondary} style={{ marginLeft: spacing.sm }} />
          </AppPressable>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Banknote size={18} color={colors.accentGreen} style={{ marginRight: spacing.md }} />
          <Text style={styles.infoText}>
            Tap any staff member to calculate and review their salary breakdown for {getMonthLabel(month)}.
          </Text>
        </View>

        {/* Staff list */}
        <Text style={styles.listHeader}>Staff Members ({staff.length})</Text>

        {staffLoading ? (
          <SkeletonList count={3} />
        ) : staff.length === 0 ? (
          <EmptyState
            icon={<Users size={44} color={colors.textMuted} strokeWidth={1.5} />}
            heading="No staff found"
            subtext="Staff accounts appear here once they register."
          />
        ) : (
          staff.map(user => {
            const badge = getRoleBadgeColor(user.role);
            return (
              <AppPressable
                key={user.id}
                style={styles.staffCard}
                onPress={() => calculateSalary(user)}
                activeOpacity={0.75}
              >
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{user.name}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: badge.fg }]}>{user.role.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.calcText}>Calculate →</Text>
              </AppPressable>
            );
          })
        )}
      </ScrollView>

      {/* Month Picker Sheet */}
      <BottomSheet visible={monthPicker} onClose={() => setMonthPicker(false)}>
        <Text style={{ ...typography.h2, marginBottom: spacing.lg }}>Select Month</Text>
        {monthOptions.map(m => (
          <AppPressable
            key={m}
            style={[styles.monthOption, month === m && styles.monthOptionSelected]}
            onPress={() => { setMonth(m); setMonthPicker(false); }}
          >
            <Text style={[styles.monthOptionText, month === m && { color: colors.primary, fontWeight: '700' }]}>
              {getMonthLabel(m)}
            </Text>
          </AppPressable>
        ))}
      </BottomSheet>

      {/* Salary Detail Sheet */}
      <BottomSheet visible={detailVisible} onClose={() => { if (!calculating && !saving) setDetailVisible(false); }}>
        {calculating ? (
          <View style={styles.loadingBox}>
            <SkeletonList count={4} />
            <Text style={styles.loadingText}>Calculating salary…</Text>
          </View>
        ) : breakdown ? (
          <ScrollView style={{ maxHeight: 560 }}>
            <Text style={styles.breakdownTitle}>{breakdown.employee_name}</Text>
            <Text style={styles.breakdownSubtitle}>{getMonthLabel(month)}</Text>

            {/* Attendance */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Attendance</Text>
              <Row label="Working Days" value={String(breakdown.working_days)} />
              <Row label="Present" value={String(breakdown.present_days)} />
              <Row label="Half-days" value={String(breakdown.halfday_count)} />
              <Row label="Leave Days" value={String(breakdown.leave_count)} />
              <Row label="Absent" value={String(breakdown.absent_count)} />
            </View>

            {/* Earnings */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Earnings</Text>
              <Row label="Base Pay" value={formatCurrency(breakdown.base_pay)} />
              <Row label="Incentive Pay" value={formatCurrency(breakdown.incentive_pay)} />
              <Row label="OT Pay" value={formatCurrency(breakdown.ot_pay)} />
              <Row label="Gross Salary" value={formatCurrency(breakdown.gross_salary)} highlight />
            </View>

            {/* Deductions */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Deductions</Text>
              <Row label="Absence Deduction" value={`−${formatCurrency(breakdown.absence_deduction)}`} negative />
              <Row label="Advance Deducted" value={`−${formatCurrency(breakdown.advance_deducted)}`} negative />
            </View>

            {/* Net */}
            <View style={styles.netBox}>
              <Text style={styles.netLabel}>Net Payable</Text>
              <Text style={styles.netValue}>{formatCurrency(breakdown.net_salary)}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setDetailVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                label={breakdown.salary_id ? 'Update Record' : 'Mark as Paid'}
                onPress={markAsPaid}
                loading={saving}
                style={{ flex: 1, backgroundColor: colors.accentGreen }}
              />
            </View>
          </ScrollView>
        ) : null}
      </BottomSheet>
    </View>
  );
}

function Row({ label, value, highlight, negative }: { label: string; value: string; highlight?: boolean; negative?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[
        styles.rowValue,
        highlight && styles.rowHighlight,
        negative && { color: colors.accentRed },
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  monthPillText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.statusCompletedBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  infoText: {
    ...typography.caption,
    color: colors.accentGreen,
    flex: 1,
    lineHeight: 18,
  },
  listHeader: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  staffInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  staffName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  calcText: {
    ...typography.bodyBold,
    color: colors.primary,
    marginLeft: spacing.md,
  },
  monthOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthOptionSelected: {
    backgroundColor: colors.statusInProgressBg,
    borderColor: colors.primary,
  },
  monthOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  loadingBox: {
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  breakdownTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  breakdownSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  rowValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  rowHighlight: {
    color: colors.accentGreen,
    fontSize: 15,
  },
  netBox: {
    backgroundColor: colors.statusCompletedBg,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  netLabel: {
    ...typography.h3,
    color: colors.accentGreen,
  },
  netValue: {
    ...typography.h2,
    color: colors.accentGreen,
  },
});
