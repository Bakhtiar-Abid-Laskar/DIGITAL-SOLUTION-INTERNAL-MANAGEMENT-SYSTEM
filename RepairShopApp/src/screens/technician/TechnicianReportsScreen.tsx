import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  Wrench,
  MapPin,
  Package,
  TrendingUp,
  Award,
  Calendar,
  Layers,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/common/AppHeader';
import BottomSheet from '../../components/common/BottomSheet';
import { SkeletonList } from '../../components/common/SkeletonCard';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/jobs/StatusBadge';
import PriorityBadge from '../../components/jobs/PriorityBadge';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(ym: string): string {
  if (ym === 'all') return 'All Time';
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function generateMonthOptions(): { id: string; label: string }[] {
  const options: { id: string; label: string }[] = [{ id: 'all', label: 'All Time' }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({ id, label: getMonthLabel(id) });
  }
  return options;
}

export default function TechnicianReportsScreen() {
  const navigation = useNavigation<any>();
  const { user, displayName } = useAuth();
  const bottomPadding = useBottomInsetPadding('nav');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [month, setMonth] = useState(() => getDefaultMonth());
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [activeListTab, setActiveListTab] = useState<'All' | 'Completed' | 'In Progress'>('All');

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // Stats
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [onsiteCount, setOnsiteCount] = useState(0);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [techJobs, setTechJobs] = useState<any[]>([]);

  const fetchTechnicianReport = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      let query = supabase
        .from('jobs')
        .select('*, job_technicians!inner(technician_id, removed_at)')
        .eq('job_technicians.technician_id', user.id)
        .is('job_technicians.removed_at', null)
        .order('created_at', { ascending: false });

      if (month !== 'all') {
        const [y, m] = month.split('-').map(Number);
        const start = `${month}-01T00:00:00.000Z`;
        const nextMonth = m === 12
          ? `${y + 1}-01-01T00:00:00.000Z`
          : `${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00.000Z`;

        query = query.gte('created_at', start).lt('created_at', nextMonth);
      }

      // Concurrently query jobs, onsite visits, and materials
      const [jobsRes, onsiteRes, materialsRes] = await Promise.all([
        query,
        supabase
          .from('onsite_visits')
          .select('id', { count: 'exact', head: true })
          .eq('technician_id', user.id),
        supabase
          .from('job_materials')
          .select('id, quantity', { count: 'exact' })
          .eq('allotted_to_id', user.id),
      ]);

      if (jobsRes.error) throw jobsRes.error;

      const jobsData = jobsRes.data || [];
      setTechJobs(jobsData);
      setTotalAssigned(jobsData.length);

      let comp = 0;
      let inProg = 0;
      let wait = 0;
      let recv = 0;

      jobsData.forEach((j: any) => {
        if (j.status === 'Completed' || j.status === 'Delivered') comp++;
        else if (j.status === 'In Progress') inProg++;
        else if (j.status === 'Waiting for Materials') wait++;
        else if (j.status === 'Received') recv++;
      });

      setCompletedCount(comp);
      setInProgressCount(inProg);
      setWaitingCount(wait);
      setReceivedCount(recv);

      setOnsiteCount(onsiteRes.count ?? 0);

      const totalMats = (materialsRes.data || []).reduce((acc: number, curr: any) => acc + (Number(curr.quantity) || 1), 0);
      setMaterialsCount(totalMats);
    } catch (err) {
      console.error('Error fetching technician report data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, month]);

  useFocusEffect(
    useCallback(() => {
      fetchTechnicianReport();
    }, [fetchTechnicianReport])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTechnicianReport();
  };

  const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

  const filteredJobs = useMemo(() => {
    if (activeListTab === 'Completed') {
      return techJobs.filter((j) => j.status === 'Completed' || j.status === 'Delivered');
    }
    if (activeListTab === 'In Progress') {
      return techJobs.filter((j) => j.status === 'In Progress' || j.status === 'Waiting for Materials' || j.status === 'Received');
    }
    return techJobs;
  }, [techJobs, activeListTab]);

  return (
    <View style={styles.container}>
      <AppHeader title="Work Reports" showBack={true} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 30 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Month Filter Bar */}
        <View style={styles.filterSection}>
          <AppPressable style={styles.monthSelector} onPress={() => setMonthPickerVisible(true)}>
            <Calendar size={18} color={colors.accentGreen} />
            <Text style={styles.monthSelectorText}>{getMonthLabel(month)}</Text>
            <ChevronDown size={18} color={colors.textSecondary} />
          </AppPressable>
        </View>

        {loading && !refreshing ? (
          <SkeletonList count={3} />
        ) : (
          <>
            {/* HERO PERFORMANCE CARD */}
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.heroBadge}>
                  <Award size={18} color={colors.accentGreen} />
                  <Text style={styles.heroBadgeText}>Technician Performance</Text>
                </View>
                <Text style={styles.heroCompletionRate}>{completionRate}%</Text>
              </View>
              <Text style={styles.heroSubtitle}>
                {completedCount} of {totalAssigned} assigned jobs completed
              </Text>

              {/* Progress bar */}
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(completionRate, 100)}%` }]} />
              </View>

              <View style={styles.heroFooter}>
                <View style={styles.heroFooterItem}>
                  <Text style={styles.heroFooterLabel}>Completed</Text>
                  <Text style={[styles.heroFooterValue, { color: colors.accentGreen }]}>{completedCount}</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroFooterItem}>
                  <Text style={styles.heroFooterLabel}>In Progress</Text>
                  <Text style={[styles.heroFooterValue, { color: colors.accentOrange }]}>{inProgressCount + waitingCount}</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroFooterItem}>
                  <Text style={styles.heroFooterLabel}>Assigned</Text>
                  <Text style={[styles.heroFooterValue, { color: colors.accentBlue }]}>{totalAssigned}</Text>
                </View>
              </View>
            </View>

            {/* 4-KPI SUMMARY TILES */}
            <View style={styles.kpiGrid}>
              <AppPressable style={styles.kpiCard} onPress={() => setActiveListTab('All')}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: colors.accentBlue + '15' }]}>
                  <Wrench size={20} color={colors.accentBlue} />
                </View>
                <Text style={styles.kpiValue}>{totalAssigned}</Text>
                <Text style={styles.kpiLabel}>Total Jobs</Text>
              </AppPressable>

              <AppPressable style={styles.kpiCard} onPress={() => setActiveListTab('Completed')}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: colors.accentGreen + '15' }]}>
                  <CheckCircle2 size={20} color={colors.accentGreen} />
                </View>
                <Text style={styles.kpiValue}>{completedCount}</Text>
                <Text style={styles.kpiLabel}>Resolved</Text>
              </AppPressable>

              <AppPressable style={styles.kpiCard} onPress={() => setActiveListTab('All')}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: colors.accentLightPurple + '15' }]}>
                  <MapPin size={20} color={colors.accentLightPurple} />
                </View>
                <Text style={styles.kpiValue}>{onsiteCount}</Text>
                <Text style={styles.kpiLabel}>Onsite Visits</Text>
              </AppPressable>

              <AppPressable style={styles.kpiCard} onPress={() => navigation.navigate('AllottedMaterialsScreen', { mode: 'scoped' })}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: colors.accentOrange + '15' }]}>
                  <Package size={20} color={colors.accentOrange} />
                </View>
                <Text style={styles.kpiValue}>{materialsCount}</Text>
                <Text style={styles.kpiLabel}>Parts Used</Text>
              </AppPressable>
            </View>

            {/* WORK BREAKDOWN SECTION */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Work Breakdown</Text>
              <Text style={styles.sectionBadge}>{filteredJobs.length} Jobs</Text>
            </View>

            {/* Segmented Filter Buttons */}
            <View style={styles.tabFilterRow}>
              {(['All', 'Completed', 'In Progress'] as const).map((tab) => (
                <AppPressable
                  key={tab}
                  style={[styles.tabButton, activeListTab === tab && styles.tabButtonActive]}
                  onPress={() => setActiveListTab(tab)}
                >
                  <Text style={[styles.tabButtonText, activeListTab === tab && styles.tabButtonTextActive]}>
                    {tab}
                  </Text>
                </AppPressable>
              ))}
            </View>

            {/* Jobs List */}
            {filteredJobs.length === 0 ? (
              <EmptyState
                icon={Wrench}
                message={`No ${activeListTab.toLowerCase()} jobs`}
                subMessage="No job records found for the selected timeframe."
                compact={true}
              />
            ) : (
              <View style={styles.jobList}>
                {filteredJobs.map((job) => (
                  <AppPressable
                    key={job.id}
                    style={styles.jobCard}
                    onPress={() => navigation.navigate('UpdateWork', { jobId: job.id })}
                  >
                    <View style={styles.jobHeader}>
                      <Text style={styles.jobCode}>{job.job_code}</Text>
                      <StatusBadge status={job.status} />
                    </View>

                    <Text style={styles.jobCustomer}>{job.customer_name || 'Walk-in Customer'}</Text>
                    <Text style={styles.jobDevice}>
                      {job.device_type} {job.reported_issue ? `• ${job.reported_issue}` : ''}
                    </Text>

                    <View style={styles.jobFooter}>
                      <PriorityBadge priority={job.priority || 'Normal'} />
                      <Text style={styles.jobDate}>
                        {job.completed_at
                          ? `Done: ${new Date(job.completed_at).toLocaleDateString()}`
                          : `Created: ${new Date(job.created_at).toLocaleDateString()}`}
                      </Text>
                    </View>
                  </AppPressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Month Picker Bottom Sheet */}
      <BottomSheet visible={monthPickerVisible} onClose={() => setMonthPickerVisible(false)}>
        <Text style={{ ...typography.h2, marginBottom: spacing.md, paddingHorizontal: spacing.md }}>
          Select Time Period
        </Text>
        <ScrollView style={{ maxHeight: 350, paddingHorizontal: spacing.md }}>
          {monthOptions.map((opt) => (
            <AppPressable
              key={opt.id}
              style={[styles.monthOption, month === opt.id && styles.monthOptionSelected]}
              onPress={() => {
                setMonth(opt.id);
                setMonthPickerVisible(false);
              }}
            >
              <Text
                style={[
                  styles.monthOptionText,
                  month === opt.id && { color: colors.accentGreen, fontWeight: '700' },
                ]}
              >
                {opt.label}
              </Text>
              {month === opt.id && <CheckCircle2 size={18} color={colors.accentGreen} />}
            </AppPressable>
          ))}
        </ScrollView>
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
  filterSection: {
    marginBottom: spacing.md,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  monthSelectorText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroCompletionRate: {
    ...typography.h1,
    color: colors.accentGreen,
    fontWeight: '800',
  },
  heroSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accentGreen,
    borderRadius: radius.pill,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  heroFooterItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroFooterLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  heroFooterValue: {
    ...typography.h3,
    fontWeight: '700',
  },
  heroDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  kpiCard: {
    width: '47.5%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadow.card,
  },
  kpiIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  kpiValue: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  kpiLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sectionBadge: {
    ...typography.caption,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabFilterRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  tabButtonText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  jobList: {
    gap: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  jobCode: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  jobCustomer: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  jobDevice: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  jobDate: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  monthOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthOptionSelected: {
    backgroundColor: colors.accentGreen + '10',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  monthOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
