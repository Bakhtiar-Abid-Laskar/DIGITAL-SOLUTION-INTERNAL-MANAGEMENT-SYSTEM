import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Job } from '../../types/job';
import JobList, { TabDefinition } from '../../components/jobs/JobList';

const PAGE_SIZE = 20;

export default function AdminJobsScreen() {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [jobs, setJobs] = useState<(Job & { technician_name?: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Status counts — server-side, not derived from loaded page
  const [counts, setCounts] = useState<Record<string, number>>({
    All: 0,
    Received: 0,
    'In Progress': 0,
    'Waiting for Materials': 0,
    Completed: 0,
  });

  // Prevent concurrent load-more calls
  const fetchingRef = useRef(false);

  // ── Server-side count queries (same pattern as receptionist JobListScreen) ──
  const fetchTabCounts = async () => {
    try {
      const [allRes, recRes, progRes, waitRes, compRes] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Received'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'In Progress'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Waiting for Materials'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Completed'),
      ]);

      setCounts({
        All: allRes.count ?? 0,
        Received: recRes.count ?? 0,
        'In Progress': progRes.count ?? 0,
        'Waiting for Materials': waitRes.count ?? 0,
        Completed: compRes.count ?? 0,
      });
    } catch (err) {
      console.error('Error fetching admin job tab counts:', err);
    }
  };

  // ── Paginated job fetch ──
  const fetchJobs = async (pageNum: number, replace: boolean) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      let query = supabase
        .from('jobs')
        .select('*, technician:technician_id(name)')
        .order('created_at', { ascending: false });

      // Server-side status filter
      if (activeTab !== 'All') {
        if (activeTab === 'Waiting') {
          query = query.eq('status', 'Waiting for Materials');
        } else {
          query = query.eq('status', activeTab);
        }
      }

      // Server-side search filter
      const trimmed = searchQuery.trim();
      if (trimmed) {
        query = query.or(
          `job_code.ilike.%${trimmed}%,customer_name.ilike.%${trimmed}%,customer_contact.ilike.%${trimmed}%`
        );
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((j: any) => ({
        ...j,
        technician_name: j.technician?.name,
      }));

      if (replace) {
        setJobs(mapped);
      } else {
        setJobs(prev => [...prev, ...mapped]);
      }

      // If we got fewer items than PAGE_SIZE, there are no more pages
      setHasMore(mapped.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching admin jobs:', err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // ── Initial load / focus refresh ──
  useFocusEffect(
    useCallback(() => {
      setPage(0);
      setLoading(true);
      fetchTabCounts();
      fetchJobs(0, true);
    }, [activeTab, searchQuery])
  );

  // ── Pull-to-refresh ──
  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchTabCounts();
    fetchJobs(0, true);
  };

  // ── Load more (append next page) ──
  const onLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchJobs(nextPage, false);
  };

  // ── Tab change: reset to page 0, replace list ──
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // useFocusEffect dep on activeTab will trigger the refetch
  };

  // ── Search change: reset to page 0, replace list ──
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    // useFocusEffect dep on searchQuery will trigger the refetch
  };

  const statusTabs: TabDefinition[] = [
    { label: 'All', value: 'All', count: counts['All'] },
    { label: 'Received', value: 'Received', count: counts['Received'] },
    { label: 'In Progress', value: 'In Progress', count: counts['In Progress'] },
    { label: 'Waiting', value: 'Waiting', count: counts['Waiting for Materials'] },
    { label: 'Completed', value: 'Completed', count: counts['Completed'] },
  ];

  return (
    <JobList
      title="All Jobs"
      jobs={jobs}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onJobPress={(jobId) => navigation.navigate('AdminJobDetail', { jobId })}
      statusTabs={statusTabs}
      activeStatusTab={activeTab}
      onStatusTabChange={handleTabChange}
      searchQuery={searchQuery}
      onSearchQueryChange={handleSearchChange}
      showPriorityFilter={false}
      isDashboard={true}
      onLoadMore={hasMore ? onLoadMore : undefined}
      loadingMore={loadingMore}
    />
  );
}
