import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react-native';
import AppHeader from '../../components/common/AppHeader';
import { colors, radius, spacing, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// Sub-components
import { SalaryRatesCard } from '../../components/salary/SalaryRatesCard';
import { SalaryHeroCard } from '../../components/salary/SalaryHeroCard';
import { SalaryBreakdownCard } from '../../components/salary/SalaryBreakdownCard';
import { SalaryAttendanceSummary } from '../../components/salary/SalaryAttendanceSummary';
import { LeaveApplicationCard } from '../../components/salary/LeaveApplicationCard';
import { LeaveHistoryList } from '../../components/salary/LeaveHistoryList';
import { SalaryHistoryList } from '../../components/salary/SalaryHistoryList';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SalaryRecord = {
  id: string;
  month: string;
  monthly_salary_base: number;
  bonus_amount: number;
  incentive_amount: number;
  overtime_pay: number;
  gross_salary: number;
  late_deduction: number;
  early_deduction: number;
  leave_deduction: number;
  halfday_deduction_total: number;
  absence_deduction_total: number;
  customer_review_deduction: number;
  advance_deducted: number;
  net_salary: number;
  status: 'draft' | 'paid';
  present_days: number;
  halfday_count: number;
  leave_count: number;
  working_days: number;
  is_preview?: boolean;
};

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

const HISTORY_PAGE_SIZE = 6;
const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function fmtMonth(monthStr: string) {
  if (!monthStr) return '';
  return new Date(monthStr).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function generateSlipHtml(record: SalaryRecord, employeeName: string, employeeRole: string) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const monthLabel = fmtMonth(record.month);

  const addRows = [
    `<tr><td class="desc">Fixed Monthly Salary</td><td class="amount">${fmt.format(record.monthly_salary_base || 0)}</td></tr>`,
    record.bonus_amount > 0 ? `<tr><td class="desc">Bonus Payments</td><td class="amount positive">+${fmt.format(record.bonus_amount)}</td></tr>` : '',
    record.overtime_pay > 0 ? `<tr><td class="desc">Overtime Pay</td><td class="amount positive">+${fmt.format(record.overtime_pay)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const dedRows = [
    (record.late_deduction > 0 || record.early_deduction > 0) ? `<tr><td class="desc">Attendance Penalty (Late/Early)</td><td class="amount negative">-${fmt.format((record.late_deduction || 0) + (record.early_deduction || 0))}</td></tr>` : '',
    record.leave_deduction > 0 ? `<tr><td class="desc">Leave Deduction</td><td class="amount negative">-${fmt.format(record.leave_deduction)}</td></tr>` : '',
    record.halfday_deduction_total > 0 ? `<tr><td class="desc">Half-Day Deduction</td><td class="amount negative">-${fmt.format(record.halfday_deduction_total)}</td></tr>` : '',
    record.absence_deduction_total > 0 ? `<tr><td class="desc">Unexcused Absence</td><td class="amount negative">-${fmt.format(record.absence_deduction_total)}</td></tr>` : '',
    record.advance_deducted > 0 ? `<tr><td class="desc">Advance Salary Deducted</td><td class="amount negative">-${fmt.format(record.advance_deducted)}</td></tr>` : '',
  ].filter(Boolean).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Salary Slip - ${employeeName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
    body { background-color: #f9fafb; padding: 40px; color: #111827; }
    .slip-container { background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,.1); max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 32px; }
    .brand h1 { font-size: 24px; font-weight: 700; color: #111827; }
    .brand p { font-size: 13px; color: #6b7280; }
    .title-box { text-align: right; }
    .title-box h2 { font-size: 20px; font-weight: 600; color: #374151; text-transform: uppercase; }
    .title-box p { font-size: 14px; color: #6b7280; margin-top: 4px; }
    .emp-details { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; background: #f3f4f6; padding: 20px; border-radius: 8px; }
    .d-label { font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
    .d-value { font-size: 15px; font-weight: 600; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    th { background: #f9fafb; text-align: left; padding: 12px 16px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
    td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
    .amount { text-align: right; font-weight: 500; }
    .desc { font-weight: 500; color: #374151; }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
    .subtotal-row td { background: #f9fafb; font-weight: 600; border-top: 1px solid #e5e7eb; }
    .net-section { background: #4f46e5; color: white; border-radius: 8px; padding: 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
    .net-label { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; opacity: 0.9; }
    .net-value { font-size: 36px; font-weight: 700; }
  </style></head><body>
  <div class="slip-container">
    <div class="header">
      <div class="brand"><h1>RepairShop</h1><p>Service Management System</p></div>
      <div class="title-box"><h2>Payslip</h2><p>${monthLabel}</p></div>
    </div>
    <div class="emp-details">
      <div><div class="d-label">Employee Name</div><div class="d-value">${employeeName}</div></div>
      <div><div class="d-label">Role</div><div class="d-value" style="text-transform:capitalize">${employeeRole}</div></div>
      <div><div class="d-label">Date Generated</div><div class="d-value">${today}</div></div>
      <div><div class="d-label">Status</div><div class="d-value" style="color:${record.status === 'paid' ? '#059669' : '#d97706'};text-transform:capitalize">${record.status}</div></div>
    </div>
    <table><thead><tr><th>Earnings</th><th class="amount">Amount</th></tr></thead>
    <tbody>${addRows}<tr class="subtotal-row"><td>Total Gross Salary</td><td class="amount">${fmt.format(record.gross_salary)}</td></tr></tbody></table>
    <table><thead><tr><th>Deductions</th><th class="amount">Amount</th></tr></thead>
    <tbody>${dedRows || '<tr><td class="desc">None</td><td class="amount">₹0.00</td></tr>'}
    <tr class="subtotal-row"><td>Total Deductions</td><td class="amount">-${fmt.format(record.gross_salary - record.net_salary)}</td></tr></tbody></table>
    <div class="net-section">
      <div><div class="net-label">Net Salary Payable</div><div style="font-size:13px;margin-top:4px;opacity:.8">For the month of ${monthLabel}</div></div>
      <div class="net-value">${fmt.format(record.net_salary)}</div>
    </div>
  </div></body></html>`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function SalaryScreen() {
  const { user, displayName, role } = useAuth();
  const bottomPadding = useBottomInsetPadding('nav');

  const [currentDate, setCurrentDate] = useState(new Date());
  const year     = currentDate.getFullYear();
  const monthStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
  const monthLabel = currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const [record,  setRecord]  = useState<SalaryRecord | null>(null);
  const [myRates, setMyRates] = useState<StaffRateInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [history,      setHistory]      = useState<SalaryRecord[]>([]);
  const [historyPage,  setHistoryPage]  = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [histLoading,  setHistLoading]  = useState(false);

  const [leaveDate,    setLeaveDate]    = useState('');
  const [leaveReason,  setLeaveReason]  = useState('');
  const [leaveSaving,  setLeaveSaving]  = useState(false);
  const [myLeaves,     setMyLeaves]     = useState<any[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(true);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchCurrentRecord = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (role !== 'admin') {
        const { data: rateData } = await supabase
          .from('staff_rates').select('*').eq('user_id', user.id).maybeSingle();
        if (rateData) setMyRates(rateData as StaffRateInfo);
      }

      const { data: dbData } = await supabase
        .from('salary').select('*').eq('user_id', user.id).eq('month', monthStr).maybeSingle();

      if (dbData) {
        setRecord(dbData as SalaryRecord);
      } else {
        const { data: previewData, error: previewErr } = await supabase.functions.invoke('calculate-monthly-salary', {
          body: { user_id: user.id, month: monthStr.substring(0, 7), action: 'preview' }
        });
        if (previewData && !previewErr && !previewData.error) {
          const actual = previewData.data ? previewData.data : previewData;
          setRecord({ ...actual, is_preview: true });
        } else {
          setRecord(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, monthStr, role]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setHistLoading(true);
    try {
      const from = historyPage * HISTORY_PAGE_SIZE;
      const { data, count } = await supabase
        .from('salary').select('*', { count: 'exact' })
        .eq('user_id', user.id).neq('month', monthStr)
        .order('month', { ascending: false })
        .range(from, from + HISTORY_PAGE_SIZE - 1);
      setHistory((data || []) as SalaryRecord[]);
      setHistoryTotal(count || 0);
    } finally {
      setHistLoading(false);
    }
  }, [user, monthStr, historyPage]);

  const fetchLeaves = useCallback(async () => {
    if (!user) return;
    setLeaveLoading(true);
    try {
      const { data } = await supabase
        .from('employee_leave').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
      setMyLeaves(data || []);
    } finally {
      setLeaveLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchCurrentRecord(); }, [fetchCurrentRecord]);
  useEffect(() => { fetchHistory(); },        [fetchHistory]);
  useEffect(() => { fetchLeaves(); },         [fetchLeaves]);

  const handleDownload = async (r: SalaryRecord) => {
    if (!user) return;
    setDownloadingId(r.id);
    try {
      const html = generateSlipHtml(r, displayName || 'Employee', role || '');
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const fileName = `RepairShop_Payslip_${r.month.substring(0, 7)}.pdf`;
      // @ts-ignore
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        // @ts-ignore
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, 'application/pdf');
        const base64Data = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: 'base64' });
        Alert.alert('Download Complete', 'Your salary slip has been saved.');
      } else {
        Alert.alert('Permission Denied', 'Unable to save the file without folder permission.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not download salary slip.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleApplyLeave = async () => {
    if (!user || !leaveDate) {
      Alert.alert('Date required', 'Please select a leave date.');
      return;
    }
    setLeaveSaving(true);
    let errorObj = null;
    try {
      const { error } = await supabase.from('employee_leave').insert({
        user_id: user.id, leave_date: leaveDate, status: 'pending',
        reason: leaveReason.trim() || null,
      });
      errorObj = error;
    } finally {
      setLeaveSaving(false);
    }
    if (errorObj) {
      Alert.alert('Error', errorObj.message);
    } else {
      Alert.alert('Leave Requested', 'Your leave request has been submitted for approval.');
      setLeaveDate(''); setLeaveReason('');
      fetchLeaves();
    }
  };

  const totalHistoryPages = Math.ceil(historyTotal / HISTORY_PAGE_SIZE);

  return (
    <View style={styles.container}>
      <AppHeader title="My Salary" showBack={false} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Navigator */}
        <View style={styles.monthSelector}>
          <AppPressable style={styles.monthBtn}
            onPress={() => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1))}>
            <ChevronLeft size={20} color={colors.textPrimary} />
          </AppPressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <AppPressable style={styles.monthBtn}
            onPress={() => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1))}>
            <ChevronRight size={20} color={colors.textPrimary} />
          </AppPressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading salary data...</Text>
          </View>
        ) : !record ? (
          <View style={styles.emptyCard}>
            <FileText size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Record Yet</Text>
            <Text style={styles.emptyText}>
              Salary for this month has not been generated yet. Please contact admin.
            </Text>
          </View>
        ) : (
          <>
            {myRates && (
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={styles.sectionTitle}>My Salary Rules & Rates</Text>
                <SalaryRatesCard rates={myRates} />
              </View>
            )}

            <SalaryHeroCard record={record} downloadingId={downloadingId} onDownload={handleDownload} />

            <SalaryBreakdownCard record={record} />

            <Text style={styles.sectionTitle}>Attendance Summary</Text>
            <SalaryAttendanceSummary
              workingDays={record.working_days}
              presentDays={record.present_days}
              halfdayCount={record.halfday_count}
              leaveCount={record.leave_count}
            />

            <Text style={styles.sectionTitle}>Apply for Leave</Text>
            <LeaveApplicationCard
              leaveDate={leaveDate}
              leaveReason={leaveReason}
              leaveSaving={leaveSaving}
              onChangleDate={setLeaveDate}
              onChangeReason={setLeaveReason}
              onSubmit={handleApplyLeave}
            />

            <Text style={styles.sectionTitle}>Recent Leave Requests</Text>
            <LeaveHistoryList leaves={myLeaves} loading={leaveLoading} />
          </>
        )}

        <Text style={styles.sectionTitle}>Salary History</Text>
        <SalaryHistoryList
          history={history}
          loading={histLoading}
          page={historyPage}
          totalPages={totalHistoryPages}
          downloadingId={downloadingId}
          onPrev={() => setHistoryPage(p => Math.max(0, p - 1))}
          onNext={() => setHistoryPage(p => Math.min(totalHistoryPages - 1, p + 1))}
          onDownload={handleDownload}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingTop: spacing.md, paddingHorizontal: spacing.lg },
  monthSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.md,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  monthBtn: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.backgroundAlt },
  monthLabel: { ...typography.h3, color: colors.textPrimary },
  loadingContainer: { padding: spacing.xxl, alignItems: 'center' },
  loadingText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  emptyCard: {
    backgroundColor: colors.surface, padding: spacing.xl, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg, gap: spacing.sm,
  },
  emptyTitle: { ...typography.bodyBold, color: colors.textPrimary },
  emptyText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  sectionTitle: {
    ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md, marginTop: spacing.sm,
  },
});
