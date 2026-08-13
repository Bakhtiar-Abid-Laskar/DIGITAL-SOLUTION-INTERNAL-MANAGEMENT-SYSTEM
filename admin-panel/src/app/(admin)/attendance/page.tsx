"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Attendance, User, getSignedUrlCached, useDebounceValue } from '@repairshop/shared';
import { CalendarDays, Search, CheckCircle, XCircle, MapPin, Clock, Image as ImageIcon, MapPinOff, Download } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/ToastProvider";
import { TableSkeleton } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { StaffAttendanceDrawer } from "@/components/attendance/StaffAttendanceDrawer";
import { exportAttendanceToCSV } from "@/utils/csv";

type AttendanceRecord = Attendance & {
  users: { name: string; role: string; id: string };
  checkInSelfieSignedUrl?: string | null;
  checkOutSelfieSignedUrl?: string | null;
  check_in_selfie_url?: string | null;
  check_out_selfie_url?: string | null;
  at_location?: boolean;
  review_status?: string;
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState("All");
  const [reviewFilter, setReviewFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 15;

  const { showToast } = useToast();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<{ id: string; name: string; role: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchRecords = useCallback(async (cancelled = false) => {
    if (!cancelled) setLoading(true);
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          users!attendance_user_id_fkey(name, role, id)
        `, { count: 'exact' })
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (statusFilter !== "All") query = query.eq('status', statusFilter);
      
      if (reviewFilter === "Pending") query = query.eq('review_status', 'pending');
      else if (reviewFilter === "Approved") query = query.eq('review_status', 'approved');
      else if (reviewFilter === "Rejected") query = query.eq('review_status', 'rejected');

      if (debouncedSearchQuery) {
        const { data: matchedUsers } = await supabase
          .from('users')
          .select('id')
          .ilike('name', `%${debouncedSearchQuery}%`);
        
        const ids = matchedUsers?.map(u => u.id) || [];
        if (ids.length === 0) {
          setRecords([]);
          setTotalPages(1);
          setLoading(false);
          return;
        }
        query = query.in('user_id', ids);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (cancelled) return;
      if (error) throw error;
      
      const recordsWithUrls = await Promise.all((data || []).map(async (record) => {
        const item = record as unknown as AttendanceRecord;
        if (item.check_in_selfie_url) {
          item.checkInSelfieSignedUrl = await getSignedUrlCached(supabase, 'attendance-selfies', item.check_in_selfie_url);
        }
        if (item.check_out_selfie_url) {
          item.checkOutSelfieSignedUrl = await getSignedUrlCached(supabase, 'attendance-selfies', item.check_out_selfie_url);
        }
        return item;
      }));

      setRecords(recordsWithUrls);
      if (count !== null) setTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    } catch (err: any) {
      if (cancelled) return;
      console.error(err);
      showToast('Failed to fetch attendance data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, reviewFilter, debouncedSearchQuery, currentPage, showToast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, reviewFilter, debouncedSearchQuery]);

  useEffect(() => {
    let cancelled = false;
    fetchRecords(cancelled);
    return () => { cancelled = true; };
  }, [fetchRecords]);

  const handleReviewAction = async (id: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      const { error } = await supabase
        .from('attendance')
        .update({ review_status: newStatus })
        .eq('id', id);
      if (error) throw error;
      
      showToast(`Record marked as ${newStatus}`, 'success');
      setRecords(prev => prev.map(r => r.id === id ? { ...r, review_status: newStatus } : r));
    } catch (err: any) {
      showToast(`Failed to update review status: ${err.message}`, 'error');
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          users!attendance_user_id_fkey(name, role, id)
        `)
        .order('date', { ascending: false });

      if (statusFilter !== "All") query = query.eq('status', statusFilter);
      if (reviewFilter === "Pending") query = query.eq('review_status', 'pending');
      else if (reviewFilter === "Approved") query = query.eq('review_status', 'approved');
      else if (reviewFilter === "Rejected") query = query.eq('review_status', 'rejected');

      if (debouncedSearchQuery) {
        const { data: matchedUsers } = await supabase
          .from('users')
          .select('id')
          .ilike('name', `%${debouncedSearchQuery}%`);
        const ids = matchedUsers?.map(u => u.id) || [];
        if (ids.length > 0) {
          query = query.in('user_id', ids);
        } else {
           showToast('No records to export', 'error');
           setExporting(false);
           return;
        }
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      
      exportAttendanceToCSV(data || [], 'repairshop_attendance_filtered.csv');
    } catch (err: any) {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const SelfieThumbnail = ({ url, alt }: { url?: string | null, alt: string }) => {
    if (!url) return <div className="w-10 h-10 rounded-md bg-[var(--surface-sunken)] flex items-center justify-center border border-[var(--border-subtle)]"><ImageIcon size={16} className="text-[var(--text-tertiary)]" /></div>;
    return (
      <button 
        onClick={() => setPreviewImage(url)} 
        className="relative w-10 h-10 rounded-md overflow-hidden border border-[var(--border-subtle)] hover:opacity-80 transition-opacity"
      >
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Attendance Monitoring" 
      />

      <Card className="p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by staff name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="All">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Halfday">Half Day</option>
            <option value="Leave">Leave</option>
            <option value="Absent">Absent</option>
          </Select>
          <Select 
            value={reviewFilter} 
            onChange={(e) => setReviewFilter(e.target.value)}
            className="w-44"
          >
            <option value="All">All Review States</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </Select>
          <Button variant="outline" onClick={() => exportAttendanceToCSV(records, 'repairshop_attendance_page.csv')} disabled={records.length === 0}>
            Export Page
          </Button>
          <Button variant="outline" onClick={handleExportAll} disabled={exporting}>
             <Download size={16} className="mr-2" />
             {exporting ? 'Exporting...' : 'Export All'}
          </Button>
        </div>
      </Card>

      {loading ? (
        <TableSkeleton cols={6} rows={5} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">In / Out</th>
                  <th className="px-4 py-3 text-center">Selfies</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <EmptyState 
                        heading="No attendance records found" 
                        subtext="Try adjusting your filters or search query." 
                      />
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr 
                      key={record.id} 
                      className={`border-b hover:bg-[var(--surface-hover)] ${
                        !record.at_location && record.review_status === 'pending'
                          ? 'bg-amber-500/5 border-l-2 border-l-amber-400 border-b-[var(--border-subtle)]'
                          : 'border-[var(--border-subtle)]'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => setSelectedStaff({ id: record.users.id, name: record.users.name, role: record.users.role })}
                          className="font-medium text-admin-accent hover:underline text-left"
                        >
                          {record.users.name}
                        </button>
                        <div className="text-xs text-[var(--text-secondary)]">{record.users.role}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays size={14} className="text-[var(--text-tertiary)]" />
                          <span className="text-[var(--text-primary)] font-medium">
                            {new Date(record.date).toLocaleDateString()}
                          </span>
                        </div>
                        <Badge 
                          variant={record.status === 'Present' ? 'success' : record.status === 'Halfday' ? 'warning' : 'danger'} 
                          className="mt-1 inline-block"
                        >
                          {record.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                            <span className="w-8 text-xs font-semibold">IN</span>
                            {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                          </div>
                          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                            <span className="w-8 text-xs font-semibold">OUT</span>
                            {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <SelfieThumbnail url={record.checkInSelfieSignedUrl} alt="Check In" />
                          <SelfieThumbnail url={record.checkOutSelfieSignedUrl} alt="Check Out" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={record.at_location ? 'success' : 'danger'}>
                            {record.at_location ? 'At Location' : 'Out of Bounds'}
                          </Badge>
                          {record.gps_lat && record.gps_lng && (
                            <a
                              href={`https://www.google.com/maps?q=${record.gps_lat},${record.gps_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-admin-accent underline flex items-center gap-1 mt-1 hover:opacity-80"
                            >
                              <MapPin size={10} /> View Map
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {record.review_status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="primary" onClick={() => handleReviewAction(record.id, 'approved')}>Allow</Button>
                            <Button size="sm" variant="danger" onClick={() => handleReviewAction(record.id, 'rejected')}>Deny</Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <Badge 
                              variant={record.review_status === 'approved' ? 'success' : 'danger'} 
                              className="capitalize"
                            >
                              {record.review_status || 'Approved'}
                            </Badge>
                            <button 
                              onClick={() => handleReviewAction(record.id, 'pending')}
                              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2 flex items-center gap-1"
                            >
                              <Clock size={10} /> Re-review
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {records.length > 0 && (
            <div className="p-4 border-t border-[var(--border-subtle)]">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </Card>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl w-full aspect-[3/4] bg-[var(--surface-base)] rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/80"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Staff Drawer */}
      <StaffAttendanceDrawer 
        staff={selectedStaff} 
        onClose={() => setSelectedStaff(null)} 
      />
    </div>
  );
}
