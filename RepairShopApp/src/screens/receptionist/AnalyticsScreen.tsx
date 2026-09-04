import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Calendar, ChevronDown } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/common/AppHeader';
import BottomSheet from '../../components/common/BottomSheet';
import { SkeletonList } from '../../components/common/SkeletonCard';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';

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

export default function AnalyticsScreen() {
  const navigation = useNavigation<any>();
  const bottomPadding = useBottomInsetPadding('nav');
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(() => getDefaultMonth());
  const [monthPicker, setMonthPicker] = useState(false);
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // Bar Chart Stats
  const [received, setReceived] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [completed, setCompleted] = useState(0);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);

      const [y, m] = month.split('-').map(Number);
      const start = `${month}-01T00:00:00.000Z`;
      const nextMonth = m === 12
        ? `${y + 1}-01-01T00:00:00.000Z`
        : `${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00.000Z`;

      const [recRes, progRes, waitRes, compRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Received')
          .gte('created_at', start)
          .lt('created_at', nextMonth),
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'In Progress')
          .gte('created_at', start)
          .lt('created_at', nextMonth),
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Waiting for Materials')
          .gte('created_at', start)
          .lt('created_at', nextMonth),
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Completed')
          .gte('created_at', start)
          .lt('created_at', nextMonth),
      ]);

      setReceived(recRes.count ?? 0);
      setInProgress((progRes.count ?? 0) + (waitRes.count ?? 0));
      setCompleted(compRes.count ?? 0);

    } catch (err) {
      console.error('Error fetching analytics data', err);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      fetchAnalyticsData();
    }, [fetchAnalyticsData])
  );

  // Calculate max for bar chart scaling
  const maxBarVal = Math.max(received, inProgress, completed, 1);
  const getBarHeight = (val: number) => (val / maxBarVal) * 150;

  return (
    <View style={styles.container}>
      <AppHeader title="Analytics" />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
        
        {/* DATE CONTROLS */}
        <View style={styles.dateRow}>
          <AppPressable style={styles.datePill} onPress={() => setMonthPicker(true)}>
            <Text style={styles.datePillText}>{getMonthLabel(month)}</Text>
            <ChevronDown size={16} color={colors.textSecondary} style={{ marginLeft: spacing.sm }} />
          </AppPressable>
          <AppPressable style={styles.calendarBtn} onPress={() => setMonthPicker(true)}>
            <Calendar size={20} color={colors.textSecondary} />
          </AppPressable>
        </View>

        {loading ? (
          <SkeletonList count={3} />
        ) : (
          <>
            {/* JOBS OVERVIEW CHART */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Jobs Overview</Text>
              
              <View style={styles.chartContainer}>
                {/* Chart Area */}
                <View style={styles.chartArea}>
                  
                  <AppPressable style={styles.barGroup} onPress={() => navigation.navigate('Jobs', { filter: 'Received' })}>
                    <View style={styles.barValueWrapper}>
                      <Text style={styles.barValue}>{received}</Text>
                    </View>
                    <View style={[styles.bar, { height: Math.max(getBarHeight(received), 4), backgroundColor: colors.accentBlue }]} />
                    <Text style={styles.barLabel}>Recv</Text>
                  </AppPressable>

                  <AppPressable style={styles.barGroup} onPress={() => navigation.navigate('Jobs', { filter: 'In Progress' })}>
                    <View style={styles.barValueWrapper}>
                      <Text style={styles.barValue}>{inProgress}</Text>
                    </View>
                    <View style={[styles.bar, { height: Math.max(getBarHeight(inProgress), 4), backgroundColor: colors.accentOrange }]} />
                    <Text style={styles.barLabel}>Prog</Text>
                  </AppPressable>

                  <AppPressable style={styles.barGroup} onPress={() => navigation.navigate('Jobs', { filter: 'Completed' })}>
                    <View style={styles.barValueWrapper}>
                      <Text style={styles.barValue}>{completed}</Text>
                    </View>
                    <View style={[styles.bar, { height: Math.max(getBarHeight(completed), 4), backgroundColor: colors.accentGreen }]} />
                    <Text style={styles.barLabel}>Done</Text>
                  </AppPressable>

                </View>

                {/* Y-Axis Line (visual only) */}
                <View style={styles.chartYAxis} />
                <View style={styles.chartXAxis} />
              </View>

              {/* Legend */}
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accentBlue }]} />
                  <Text style={styles.legendText}>Received</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accentOrange }]} />
                  <Text style={styles.legendText}>In Progress</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accentGreen }]} />
                  <Text style={styles.legendText}>Completed</Text>
                </View>
              </View>
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
            onPress={() => {
              setMonth(m);
              setMonthPicker(false);
            }}
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  datePillText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  calendarBtn: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.card,
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
    height: 180,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  chartYAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
  },
  chartXAxis: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  chartArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingLeft: spacing.sm,
    paddingBottom: 1, 
  },
  barGroup: {
    alignItems: 'center',
    width: 40,
  },
  barValueWrapper: {
    marginBottom: spacing.xs,
  },
  barValue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  bar: {
    width: 24,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4, 
  },
  barLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    position: 'absolute',
    bottom: -24,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  monthOption: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthOptionSelected: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  monthOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
