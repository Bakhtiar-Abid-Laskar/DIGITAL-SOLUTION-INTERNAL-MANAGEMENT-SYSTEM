import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, RefreshControl, StyleProp, ViewStyle, ActivityIndicator,  } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { Search, Inbox } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Job } from '../../types/job';
import JobCard from './JobCard';
import SkeletonCard from '../common/SkeletonCard';
import EmptyState from '../common/EmptyState';
import AppHeader from '../common/AppHeader';
import { colors, radius, spacing, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';

export interface TabDefinition {
  label: string;
  value: string;
  count?: number;
}

interface JobListProps {
  title: string;
  jobs: (Job & { technician_name?: string })[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onJobPress: (jobId: string) => void;
  statusTabs: TabDefinition[];
  activeStatusTab: string;
  onStatusTabChange: (tabValue: string) => void;
  priorityTabs?: TabDefinition[];
  activePriorityTab?: string;
  onPriorityTabChange?: (tabValue: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  emptyStateHeading?: string;
  emptyStateSubtext?: string;
  showPriorityFilter?: boolean;
  rightHeaderIcon?: React.ReactNode;
  onRightHeaderPress?: () => void;
  isDashboard?: boolean;
  unreadCount?: number;
  /** Called when user taps Load More — provide for server-paginated screens */
  onLoadMore?: () => void;
  /** Shows a spinner in the footer while loading the next page */
  loadingMore?: boolean;
}

export default function JobList({
  title,
  jobs,
  loading,
  refreshing,
  onRefresh,
  onJobPress,
  statusTabs,
  activeStatusTab,
  onStatusTabChange,
  priorityTabs,
  activePriorityTab,
  onPriorityTabChange,
  searchQuery,
  onSearchQueryChange,
  emptyStateHeading = "No jobs found",
  emptyStateSubtext = "Try adjusting your filters or search query.",
  showPriorityFilter = true,
  rightHeaderIcon,
  onRightHeaderPress,
  isDashboard = false,
  unreadCount = 0,
  onLoadMore,
  loadingMore = false,
}: JobListProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomInsetPadding('nav');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const renderJobItem = useCallback(({ item, index }: { item: Job & { technician_name?: string }, index: number }) => (
    <JobCard
      job={item}
      index={index}
      onPress={onJobPress}
    />
  ), [onJobPress]);

  return (
    <View style={styles.container}>
      <AppHeader 
        title={title} 
        showBack={false} 
        rightIcon={rightHeaderIcon}
        onRightPress={onRightHeaderPress}
        isDashboard={isDashboard}
        unreadCount={unreadCount}
      />

      {/* Search + filters */}
      <View style={styles.headerArea}>
        <View style={[styles.searchContainer, isSearchFocused && styles.searchFocused]}>
          <Search size={16} color={isSearchFocused ? colors.textPrimary : colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by code, name, or phone…"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </View>

        {/* Priority chips */}
        {showPriorityFilter && priorityTabs && activePriorityTab && onPriorityTabChange && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
            data={priorityTabs}
            keyExtractor={tab => tab.value}
            renderItem={({ item: tab }) => (
              <AppPressable
                style={[styles.chip, activePriorityTab === tab.value && styles.chipActive]}
                onPress={() => onPriorityTabChange(tab.value)}
              >
                <Text style={[styles.chipText, activePriorityTab === tab.value && styles.chipTextActive]}>
                  {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
                </Text>
              </AppPressable>
            )}
          />
        )}

        {/* Status chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
          data={statusTabs}
          keyExtractor={tab => tab.value}
          renderItem={({ item: tab }) => (
            <AppPressable
              style={[styles.chip, activeStatusTab === tab.value && styles.chipActive]}
              onPress={() => onStatusTabChange(tab.value)}
            >
              <Text style={[styles.chipText, activeStatusTab === tab.value && styles.chipTextActive]}>
                {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
              </Text>
            </AppPressable>
          )}
        />
      </View>

      {loading && !refreshing ? (
        <FlatList
          data={[0, 1, 2, 3]}
          keyExtractor={i => i.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
          renderItem={() => <SkeletonCard />}
        />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textPrimary}
              colors={[colors.textPrimary]}
            />
          }
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={11}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 140, // Approx height of JobCard + margin
            offset: 140 * index,
            index,
          })}
          ListEmptyComponent={
            <EmptyState
              icon={<Inbox size={44} color={colors.textMuted} strokeWidth={1.5} />}
              heading={emptyStateHeading}
              subtext={emptyStateSubtext}
            />
          }
          renderItem={renderJobItem}
          ListFooterComponent={
            onLoadMore ? (
              <View style={styles.loadMoreContainer}>
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : (
                  <AppPressable style={styles.loadMoreBtn} onPress={onLoadMore}>
                    <Text style={styles.loadMoreText}>Load More</Text>
                  </AppPressable>
                )}
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerArea: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  searchFocused: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.background,
  },
  searchIcon: {
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    height: '100%',
  },
  filterTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  chipsScroll: {
    marginBottom: spacing.sm,
  },
  chipsContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    padding: spacing.lg,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  loadMoreBtn: {
    paddingHorizontal: 24,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  loadMoreText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
