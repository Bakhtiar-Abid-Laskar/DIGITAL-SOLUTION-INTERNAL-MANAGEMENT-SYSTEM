"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { X, CalendarDays, Download, ChevronLeft, ChevronRight, User as UserIcon, MapPin, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { exportAttendanceToCSV } from '@/utils/csv';

function extractDriveFileId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;
  const byPath = urlOrId.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (byPath) return byPath[1];
  const byParam = urlOrId.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (byParam) return byParam[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(urlOrId)) return urlOrId;
  return null;
}

interface StaffAttendanceDrawerProps {
  staff: { id: string; name: string; role: string } | null;
  onClose: () => void;
}

export function StaffAttendanceDrawer({ staff, onClose }: StaffAttendanceDrawerProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null);
        } else {
          onClose();
        }
      }
    };
    if (staff) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [staff, onClose, previewImage]);

  useEffect(() => {
    if (!staff) return;
    const fetchRecords = async () => {
      setLoading(true);
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          users!attendance_user_id_fkey(name, role, id)
        `)
        .eq('user_id', staff.id)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (!error && data) {
        const enriched = data.map((item: any) => {
          const inId = extractDriveFileId(item.checkin_photo_drive_link) || extractDriveFileId(item.check_in_drive_file_id);
          const outId = extractDriveFileId(item.checkout_photo_drive_link) || extractDriveFileId(item.check_out_drive_file_id);
          return {
            ...item,
            checkInUrl: inId ? `https://drive.google.com/thumbnail?id=${inId}&sz=w400` : null,
            checkOutUrl: outId ? `https://drive.google.com/thumbnail?id=${outId}&sz=w400` : null,
          };
        });
        setRecords(enriched);
      }
      setLoading(false);
    };
    fetchRecords();
  }, [staff, currentMonth]);

  const summary = useMemo(() => {
    return records.reduce((acc, curr) => {
      if (curr.status === 'Present') acc.present++;
      else if (curr.status === 'Halfday') acc.halfday++;
      else if (curr.status === 'Leave') acc.leave++;
      else if (curr.status === 'Absent') acc.absent++;
      return acc;
    }, { present: 0, halfday: 0, leave: 0, absent: 0 });
  }, [records]);

  if (!staff) return null;

  const monthYearStr = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const isCurrentOrFutureMonth = currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-admin-bg-dark/60 backdrop-blur-xs transition-opacity animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl h-full bg-admin-bg-surface shadow-2xl flex flex-col border-l border-admin-border animate-slide-in-right z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-admin-border bg-admin-bg-subtle/50">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-admin-accent/10 rounded-full flex items-center justify-center border border-admin-accent/20 text-admin-accent shrink-0">
              <UserIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-admin-text-primary leading-tight">{staff.name}</h2>
              <p className="text-xs text-admin-text-muted uppercase tracking-wider font-semibold mt-0.5">{staff.role}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-bg-hover rounded-lg transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Month Selector & Summary Bar */}
        <div className="p-6 border-b border-admin-border bg-admin-bg-surface space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-admin-bg-subtle p-1 rounded-lg border border-admin-border shadow-2xs">
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="p-1.5 hover:bg-admin-bg-hover text-admin-text-secondary hover:text-admin-text-primary rounded-md transition-colors cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="font-semibold text-sm text-admin-text-primary w-36 text-center select-none">
                {monthYearStr}
              </span>
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="p-1.5 hover:bg-admin-bg-hover text-admin-text-secondary hover:text-admin-text-primary rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                disabled={isCurrentOrFutureMonth}
                title="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportAttendanceToCSV(records, `${staff.name}_attendance_${monthYearStr}.csv`)}
              disabled={records.length === 0}
              className="shadow-2xs text-xs font-medium"
            >
              <Download size={14} className="mr-1.5" /> Export CSV
            </Button>
          </div>

          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-4 gap-2.5">
            <div className="bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-xl flex flex-col items-center shadow-2xs">
              <span className="text-2xl font-bold text-emerald-700">{summary.present}</span>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Present</span>
            </div>
            <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl flex flex-col items-center shadow-2xs">
              <span className="text-2xl font-bold text-amber-700">{summary.halfday}</span>
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">Half Day</span>
            </div>
            <div className="bg-rose-50/80 border border-rose-200/80 p-3 rounded-xl flex flex-col items-center shadow-2xs">
              <span className="text-2xl font-bold text-rose-700">{summary.leave}</span>
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider mt-0.5">Leave</span>
            </div>
            <div className="bg-slate-100/80 border border-slate-200/80 p-3 rounded-xl flex flex-col items-center shadow-2xs">
              <span className="text-2xl font-bold text-slate-700">{summary.absent}</span>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Absent</span>
            </div>
          </div>
        </div>

        {/* Records List */}
        <div className="flex-1 overflow-y-auto p-6 bg-admin-bg-base/40 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 bg-admin-bg-surface border border-admin-border rounded-xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 bg-admin-bg-subtle rounded-lg skeleton-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-28 bg-admin-bg-subtle rounded skeleton-pulse" />
                      <div className="h-3 w-36 bg-admin-bg-subtle rounded skeleton-pulse" />
                    </div>
                  </div>
                  <div className="h-6 w-20 bg-admin-bg-subtle rounded-full skeleton-pulse" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="py-12">
              <EmptyState 
                heading="No records found" 
                subtext={`No attendance recorded for ${monthYearStr}`} 
                asCard={false}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {records.map(record => {
                const dateObj = new Date(record.date);
                const isOutBounds = !record.at_location && record.status !== 'Leave' && record.status !== 'Absent';
                
                return (
                  <div 
                    key={record.id} 
                    className={`p-4 bg-admin-bg-surface border rounded-xl flex items-center justify-between shadow-2xs hover:shadow-xs transition-all gap-4 ${
                      isOutBounds && record.review_status === 'pending' 
                        ? 'border-amber-300 bg-amber-50/20' 
                        : 'border-admin-border'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Date Badge */}
                      <div className="flex flex-col items-center justify-center w-13 h-13 bg-admin-bg-subtle border border-admin-border rounded-lg shrink-0">
                        <span className="text-[10px] font-bold text-admin-text-muted uppercase tracking-wider">
                          {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-base font-extrabold text-admin-text-primary leading-tight">
                          {dateObj.getDate()}
                        </span>
                      </div>
                      
                      {/* Details */}
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={record.status === 'Present' ? 'success' : record.status === 'Halfday' ? 'warning' : 'danger'}>
                            {record.status}
                          </Badge>

                          {isOutBounds && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-semibold">
                              Out of Area
                            </span>
                          )}

                          {record.gps_lat && record.gps_lng && (
                            <a
                              href={`https://www.google.com/maps?q=${record.gps_lat},${record.gps_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-admin-accent hover:underline flex items-center gap-1 font-medium"
                              title="View GPS Location"
                            >
                              <MapPin size={11} /> Map
                            </a>
                          )}
                        </div>
                        
                        {(record.status === 'Present' || record.status === 'Halfday') && (
                          <div className="text-xs text-admin-text-secondary flex items-center gap-2">
                            <span className="flex items-center gap-1 font-mono font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                            <span className="text-admin-text-muted">→</span>
                            <span className="flex items-center gap-1 font-mono font-medium">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Right side: Selfies + Review Status */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Selfie Thumbnails */}
                      {(record.checkInUrl || record.checkOutUrl) && (
                        <div className="flex items-center gap-1.5">
                          {record.checkInUrl && (
                            <button
                              onClick={() => setPreviewImage({ url: record.checkInUrl, label: `${staff.name} Check-In` })}
                              className="w-8 h-8 rounded-md overflow-hidden border border-admin-border hover:opacity-80 transition-opacity cursor-pointer shadow-2xs"
                              title="View Check-In Selfie"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={record.checkInUrl} alt="Check In" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          )}
                          {record.checkOutUrl && (
                            <button
                              onClick={() => setPreviewImage({ url: record.checkOutUrl, label: `${staff.name} Check-Out` })}
                              className="w-8 h-8 rounded-md overflow-hidden border border-admin-border hover:opacity-80 transition-opacity cursor-pointer shadow-2xs"
                              title="View Check-Out Selfie"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={record.checkOutUrl} alt="Check Out" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          )}
                        </div>
                      )}

                      {record.review_status && (
                        <Badge 
                          variant={record.review_status === 'approved' ? 'success' : record.review_status === 'rejected' ? 'danger' : 'warning'} 
                          className="capitalize text-xs font-semibold"
                        >
                          {record.review_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selfie Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-admin-bg-surface rounded-xl overflow-hidden shadow-2xl border border-admin-border animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-admin-border bg-admin-bg-subtle/50">
              <p className="font-bold text-sm text-admin-text-primary">{previewImage.label}</p>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-md hover:bg-admin-bg-hover transition-colors text-admin-text-muted hover:text-admin-text-primary cursor-pointer"
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="bg-black/90 flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url.replace('sz=w400', 'sz=w1200')}
                alt={previewImage.label}
                className="max-w-full max-h-[70vh] object-contain rounded"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
