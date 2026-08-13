import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronDown, Trophy, TrendingUp } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/common/AppHeader';
import BottomSheet from '../../components/common/BottomSheet';
import { SkeletonList } from '../../components/common/SkeletonCard';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { formatCurrency } from '@repairshop/shared';

type TechStats = {
  id: string;
  name: string;
  completedJobs: number;
  revenue: number;
};

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

export default function ReportsScreen() {
  const bottomPadding = useBottomInsetPadding('nav');
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(() => getDefaultMonth());
  const [monthPicker, setMonthPicker] = useState(false);
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // Chart stats
  const [received, setReceived] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Leaderboard
  const [techStats, setTechStats] = useState<TechStats[]>([]);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);

      const [y, m] = month.split('-').map(Number);
      const start = `${month}-01T00:00:00.000Z`;
      const nextMonth = m === 12
        ? `${y + 1}-01-01T00:00:00.000Z`
        : `${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00.000Z`;

      // 1. Fetch jobs in the selected month
      const { data: allJobs } = await supabase
        .from('jobs')
        .select('id, status, technician_id')
        .gte('created_at', start)
        .lt('created_at', nextMonth);

      let rec = 0, inp = 0, comp = 0;
      allJobs?.forEach(j => {
        if (j.status === 'Received') rec++;
        else if (j.status === 'In Progress' || j.status === 'Waiting for Materials') inp++;
        else if (j.status === 'Completed') comp++;
      });
      setReceived(rec);
      setInProgress(inp);
      setCompleted(comp);

      // 2. Revenue for the month
      const { data: bills } = await supabase
        .from('billing')
        .select('grand_total, job_id')
        .gte('created_at', start)
        .lt('created_at', nextMonth);

      const rev = (bills || []).reduce((sum, b) => sum + (b.grand_total || 0), 0);
      setTotalRevenue(rev);

      // 3. Technician leaderboard — completed jobs in this month
      const { data: techs } = await supabase.from('users').select('id, name').eq('role', 'technician');

      if (techs && allJobs) {
        const stats: TechStats[] = techs.map(t => {
          const techJobs = allJobs.filter(j => j.technician_id === t.id && j.status === 'Completed');
          let techRev = 0;
          techJobs.forEach(tj => {
            const bill = bills?.find(b => b.job_id === tj.id);
            if (bill && bill.grand_total) techRev += bill.grand_total;
          });
          return { id: t.id, name: t.name, completedJobs: techJobs.length, revenue: techRev };
        });

        stats.sort((a, b) => b.completedJobs - a.completedJobs);
        setTechStats(stats.filter(t => t.completedJobs > 0 || true)); // show all
      }
    } catch (err) {
      console.error('Error fetching report data', err);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      fetchReportData();
    }, [fetchReportData])
  );

  const maxBarVal = Math.max(received, inProgress, completed, 1);
  const getBarHeight = (val: number) => (val / maxBarVal) * 150;

  return (
    <View style={styles.container}>
      <AppHeader title="Reports" showBack={false} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>

        {/* MONTH PICKER */}
        <View style={styles.monthRow}>
          <Text style={styles.monthLabel}>Period</Text>
          <AppPressable style={styles.monthPill} onPress={() => setMonthPicker(true)}>
            <Text style={styles.monthPillText}>{getMonthLabel(month)}</Text>
            <ChevronDown size={16} color={colors.textSecondary} style={{ marginLeft: spacing.sm }} />
          </AppPressable>
        </View>

        {loading ? (
          <SkeletonList count={3} />
        ) : (
          <>
            {/* REVENUE KPI */}
            <View style={styles.revenueCard}>
              <TrendingUp size={20} color={colors.accentGreen} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.revenueLabel}>Revenue — {getMonthLabel(month)}</Text>
                <Text style={styles.revenueValue}>{formatCurrency(totalRevenue)}</Text>
              </View>
            </View>

            {/* JOBS OVERVIEW CHART */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Jobs Overview</Text>

              <View style={styles.chartContainer}>
                <View style={styles.chartArea}>
                  <View style={styles.barGroup}>
                    <View style={styles.barValueWrapper}>
                      <Text style={styles.barValue}>{received}</Text>
                    </View>
                    <View style={[styles.bar, { height: Math.max(getBarHeight(received), 4), backgroundColor: colors.accentBlue }]} />
                    <Text style={styles.barLabel}>Received</Text>
                  </View>

                  <View style={styles.barGroup}>
                    <View style={styles.barValueWrapper}>
                      <Text style={styles.barValue}>{inProgress}</Text>
                    </View>
                    <View style={[styles.bar, { height: Math.max(getBarHeight(inProgress), 4), backgroundColor: colors.accentOrange }]} />
                    <Text style={styles.barLabel}>In Progress</Text>
                  </View>

                  <View style={styles.barGroup}>
                    <View style={styles.barValueWrapper}>
                      <Text style={styles.barValue}>{completed}</Text>
                    </View>
                    <View style={[styles.bar, { height: Math.max(getBarHeight(completed), 4), backgroundColor: colors.success }]} />
                    <Text style={styles.barLabel}>Completed</Text>
                  </View>
                </View>
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accentBlue }]} />
                  <Text style={styles.legendText}>Received</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accentOrange }]} />
                  <Text style={styles.legendText}>In Progress</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                  <Text style={styles.legendText}>Completed</Text>
                </View>
              </View>
            </View>

            {/* TOP TECHNICIANS */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top Technicians</Text>

              {techStats.length === 0 ? (
                <Text style={{ ...typography.body, color: colors.textMuted, padding: spacing.md }}>
                  No technicians registered.
                </Text>
              ) : (
                techStats.slice(0, 5).map((tech, index) => {
                  let badgeBg = colors.backgroundAlt;
                  if (index === 0) badgeBg = colors.accentOrange;       // gold
                  else if (index === 1) badgeBg = colors.textMuted;     // silver
                  else if (index === 2) badgeBg = '#CD7F32';            // bronze — no token equivalent, kept intentionally

                  return (
                    <View key={tech.id} style={styles.leaderboardRow}>
                      <View style={[styles.rankBadge, { backgroundColor: badgeBg }]}>
                        {index < 3
                          ? <Trophy size={14} color={colors.textInverse} />
                          : <Text style={styles.rankText}>{index + 1}</Text>
                        }
                      </View>

                      <Text style={styles.techName} numberOfLines={1}>{tech.name}</Text>

                      <View style={styles.techStats}>
                        <Text style={styles.techJobs}>{tech.completedJobs} jobs</Text>
                        <Text style={styles.techRev}>{formatCurrency(tech.revenue)}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  monthLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  monthPillText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  revenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.statusCompletedBg,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  revenueLabel: {
    ...typography.caption,
    color: colors.accentGreen,
    marginBottom: 2,
  },
  revenueValue: {
    ...typography.h2,
    color: colors.accentGreen,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  chartContainer: {
    height: 200,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
  },
  chartArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  barGroup: {
    alignItems: 'center',
  },
  barValueWrapper: {
    marginBottom: 4,
  },
  barValue: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  bar: {
    width: 40,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 60,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  techName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
  },
  techStats: {
    alignItems: 'flex-end',
  },
  techJobs: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  techRev: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
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
});
