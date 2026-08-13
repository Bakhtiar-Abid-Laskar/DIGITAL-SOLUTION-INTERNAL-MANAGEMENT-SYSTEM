import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, KeyboardAvoidingView, Platform,  } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useFocusEffect } from '@react-navigation/native';
import { TrendingDown, Plus, ChevronDown } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '@repairshop/shared';
import AppHeader from '../../components/common/AppHeader';
import BottomSheet from '../../components/common/BottomSheet';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import SkeletonCard from '../../components/common/SkeletonCard';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

type PaymentType = 'materials_purchase' | 'daily_expenditure' | 'office_development';

type Payment = {
  id: string;
  type: PaymentType;
  amount: number;
  description: string | null;
  created_at: string;
};

const TYPE_LABELS: Record<PaymentType, string> = {
  materials_purchase: 'Materials Purchase',
  daily_expenditure: 'Daily Expenditure',
  office_development: 'Office Development',
};

const TYPE_COLORS: Record<PaymentType, { bg: string; fg: string }> = {
  materials_purchase: { bg: colors.statusReceivedBg, fg: colors.accentBlue },
  daily_expenditure: { bg: colors.statusWaitingBg, fg: colors.accentOrange },
  office_development: { bg: colors.accentLightPurpleDim, fg: colors.accentLightPurple },
};

const EXPENDITURE_TYPES: Array<{ value: PaymentType; label: string }> = [
  { value: 'materials_purchase', label: 'Materials Purchase' },
  { value: 'daily_expenditure', label: 'Daily Expenditure' },
  { value: 'office_development', label: 'Office Development' },
];

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
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

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const ExpenditureRow = React.memo(function ExpenditureRow({ item }: { item: Payment }) {
  const typeColor = TYPE_COLORS[item.type] ?? { bg: colors.backgroundAlt, fg: colors.textSecondary };
  const badgeStyle = useMemo(() => [styles.typeBadge, { backgroundColor: typeColor.bg }], [typeColor.bg]);
  const textStyle = useMemo(() => [styles.typeBadgeText, { color: typeColor.fg }], [typeColor.fg]);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={badgeStyle}>
          <Text style={textStyle}>
            {TYPE_LABELS[item.type]}
          </Text>
        </View>
        <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
      </View>
      {item.description ? (
        <Text style={styles.description}>{item.description}</Text>
      ) : null}
      <Text style={styles.date}>{formatDate(item.created_at)}</Text>
    </View>
  );
});

export default function ExpenditureScreen() {
  const bottomPadding = useBottomInsetPadding('nav');
  const { showToast } = useToast();
  const { user } = useAuth();

  const renderExpenditureItem = useCallback(({ item }: { item: Payment }) => (
    <ExpenditureRow item={item} />
  ), []);

  const [month, setMonth] = useState(() => getDefaultMonth());
  const [monthPicker, setMonthPicker] = useState(false);
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add form
  const [addVisible, setAddVisible] = useState(false);
  const [formType, setFormType] = useState<PaymentType>('daily_expenditure');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [typePicker, setTypePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPayments = async () => {
    try {
      const [y, m] = month.split('-').map(Number);
      const start = `${month}-01T00:00:00.000Z`;
      const nextMonth = m === 12
        ? `${y + 1}-01-01T00:00:00.000Z`
        : `${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00.000Z`;

      const { data, error } = await supabase
        .from('payments')
        .select('id, type, amount, description, created_at')
        .in('type', ['materials_purchase', 'daily_expenditure', 'office_development'])
        .gte('created_at', start)
        .lt('created_at', nextMonth)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments((data || []) as Payment[]);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPayments();
    }, [month])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleAddExpenditure = async () => {
    const amount = parseFloat(formAmount);
    if (!formAmount || isNaN(amount) || amount <= 0) {
      showToast({ title: 'Validation', message: 'Enter a valid amount greater than 0.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('payments').insert({
        type: formType,
        amount,
        description: formDescription.trim() || null,
        created_by: user?.id ?? null,
      });

      if (error) throw error;

      showToast({ title: 'Expenditure Added', message: `${formatCurrency(amount)} recorded.`, type: 'success' });
      setFormAmount('');
      setFormDescription('');
      setAddVisible(false);
      fetchPayments();
    } catch (err: any) {
      showToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };



  return (
    <View style={styles.container}>
      <AppHeader
        title="Expenditure"
        showBack={true}
        rightIcon={<Plus size={20} color={colors.accentBlue} strokeWidth={2.5} />}
        onRightPress={() => setAddVisible(true)}
      />

      <FlatList
        data={payments}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            {/* Month picker */}
            <View style={styles.monthRow}>
              <Text style={styles.sectionLabel}>Month</Text>
              <AppPressable style={styles.monthPill} onPress={() => setMonthPicker(true)}>
                <Text style={styles.monthPillText}>{getMonthLabel(month)}</Text>
                <ChevronDown size={16} color={colors.textSecondary} style={{ marginLeft: spacing.sm }} />
              </AppPressable>
            </View>

            {/* Summary card */}
            <View style={styles.summaryCard}>
              <TrendingDown size={20} color={colors.accentRed} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.summaryLabel}>Total Expenditure</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
              </View>
              <Text style={styles.summaryCount}>{payments.length} entries</Text>
            </View>

            {loading && !refreshing && (
              <View>
                {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={<TrendingDown size={44} color={colors.textMuted} strokeWidth={1.5} />}
              heading="No expenditures"
              subtext={`No entries recorded for ${getMonthLabel(month)}.`}
            />
          ) : null
        }
        renderItem={renderExpenditureItem}
      />

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

      {/* Add Expenditure Sheet */}
      <BottomSheet visible={addVisible} onClose={() => { if (!saving) setAddVisible(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={{ ...typography.h2, marginBottom: spacing.xl }}>Add Expenditure</Text>

          <Text style={styles.fieldLabel}>Type *</Text>
          <AppPressable style={styles.pickerRow} onPress={() => setTypePicker(true)}>
            <Text style={styles.pickerText}>{TYPE_LABELS[formType]}</Text>
            <ChevronDown size={16} color={colors.textSecondary} />
          </AppPressable>

          <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Amount (₹) *</Text>
          <TextInput
            style={styles.input}
            value={formAmount}
            onChangeText={setFormAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder="What was this for?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
            <Button label="Cancel" variant="secondary" onPress={() => setAddVisible(false)} style={{ flex: 1 }} />
            <Button label="Add Entry" onPress={handleAddExpenditure} loading={saving} style={{ flex: 1 }} />
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>

      {/* Type Picker Sub-sheet */}
      <BottomSheet visible={typePicker} onClose={() => setTypePicker(false)}>
        <Text style={{ ...typography.h2, marginBottom: spacing.lg }}>Select Type</Text>
        {EXPENDITURE_TYPES.map(t => (
          <AppPressable
            key={t.value}
            style={[styles.monthOption, formType === t.value && styles.monthOptionSelected]}
            onPress={() => { setFormType(t.value); setTypePicker(false); }}
          >
            <Text style={[styles.monthOptionText, formType === t.value && { color: colors.primary, fontWeight: '700' }]}>
              {t.label}
            </Text>
          </AppPressable>
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.statusUrgentBg,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.accentRed,
  },
  summaryValue: {
    ...typography.h2,
    color: colors.accentRed,
  },
  summaryCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  amount: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  date: {
    ...typography.caption,
    color: colors.textMuted,
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
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  pickerRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.card,
  },
  pickerText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    ...shadow.card,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
