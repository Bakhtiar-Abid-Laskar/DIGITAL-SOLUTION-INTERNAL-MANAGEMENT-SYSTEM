import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../tokens';

type SalaryRecord = any;

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function fmtMonth(monthStr: string) {
  if (!monthStr) return '';
  return new Date(monthStr).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

interface Props {
  history: SalaryRecord[];
  loading: boolean;
  page: number;
  totalPages: number;
  downloadingId: string | null;
  onPrev: () => void;
  onNext: () => void;
  onDownload: (r: SalaryRecord) => void;
}

export function SalaryHistoryList({ history, loading, page, totalPages, downloadingId, onPrev, onNext, onDownload }: Props) {
  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />;
  }
  if (history.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <FileText size={28} color={colors.textMuted} />
        <Text style={styles.emptyText}>No previous salary records.</Text>
      </View>
    );
  }

  return (
    <>
      {history.map(r => {
        const isPaid = r.status === 'paid' && r.net_salary > 0;
        const isNotProcessed = r.net_salary === 0;
        const statusBg = isPaid ? colors.statusCompletedBg : isNotProcessed ? colors.backgroundAlt : colors.warningAmberBg;
        const statusColor = isPaid ? colors.accentGreen : isNotProcessed ? colors.textMuted : colors.warningAmber;
        const statusLabel = isPaid ? 'Paid' : isNotProcessed ? 'Not Processed' : 'Draft';

        return (
          <View key={r.id} style={styles.historyCard}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyMonth}>{fmtMonth(r.month)}</Text>
              <View style={[styles.badge, { backgroundColor: statusBg }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
            <View style={styles.historyRight}>
              <Text style={styles.historyNet}>{fmt.format(r.net_salary)}</Text>
              <AppPressable style={styles.histDownloadBtn} onPress={() => onDownload(r)} disabled={downloadingId === r.id}>
                {downloadingId === r.id
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Download size={16} color={colors.primary} />}
              </AppPressable>
            </View>
          </View>
        );
      })}

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <AppPressable style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]} onPress={onPrev} disabled={page === 0}>
            <ChevronLeft size={18} color={page === 0 ? colors.textMuted : colors.primary} />
          </AppPressable>
          <Text style={styles.pageText}>{page + 1} / {totalPages}</Text>
          <AppPressable style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnDisabled]} onPress={onNext} disabled={page >= totalPages - 1}>
            <ChevronRight size={18} color={page >= totalPages - 1 ? colors.textMuted : colors.primary} />
          </AppPressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  emptyText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLeft: { flex: 1, gap: 4 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyMonth: { ...typography.bodyBold, color: colors.textPrimary },
  historyNet: { ...typography.h3, color: colors.textPrimary, fontSize: 16 },
  histDownloadBtn: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  pageBtn: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
});
