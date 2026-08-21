"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Attendance, getSignedUrlCached, useDebounceValue } from '@repairshop/shared';
import { CalendarDays, MapPin, Clock, Image as ImageIcon, Download, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { Card } from "@/components/common/Card";
import { Select } from "@/components/common/Select";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/ToastProvider";
import { DataTableSkeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { StaffAttendanceDrawer } from "@/components/attendance/StaffAttendanceDrawer";
import { exportAttendanceToCSV } from "@/utils/csv";
import { formatDate } from "@/utils/formatDate";

/** Extract Google Drive file ID from any Drive URL or bare ID */
function extractDriveFileId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;
  const byPath = urlOrId.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (byPath) return byPath[1];
  const byParam = urlOrId.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (byParam) return byParam[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(urlOrId)) return urlOrId;
  return null;
}

type AttendanceRecord = Attendance & {
  users: { name: string; role: string; id: string };
  checkInSelfieSignedUrl?: string | null;
  checkOutSelfieSignedUrl?: string | null;
  check_in_drive_file_id?: string | null;
  check_out_drive_file_id?: string | null;
  checkin_photo_drive_link?: string | null;
  checkout_photo_drive_link?: string | null;
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

  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);
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
      
      const recordsWithUrls = (data || []).map((record) => {
        const item = record as unknown as AttendanceRecord;
        const inId = extractDriveFileId(item.checkin_photo_drive_link) || extractDriveFileId(item.check_in_drive_file_id);
        const outId = extractDriveFileId(item.checkout_photo_drive_link) || extractDriveFileId(item.check_out_drive_file_id);
        if (inId) item.checkInSelfieSignedUrl = `https://drive.google.com/thumbnail?id=${inId}&sz=w400`;
        if (outId) item.checkOutSelfieSignedUrl = `https://drive.google.com/thumbnail?id=${outId}&sz=w400`;
        return item;
      });

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
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        exportAttendanceToCSV(data as any, `repairshop_attendance_all_${new Date().toISOString().split('T')[0]}.csv`);
      }
    } catch (err: any) {
      showToast(`Failed to export data: ${err.message}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  const SelfieThumbnail = ({ url, alt }: { url?: string | null, alt: string }) => {
    if (!url) {
      return (
        <div className="w-10 h-10 rounded-md bg-admin-bg-subtle flex items-center justify-center border border-admin-border text-admin-text-muted" title={`No ${alt} selfie`}>
          <ImageIcon size={16} />
        </div>
      );
    }
    return (
      <button
        onClick={() => setPreviewImage({ url, label: alt })}
        className="relative w-10 h-10 rounded-md overflow-hidden border border-admin-border hover:opacity-80 transition-opacity cursor-pointer shadow-xs group"
        title={`View ${alt} selfie`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <ImageIcon size={12} className="text-white" />
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Attendance Monitoring" 
        description="Verify staff daily attendance, selfie check-ins, and GPS location status."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => exportAttendanceToCSV(records, 'repairshop_attendance_page.csv')} disabled={records.length === 0}>
              Export Page
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportAll} isLoading={exporting} leftIcon={<Download size={14} />}>
              Export All
            </Button>
          </div>
        }
      />

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by staff name..."
        showClearButton={Boolean(searchQuery || statusFilter !== "All" || reviewFilter !== "All")}
        onClearFilters={() => {
          setSearchQuery("");
          setStatusFilter("All");
          setReviewFilter("All");
        }}
      >
        <div className="w-36">
          <Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 text-sm"
            aria-label="Filter by Status"
          >
            <option value="All">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Halfday">Half Day</option>
            <option value="Leave">Leave</option>
            <option value="Absent">Absent</option>
          </Select>
        </div>
        <div className="w-44">
          <Select 
            value={reviewFilter} 
            onChange={(e) => setReviewFilter(e.target.value)}
            className="h-10 text-sm"
            aria-label="Filter by Review Status"
          >
            <option value="All">All Review States</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </Select>
        </div>
      </SearchFilterBar>

      {loading ? (
        <DataTableSkeleton cols={6} rows={6} hasFilterBar={false} />
      ) : (
        <Card noAccentLine className="flex-1 flex flex-col overflow-hidden border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
          <div className="overflow-x-auto flex-1 table-scroll-shadow">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs uppercase bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border sticky top-0 z-10 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Staff</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">In / Out</th>
                  <th className="px-6 py-3.5 text-center">Selfies</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border bg-admin-bg-surface">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8">
                      <EmptyState 
                        heading="No attendance records found" 
                        subtext="Try adjusting your filters or search query." 
                        asCard={false}
                      />
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr 
                      key={record.id} 
                      className="hover:bg-admin-bg-hover transition-colors"
                    >
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedStaff({ id: record.users.id, name: record.users.name, role: record.users.role })}
                          className="font-semibold text-admin-accent hover:underline text-left cursor-pointer"
                        >
                          {record.users.name}
                        </button>
                        <div className="text-xs text-admin-text-muted capitalize">{record.users.role}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays size={14} className="text-admin-text-muted" />
                          <span className="text-admin-text-primary font-medium text-xs">
                            {formatDate(record.date)}
                          </span>
                        </div>
                        <Badge 
                          variant={record.status === 'Present' ? 'success' : record.status === 'Halfday' ? 'warning' : 'danger'} 
                          className="mt-1"
                        >
                          {record.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 text-admin-text-secondary">
                            <span className="w-8 font-semibold text-admin-text-muted">IN</span>
                            <span className="font-mono">{record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-admin-text-secondary">
                            <span className="w-8 font-semibold text-admin-text-muted">OUT</span>
                            <span className="font-mono">{record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center">
                          <SelfieThumbnail url={record.checkInSelfieSignedUrl} alt="Check In" />
                          <SelfieThumbnail url={record.checkOutSelfieSignedUrl} alt="Check Out" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={record.at_location ? 'success' : 'danger'}>
                            {record.at_location ? 'At Location' : 'Out of Bounds'}
                          </Badge>
                          {record.gps_lat && record.gps_lng && (
                            <a
                              href={`https://www.google.com/maps?q=${record.gps_lat},${record.gps_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-admin-accent hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <MapPin size={11} /> View Map
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {record.review_status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="primary" className="h-7 text-xs px-2.5" onClick={() => handleReviewAction(record.id, 'approved')}>Allow</Button>
                            <Button size="sm" variant="danger" className="h-7 text-xs px-2.5" onClick={() => handleReviewAction(record.id, 'rejected')}>Deny</Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <Badge 
                              variant={record.review_status === 'approved' ? 'success' : 'danger'} 
                              className="capitalize"
                            >
                              {record.review_status || 'Approved'}
                            </Badge>
                            <button 
                              onClick={() => handleReviewAction(record.id, 'pending')}
                              className="text-xs text-admin-text-muted hover:text-admin-text-primary underline flex items-center gap-1 cursor-pointer"
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
            <div className="p-4 border-t border-admin-border bg-admin-bg-surface">
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
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-admin-surface rounded-xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-admin-border">
              <p className="font-semibold text-admin-text-primary">{previewImage.label} Selfie</p>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-md hover:bg-admin-bg-subtle transition-colors text-admin-text-muted hover:text-admin-text-primary cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url.replace('sz=w400', 'sz=w1200')}
                alt={previewImage.label}
                className="max-w-full max-h-[75vh] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
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
