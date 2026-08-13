import React from 'react';
import { View, Text, StyleSheet, ScrollView, StyleProp, ViewStyle, Pressable } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { LucideIcon, ChevronRight } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors, radius, spacing, shadow, typography, kpiAccents, SPRING } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import AppHeader from '../common/AppHeader';

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  onPress: () => void;
}

export interface StatCard {
  id: string;
  label: string;
  value: number | string;
  type: keyof typeof kpiAccents;
  icon: LucideIcon;
  onPress?: () => void;
}

interface RoleDashboardProps {
  roleTitle: string;
  userName: string;
  workloadText?: string;
  bannerColor: string; // Kept for API compat, but unused in flat design
  avatarElement?: React.ReactNode;
  quickActionsTitle?: string;
  statsTitle?: string;
  quickActions?: QuickAction[];
  stats?: StatCard[];
  headerLeftIcon?: React.ReactNode;
  onHeaderLeftPress?: () => void;
  headerRightIcon?: React.ReactNode;
  onHeaderRightPress?: () => void;
  onNotificationPress?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  unreadCount?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function QuickActionTile({ action }: { action: QuickAction }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  
  const Icon = action.icon;
  return (
    <AnimatedPressable
      style={[styles.actionTile, animStyle]}
      onPress={action.onPress}
      onPressIn={() => (scale.value = withSpring(0.97, SPRING))}
      onPressOut={() => (scale.value = withSpring(1, SPRING))}
    >
      <View style={[styles.actionIconWrapper, { backgroundColor: action.bgColor }]}>
        <Icon size={18} color={action.iconColor} strokeWidth={2.5} />
      </View>
      <Text style={styles.actionLabel} numberOfLines={2}>{action.label}</Text>
    </AnimatedPressable>
  );
}

function KpiCard({ stat }: { stat: StatCard }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  
  const accent = kpiAccents[stat.type];
  const Icon = stat.icon;
  
  const content = (
    <View style={[styles.statCard, { borderLeftColor: accent.stripe }]}>
      <View style={styles.statHeaderRow}>
        <Text style={styles.statLabel}>{stat.label}</Text>
        <View style={[styles.statIconBadge, { backgroundColor: accent.fill }]}>
          <Icon size={16} color={accent.stripe} strokeWidth={2.5} />
        </View>
      </View>
      <View style={styles.statFooterRow}>
        <Text style={styles.statValue}>{stat.value}</Text>
        {stat.onPress && <ChevronRight size={18} color={colors.textMuted} />}
      </View>
    </View>
  );

  if (!stat.onPress) {
    return <View style={styles.statWrapper}>{content}</View>;
  }

  return (
    <AnimatedPressable
      style={[styles.statWrapper, animStyle]}
      onPress={stat.onPress}
      onPressIn={() => (scale.value = withSpring(0.97, SPRING))}
      onPressOut={() => (scale.value = withSpring(1, SPRING))}
    >
      {content}
    </AnimatedPressable>
  );
}

export default function RoleDashboard({
  roleTitle,
  userName,
  workloadText,
  bannerColor,
  avatarElement,
  quickActionsTitle = "Quick Actions",
  statsTitle = "Overview",
  quickActions = [],
  stats = [],
  headerLeftIcon,
  onHeaderLeftPress,
  headerRightIcon,
  onHeaderRightPress,
  onNotificationPress,
  contentContainerStyle,
  children,
  unreadCount = 0,
}: RoleDashboardProps) {
  const bottomPadding = useBottomInsetPadding('nav');
  
  const hour = new Date().getHours();
  const greetingTime = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <View style={styles.container}>
      <AppHeader
        title=""
        isDashboard={true}
        leftIcon={headerLeftIcon}
        onLeftPress={onHeaderLeftPress}
        rightIcon={headerRightIcon}
        onRightPress={onHeaderRightPress ?? onNotificationPress}
        unreadCount={unreadCount}
      />
      
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }, contentContainerStyle]} showsVerticalScrollIndicator={false}>
        {/* Flat Header Section (Replaces heavy colored banner) */}
        <View style={styles.headerSection}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.dateText}>{dateStr.toUpperCase()}</Text>
            <Text style={styles.greetingText}>{greetingTime}, {userName}</Text>
            {workloadText && (
              <View style={styles.workloadBadge}>
                <View style={styles.workloadDot} />
                <Text style={styles.workloadText}>{workloadText}</Text>
              </View>
            )}
          </View>
          {avatarElement && (
            <View style={styles.avatarContainer}>
              {avatarElement}
            </View>
          )}
        </View>

        {/* Stats Grid (White cards, 1px border) */}
        {stats && stats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{statsTitle}</Text>
            <View style={styles.statsGrid}>
              {stats.map((stat) => (
                <KpiCard key={stat.id} stat={stat} />
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions (Dense 2-col list) */}
        {quickActions && quickActions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{quickActionsTitle}</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action) => (
                <QuickActionTile key={action.id} action={action} />
              ))}
            </View>
          </View>
        )}
        
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingVertical: spacing.sm,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: spacing.lg,
  },
  dateText: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  greetingText: {
    ...typography.h1,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  workloadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  workloadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: spacing.xs,
  },
  workloadText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  // 2-col grid for Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionTile: {
    width: '47.5%', // Slightly less than 50% to account for gap
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  actionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  actionLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
  },
  // 2-col stat grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statWrapper: {
    width: '47.5%',
  },
  statCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    flex: 1,
  },
  statHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    paddingRight: spacing.xs,
  },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    ...typography.stat,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
});
