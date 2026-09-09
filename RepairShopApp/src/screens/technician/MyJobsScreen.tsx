import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Job } from '../../types/job';
import { useAuth } from '../../context/AuthContext';
import { useDebounceValue } from '@repairshop/shared';
import JobList, { TabDefinition } from '../../components/jobs/JobList';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';

const PAGE_SIZE = 20;

export default function MyJobsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  
  // Use a unique channel name based on user ID
  const channelName = useRef(`tech-jobs-${user?.id || Date.now()}`).current;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);
  const [activeTab, setActiveTab] = useState(route.params?.filter || 'All');
  const [unreadCount, setUnreadCount] = useState(0);

  // Status Tab Counts
  const [counts, setCounts] = useState<{ [key: string]: number }>({
    All: 0,
    Received: 0,
    'In Progress': 0,
    'Waiting for Materials': 0,
    Completed: 0,
    Urgent: 0,
  });

  const fetchTabCounts = async () => {
    if (!user) return;
    try {
      const [countsRes, unreadRes] = await Promise.all([
        supabase.rpc('get_job_status_counts', { p_technician_id: user.id }),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_user_id', user.id),
      ]);

      if (!countsRes.error && countsRes.data) {
        const data = countsRes.data as any;
        const countsObj = data.counts || {};
        setCounts({
          All: Number(data.total) || 0,
          Received: Number(countsObj['Received']) || 0,
          'In Progress': Number(countsObj['In Progress']) || 0,
          'Waiting for Materials': Number(countsObj['Waiting for Materials']) || 0,
          Completed: Number(countsObj['Completed']) || 0,
          Urgent: Number(data.urgent) || 0,
        });
        setUnreadCount(unreadRes.count ?? 0);
        return;
      }
      throw countsRes.error || new Error('RPC returned empty');
    } catch (err) {
      console.warn('RPC get_job_status_counts fallback for technician:', err);
      try {
        const [allRes, recRes, progRes, waitRes, compRes, unreadRes, urgRes] = await Promise.all([
          supabase.from('jobs').select('id, job_technicians!inner(technician_id, removed_at)', { count: 'exact', head: true }).eq('job_technicians.technician_id', user.id).is('job_technicians.removed_at', null),
          supabase.from('jobs').select('id, job_technicians!inner(technician_id, removed_at)', { count: 'exact', head: true }).eq('job_technicians.technician_id', user.id).is('job_technicians.removed_at', null).eq('status', 'Received'),
          supabase.from('jobs').select('id, job_technicians!inner(technician_id, removed_at)', { count: 'exact', head: true }).eq('job_technicians.technician_id', user.id).is('job_technicians.removed_at', null).eq('status', 'In Progress'),
          supabase.from('jobs').select('id, job_technicians!inner(technician_id, removed_at)', { count: 'exact', head: true }).eq('job_technicians.technician_id', user.id).is('job_technicians.removed_at', null).eq('status', 'Waiting for Materials'),
          supabase.from('jobs').select('id, job_technicians!inner(technician_id, removed_at)', { count: 'exact', head: true }).eq('job_technicians.technician_id', user.id).is('job_technicians.removed_at', null).eq('status', 'Completed'),
          supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_user_id', user.id),
          supabase.from('jobs').select('id, job_technicians!inner(technician_id, removed_at)', { count: 'exact', head: true }).eq('job_technicians.technician_id', user.id).is('job_technicians.removed_at', null).eq('priority', 'Urgent').neq('status', 'Completed'),
        ]);

        setCounts({
          All: allRes.count || 0,
          Received: recRes.count || 0,
          'In Progress': progRes.count || 0,
          'Waiting for Materials': waitRes.count || 0,
          Completed: compRes.count || 0,
          Urgent: urgRes.count || 0,
        });
        setUnreadCount(unreadRes.count ?? 0);
      } catch (fallbackErr) {
        console.error('Error fetching technician tab counts:', fallbackErr);
      }
    }
  };

  const fetchJobs = async (pageNum = 0, replace = true, cancelled = false) => {
    if (!user) return;
    try {
      let query = supabase
        .from('jobs')
        .select('*, job_technicians!inner(technician_id, removed_at)')
        .eq('job_technicians.technician_id', user.id)
        .is('job_technicians.removed_at', null);

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
      const trimmedQuery = debouncedSearchQuery.trim();
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
        if (replace) {
          setJobs(jobsRes.data);
        } else {
          setJobs(prev => [...prev, ...jobsRes.data]);
        }
        setHasMore(jobsRes.data.length === PAGE_SIZE);
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
  }, user ? `technician_id=eq.${user.id}` : undefined);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (route.params?.filter) {
        const targetFilter = route.params.filter === 'Completed Today' ? 'Completed' : route.params.filter;
        setActiveTab(targetFilter);
        navigation.setParams({ filter: undefined });
      }
      setPage(0);
      fetchJobs(0, true, cancelled);
      return () => { cancelled = true; };
    }, [route.params?.filter, activeTab, debouncedSearchQuery])
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

  const handleJobPress = (jobId: string) => {
    navigation.navigate('UpdateWork', { jobId });
  };

  const statusTabs: TabDefinition[] = [
    { label: 'All', value: 'All', count: counts['All'] },
    { label: 'Received', value: 'Received', count: counts['Received'] },
    { label: 'In Progress', value: 'In Progress', count: counts['In Progress'] },
    { label: 'Waiting', value: 'Waiting for Materials', count: counts['Waiting for Materials'] },
    { label: 'Completed', value: 'Completed', count: counts['Completed'] },
    { label: 'Urgent', value: 'Urgent', count: counts['Urgent'] },
  ];

  return (
    <JobList
      title="My Assigned Jobs"
      jobs={jobs}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onLoadMore={onLoadMore}
      loadingMore={loadingMore}
      onJobPress={handleJobPress}
      statusTabs={statusTabs}
      activeStatusTab={activeTab}
      onStatusTabChange={setActiveTab}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      showPriorityFilter={false}
      isDashboard={false}
    />
  );
}

