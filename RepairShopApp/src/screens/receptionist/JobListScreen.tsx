import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Job } from '../../types/job';
import JobList, { TabDefinition } from '../../components/jobs/JobList';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';

export default function JobListScreen() {
  const navigation = useNavigation<any>();
  const channelName = useRef(`joblist-jobs-${Date.now()}`).current;
  const route = useRoute<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const [jobs, setJobs] = useState<(Job & { technician_name?: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(route.params?.filter || 'All');

  // Status Tab Counts
  const [counts, setCounts] = useState<{ [key: string]: number }>({
    All: 0,
    Received: 0,
    'In Progress': 0,
    'Waiting for Materials': 0,
    Completed: 0,
  });

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
        All: allRes.count || 0,
        Received: recRes.count || 0,
        'In Progress': progRes.count || 0,
        'Waiting for Materials': waitRes.count || 0,
        Completed: compRes.count || 0,
      });
    } catch (err) {
      console.error('Error fetching status tab counts:', err);
    }
  };

  const fetchJobs = async (pageNum = 0, replace = true, cancelled = false) => {
    try {
      // 1. Build server-side filtered query
      let query = supabase
        .from('jobs')
        .select('*, technician:technician_id(name)');

      // Apply server-side tab filter
      const todayStr = new Date().toISOString().split('T')[0];
      if (activeTab === 'Today') {
        query = query.gte('created_at', todayStr);
      } else if (activeTab === 'Completed Today') {
        query = query.eq('status', 'Completed').gte('completed_at', todayStr);
      } else if (activeTab === 'Urgent') {
        query = query.eq('priority', 'Urgent').neq('status', 'Completed');
      } else if (activeTab !== 'All') {
        query = query.eq('status', activeTab);
      }

      // Apply server-side search query
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery) {
        query = query.or(
          `job_code.ilike.%${trimmedQuery}%,customer_name.ilike.%${trimmedQuery}%,customer_contact.ilike.%${trimmedQuery}%`
        );
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);

      const [jobsRes] = await Promise.all([query, fetchTabCounts()]);

      if (cancelled) return;
      if (jobsRes.error) throw jobsRes.error;

      if (jobsRes.data) {
        const rows = jobsRes.data.map((job: any) => ({
          ...job,
          technician_name: job.technician?.name || 'Unassigned',
        }));
        if (replace) {
          setJobs(rows);
        } else {
          setJobs(prev => [...prev, ...rows]);
        }
        setHasMore(rows.length === PAGE_SIZE);
      }
    } catch (error) {
      if (cancelled) return;
      console.error('Error fetching jobs:', error);
    } finally {
      if (!cancelled) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  };

  useRealtimeSubscription('jobs', () => {
    setPage(0);
    fetchJobs(0, true);
  });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (route.params?.filter) {
        setActiveTab(route.params.filter);
        navigation.setParams({ filter: undefined });
      }
      setPage(0);
      fetchJobs(0, true, cancelled);
      return () => { cancelled = true; };
    }, [route.params?.filter, activeTab, searchQuery])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchJobs(0, true);
  };

  const onLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchJobs(nextPage, false);
  };

  const statusTabs: TabDefinition[] = [
    { label: 'All', value: 'All', count: counts['All'] },
    { label: 'Received', value: 'Received', count: counts['Received'] },
    { label: 'In Progress', value: 'In Progress', count: counts['In Progress'] },
    { label: 'Waiting', value: 'Waiting for Materials', count: counts['Waiting for Materials'] },
    { label: 'Completed', value: 'Completed', count: counts['Completed'] },
  ];

  return (
    <JobList
      title="Jobs"
      jobs={jobs}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onLoadMore={onLoadMore}
      loadingMore={loadingMore}
      onJobPress={(jobId) => navigation.navigate('JobDetail', { jobId })}
      statusTabs={statusTabs}
      activeStatusTab={activeTab}
      onStatusTabChange={setActiveTab}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      showPriorityFilter={false}
    />
  );
}
