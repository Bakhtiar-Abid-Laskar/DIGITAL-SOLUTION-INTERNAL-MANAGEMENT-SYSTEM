import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, ChevronDown } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/common/AppHeader';
import { SkeletonList } from '../../components/common/SkeletonCard';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';

export default function AnalyticsScreen() {
  const bottomPadding = useBottomInsetPadding('nav');
  const [loading, setLoading] = useState(true);

  // Bar Chart Stats
  const [received, setReceived] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [completed, setCompleted] = useState(0);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      const [recRes, progRes, waitRes, compRes] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Received'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'In Progress'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Waiting for Materials'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Completed'),
      ]);

      setReceived(recRes.count ?? 0);
      setInProgress((progRes.count ?? 0) + (waitRes.count ?? 0));
      setCompleted(compRes.count ?? 0);

    } catch (err) {
      console.error('Error fetching analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnalyticsData();
    }, [])
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
          <AppPressable style={styles.datePill}>
            <Text style={styles.datePillText}>01 May – 14 May 2025</Text>
            <ChevronDown size={16} color={colors.textSecondary} style={{ marginLeft: spacing.sm }} />
          </AppPressable>
          <AppPressable style={styles.calendarBtn}>
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
                  
                  <View style={styles.barGroup}>
                    <View style={styles.barValueWrapper}>
                      <Text style={styles.barValue}>{received}</Text>
                    </View>
                    <View style={[styles.bar, { height: getBarHeight(received), backgroundColor: colors.accentBlue }]} />
                    <Text style={styles.barLabel}>Recv</Text>
                  </View>

                  <View style={styles.barGroup}>
                    <View style={styles.barValueWrapper}>
                      <Text style={styles.barValue}>{inProgress}</Text>
                    </View>
                    <View style={[styles.bar, { height: getBarHeight(inProgress), backgroundColor: colors.accentOrange }]} />
                    <Text style={styles.barLabel}>Prog</Text>
                  </View>

                  <View style={styles.barGroup}>
                    <View style={styles.barValueWrapper}>
                      <Text style={styles.barValue}>{completed}</Text>
                    </View>
                    <View style={[styles.bar, { height: getBarHeight(completed), backgroundColor: colors.accentGreen }]} />
                    <Text style={styles.barLabel}>Done</Text>
                  </View>

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
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    ...shadow.card,
  },
  datePillText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  calendarBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
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
});
