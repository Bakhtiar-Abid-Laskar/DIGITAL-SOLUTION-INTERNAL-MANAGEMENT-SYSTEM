import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { X, CalendarDays, Download, ChevronLeft, ChevronRight, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { exportAttendanceToCSV } from '@/utils/csv';

interface StaffAttendanceDrawerProps {
  staff: { id: string; name: string; role: string } | null;
  onClose: () => void;
}

export function StaffAttendanceDrawer({ staff, onClose }: StaffAttendanceDrawerProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
        setRecords(data);
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-xl h-full bg-[var(--surface-base)] shadow-2xl flex flex-col border-l border-[var(--border-subtle)] animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-admin-accent/10 rounded-full flex items-center justify-center border border-admin-accent/20">
              <UserIcon className="text-admin-accent" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{staff.name}</h2>
              <p className="text-sm text-[var(--text-secondary)] uppercase tracking-wider font-medium">{staff.role}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Month Selector & Summary */}
        <div className="p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4 bg-[var(--surface-sunken)] p-1 rounded-lg border border-[var(--border-subtle)]">
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="p-1.5 hover:bg-[var(--surface-hover)] rounded-md transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="font-semibold text-[var(--text-primary)] w-32 text-center">
                {monthYearStr}
              </span>
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="p-1.5 hover:bg-[var(--surface-hover)] rounded-md transition-colors"
                disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
              >
                <ChevronRight size={18} className={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear() ? "opacity-30" : ""} />
              </button>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportAttendanceToCSV(records, `${staff.name}_attendance_${monthYearStr}.csv`)}
              disabled={records.length === 0}
            >
              <Download size={14} className="mr-2" /> Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[var(--surface-sunken)] p-3 rounded-lg border border-[var(--border-subtle)] flex flex-col items-center">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{summary.present}</span>
              <span className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Present</span>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex flex-col items-center">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.halfday}</span>
              <span className="text-xs text-amber-700 dark:text-amber-500 uppercase font-semibold">Half Day</span>
            </div>
            <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 flex flex-col items-center">
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.leave}</span>
              <span className="text-xs text-red-700 dark:text-red-500 uppercase font-semibold">Leave</span>
            </div>
            <div className="bg-[var(--surface-sunken)] p-3 rounded-lg border border-[var(--border-subtle)] flex flex-col items-center">
              <span className="text-2xl font-bold text-[var(--text-tertiary)]">{summary.absent}</span>
              <span className="text-xs text-[var(--text-tertiary)] uppercase font-semibold">Absent</span>
            </div>
          </div>
        </div>

        {/* Records List */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--surface-sunken)]">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-accent" />
            </div>
          ) : records.length === 0 ? (
            <EmptyState 
              heading="No records found" 
              subtext={`No attendance data for ${monthYearStr}`} 
            />
          ) : (
            <div className="space-y-3">
              {records.map(record => (
                <div key={record.id} className={`p-4 bg-[var(--surface-base)] border rounded-xl flex items-center justify-between shadow-sm transition-colors ${!record.at_location && record.review_status === 'pending' ? 'border-amber-400 bg-amber-500/5' : 'border-[var(--border-subtle)]'}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-14 h-14 bg-[var(--surface-sunken)] rounded-lg">
                      <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span className="text-lg font-bold text-[var(--text-primary)]">{new Date(record.date).getDate()}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={record.status === 'Present' ? 'success' : record.status === 'Halfday' ? 'warning' : 'danger'}>
                          {record.status}
                        </Badge>
                        {!record.at_location && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-medium">Out of Area</span>
                        )}
                      </div>
                      
                      {record.status === 'Present' || record.status === 'Halfday' ? (
                        <div className="text-sm text-[var(--text-secondary)] flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                          <span>→</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  
                  {record.review_status && (
                    <Badge variant={record.review_status === 'approved' ? 'success' : record.review_status === 'rejected' ? 'danger' : 'warning'} className="capitalize">
                      {record.review_status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
