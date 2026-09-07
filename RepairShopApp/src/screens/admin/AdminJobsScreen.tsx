import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Job } from '../../types/job';
import { useDebounceValue } from '@repairshop/shared';
import JobList, { TabDefinition } from '../../components/jobs/JobList';

const PAGE_SIZE = 20;

export default function AdminJobsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [jobs, setJobs] = useState<(Job & { technician_name?: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);
  const [activeTab, setActiveTab] = useState(route.params?.filter || 'All');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Status counts — server-side, not derived from loaded page
  const [counts, setCounts] = useState<Record<string, number>>({
    All: 0,
    Received: 0,
    'In Progress': 0,
    'Waiting for Materials': 0,
    Completed: 0,
    Urgent: 0,
  });

  // Prevent concurrent load-more calls
  const fetchingRef = useRef(false);

  // ── Server-side count queries (consolidated RPC with fallback) ──
  const fetchTabCounts = async () => {
    try {
      const { data, error } = await supabase.rpc('get_job_status_counts');
      if (error) throw error;
      if (data) {
        const countsObj = (data as any).counts || {};
        setCounts({
          All: Number((data as any).total) || 0,
          Received: Number(countsObj['Received']) || 0,
          'In Progress': Number(countsObj['In Progress']) || 0,
          'Waiting for Materials': Number(countsObj['Waiting for Materials']) || 0,
          Completed: Number(countsObj['Completed']) || 0,
          Urgent: Number((data as any).urgent) || 0,
        });
        return;
      }
    } catch (err) {
      console.warn('RPC get_job_status_counts unavailable, using fallback:', err);
      try {
        const [allRes, recRes, progRes, waitRes, compRes, urgRes] = await Promise.all([
          supabase.from('jobs').select('id', { count: 'exact', head: true }),
          supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Received'),
          supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'In Progress'),
          supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Waiting for Materials'),
          supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Completed'),
          supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('priority', 'Urgent').neq('status', 'Completed'),
        ]);

        setCounts({
          All: allRes.count ?? 0,
          Received: recRes.count ?? 0,
          'In Progress': progRes.count ?? 0,
          'Waiting for Materials': waitRes.count ?? 0,
          Completed: compRes.count ?? 0,
          Urgent: urgRes.count ?? 0,
        });
      } catch (fallbackErr) {
        console.error('Error fetching admin job tab counts:', fallbackErr);
      }
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
      if (activeTab === 'Urgent') {
        query = query.eq('priority', 'Urgent').neq('status', 'Completed');
      } else if (activeTab !== 'All') {
        if (activeTab === 'Waiting') {
          query = query.eq('status', 'Waiting for Materials');
        } else {
          query = query.eq('status', activeTab);
        }
      }

      // Server-side search filter
      const trimmed = debouncedSearchQuery.trim();
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
      if (route.params?.filter) {
        setActiveTab(route.params.filter);
        navigation.setParams({ filter: undefined });
      }
      setPage(0);
      setLoading(true);
      fetchTabCounts();
      fetchJobs(0, true);
    }, [route.params?.filter, activeTab, debouncedSearchQuery])
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
    { label: 'Urgent', value: 'Urgent', count: counts['Urgent'] },
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
      isDashboard={false}
      onLoadMore={hasMore ? onLoadMore : undefined}
      loadingMore={loadingMore}
    />
  );
}
