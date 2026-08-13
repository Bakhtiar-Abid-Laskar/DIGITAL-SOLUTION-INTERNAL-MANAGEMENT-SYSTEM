'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@repairshop/shared';
import { EmployeeLeave } from '@/types/salary';
import { ClipboardList, Check, X, Plus } from 'lucide-react';
import { Tabs } from '@/components/common/Tabs';
import { formatDate } from '@/utils/formatDate';
import { Badge } from '@/components/common/Badge';
import { Pagination } from '@/components/common/Pagination';
import styles from '@/styles/salary.module.css';

interface Props {
  staff: User[];
  currentAdminId: string;
}

const tabs = [
  { id: 'pending',  label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const PAGE_SIZE = 10;

type LeaveStatus = 'pending' | 'approved' | 'rejected';

export default function LeaveManagement({ staff, currentAdminId }: Props) {
  const [activeTab, setActiveTab] = useState<LeaveStatus>('pending');
  const [leaves,    setLeaves]    = useState<(EmployeeLeave & { user?: { name: string; role: string } })[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [page,      setPage]      = useState(0);
  const [total,     setTotal]     = useState(0);
  const [error,     setError]     = useState('');

  // Direct-add leave form
  const [addUserId,    setAddUserId]    = useState('');
  const [addDate,      setAddDate]      = useState('');
  const [addReason,    setAddReason]    = useState('');
  const [addSaving,    setAddSaving]    = useState(false);
  const [addError,     setAddError]     = useState('');
  const [showAddForm,  setShowAddForm]  = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError('');
    const from = page * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    try {
      const { data, error: err, count } = await supabase
        .from('employee_leave')
        .select('*, user:user_id(name, role)', { count: 'exact' })
        .eq('status', activeTab)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (err) setError(err.message);
      else {
        setLeaves((data || []) as (EmployeeLeave & { user?: { name: string; role: string } })[]);
        setTotal(count || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { setPage(0); }, [activeTab]);
  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleApprove = async (leave: EmployeeLeave) => {
    const { error: err } = await supabase.from('employee_leave')
      .update({ status: 'approved', approved_by: currentAdminId, approved_at: new Date().toISOString() })
      .eq('id', leave.id);
    if (!err) {
      await supabase.from('payroll_audit_log').insert({
        action: 'leave_approved', user_id: leave.user_id,
        details: { leave_date: leave.leave_date, leave_id: leave.id },
        performed_by: currentAdminId,
      });
      setLeaves(prev => prev.filter(l => l.id !== leave.id));
      setTotal(t => Math.max(0, t - 1));
    }
  };

  const handleReject = async (leave: EmployeeLeave) => {
    const { error: err } = await supabase.from('employee_leave')
      .update({ status: 'rejected', approved_by: currentAdminId, approved_at: new Date().toISOString() })
      .eq('id', leave.id);
    if (!err) {
      await supabase.from('payroll_audit_log').insert({
        action: 'leave_rejected', user_id: leave.user_id,
        details: { leave_date: leave.leave_date, leave_id: leave.id },
        performed_by: currentAdminId,
      });
      setLeaves(prev => prev.filter(l => l.id !== leave.id));
      setTotal(t => Math.max(0, t - 1));
    }
  };

  const handleDirectAdd = async () => {
    setAddError('');
    if (!addUserId) return setAddError('Select a staff member.');
    if (!addDate)   return setAddError('Select a leave date.');
    setAddSaving(true);
    try {
      const { error: err } = await supabase.from('employee_leave').insert({
        user_id:     addUserId,
        leave_date:  addDate,
        status:      'approved',
        reason:      addReason.trim() || null,
        approved_by: currentAdminId,
        approved_at: new Date().toISOString(),
      });
      if (!err) {
        await supabase.from('payroll_audit_log').insert({
          action: 'leave_approved', user_id: addUserId,
          details: { leave_date: addDate, source: 'admin_direct' },
          performed_by: currentAdminId,
        });
        setAddUserId(''); setAddDate(''); setAddReason(''); setShowAddForm(false);
        if (activeTab === 'approved') fetchLeaves();
      } else {
        setAddError(err.message);
      }
    } finally {
      setAddSaving(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const statusBadgeVariant = (s: LeaveStatus) =>
    s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning';

  return (
    <div className={styles.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
          <ClipboardList size={20} style={{ flexShrink: 0 }} />
          Leave Management
        </h2>
        <button className={styles.btnSecondary} onClick={() => setShowAddForm(f => !f)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} />
          Add Leave
        </button>
      </div>

      {/* Direct add form */}
      {showAddForm && (
        <div className="border border-admin-border rounded-xl p-4 mb-4 bg-admin-bg-subtle/30 space-y-3">
          <h3 className="text-sm font-semibold text-admin-text-primary">Mark Leave (Auto-Approved)</h3>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="field-xe1n0a" className={styles.label}>Staff Member *</label>
              <select id="field-xe1n0a" className={styles.select} value={addUserId} onChange={e => setAddUserId(e.target.value)}>
                <option value="">— choose staff —</option>
                {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="field-xzmcpo" className={styles.label}>Leave Date *</label>
              <input id="field-xzmcpo" className={styles.input} type="date" value={addDate} onChange={e => setAddDate(e.target.value)} />
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="field-srlzb6" className={styles.label}>Reason (optional)</label>
            <input id="field-srlzb6" className={styles.input} type="text" value={addReason} onChange={e => setAddReason(e.target.value)} placeholder="e.g. Personal" />
          </div>
          {addError && <p className={styles.error}>{addError}</p>}
          <button className={styles.btnPrimary} onClick={handleDirectAdd} disabled={addSaving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Check size={16} />
            {addSaving ? 'Saving...' : 'Mark Approved Leave'}
          </button>
        </div>
      )}

      <Tabs items={tabs} activeId={activeTab} onChange={id => setActiveTab(id as LeaveStatus)} />

      <div style={{ marginTop: 16 }}>
        {loading && <p className={styles.hint}>Loading...</p>}
        {error   && <p className={styles.error}>{error}</p>}
        {!loading && leaves.length === 0 && (
          <p className={styles.hint}>No {activeTab} leave requests.</p>
        )}
        {!loading && leaves.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-admin-border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', color: 'var(--color-admin-text-secondary)', fontWeight: 600 }}>Staff</th>
                <th style={{ padding: '8px 10px', color: 'var(--color-admin-text-secondary)', fontWeight: 600 }}>Leave Date</th>
                <th style={{ padding: '8px 10px', color: 'var(--color-admin-text-secondary)', fontWeight: 600 }}>Reason</th>
                <th style={{ padding: '8px 10px', color: 'var(--color-admin-text-secondary)', fontWeight: 600 }}>Requested</th>
                <th style={{ padding: '8px 10px', color: 'var(--color-admin-text-secondary)', fontWeight: 600 }}>Status</th>
                {activeTab === 'pending' && (
                  <th style={{ padding: '8px 10px', color: 'var(--color-admin-text-secondary)', fontWeight: 600 }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {leaves.map(lv => (
                <tr key={lv.id} style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                  <td style={{ padding: '10px' }}>{lv.user?.name || '—'} <span style={{ color: 'var(--color-admin-text-muted)', fontSize: 11 }}>({lv.user?.role})</span></td>
                  <td style={{ padding: '10px' }}>{lv.leave_date}</td>
                  <td style={{ padding: '10px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lv.reason || '—'}</td>
                  <td style={{ padding: '10px' }}>{formatDate(lv.created_at)}</td>
                  <td style={{ padding: '10px' }}>
                    <Badge variant={statusBadgeVariant(lv.status as LeaveStatus)}>{lv.status}</Badge>
                  </td>
                  {activeTab === 'pending' && (
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className={styles.btnPrimary} onClick={() => handleApprove(lv)}
                          style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Check size={12} /> Approve
                        </button>
                        <button className={styles.btnDestructive} onClick={() => handleReject(lv)}
                          style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <X size={12} /> Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ marginTop: 12 }}>
            <Pagination 
              currentPage={page + 1} 
              totalPages={totalPages} 
              onPageChange={(p) => setPage(p - 1)} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
