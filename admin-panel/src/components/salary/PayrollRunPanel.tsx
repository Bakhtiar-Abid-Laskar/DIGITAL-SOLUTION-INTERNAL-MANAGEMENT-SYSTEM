'use client';

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@repairshop/shared';
import { formatCurrency } from '@repairshop/shared';
import {
  PlayCircle, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, ChevronDown,
} from 'lucide-react';
import styles from '@/styles/salary.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RunStatus = 'missing' | 'draft' | 'paid';

interface StaffRunRow {
  user: User;
  status: RunStatus;
  net_salary: number | null;
  salary_id: string | null;
  generating: boolean;
  markingPaid: boolean;
  error: string | null;
}

interface Props {
  staff: User[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const statusIcon = (s: RunStatus) => {
  if (s === 'paid')    return <CheckCircle2 size={14} style={{ flexShrink: 0, color: 'var(--color-admin-success, #16a34a)' }} />;
  if (s === 'draft')   return <Clock size={14} style={{ flexShrink: 0, color: 'var(--color-admin-warning, #ca8a04)' }} />;
  return <AlertTriangle size={14} style={{ flexShrink: 0, color: 'var(--color-admin-danger, #dc2626)' }} />;
};

const statusLabel: Record<RunStatus, string> = {
  missing: 'Not Generated',
  draft:   'Draft',
  paid:    'Paid',
};

const statusColor: Record<RunStatus, { bg: string; fg: string }> = {
  missing: { bg: 'var(--color-admin-danger-bg, #fee2e2)',  fg: 'var(--color-admin-danger,   #dc2626)' },
  draft:   { bg: 'var(--color-admin-warning-bg, #fef9c3)', fg: 'var(--color-admin-warning,  #ca8a04)' },
  paid:    { bg: 'var(--color-admin-success-bg, #dcfce7)', fg: 'var(--color-admin-success,  #16a34a)' },
};

function currentMonthDefault() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PayrollRunPanel({ staff }: Props) {
  const [month, setMonth] = useState(currentMonthDefault);
  const [rows, setRows]   = useState<StaffRunRow[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // ── Load salary status for all staff ──────────────────────────────────────
  const loadStatuses = useCallback(async () => {
    if (!staff.length) return;
    setLoadingStatus(true);

    const monthDate = `${month}-01`;
    const { data: salaryRows } = await supabase
      .from('salary')
      .select('id, user_id, status, net_salary')
      .eq('month', monthDate)
      .in('user_id', staff.map(u => u.id));

    const salaryMap = new Map<string, { id: string; status: string; net_salary: number }>(
      (salaryRows || []).map(r => [r.user_id, r])
    );

    setRows(
      staff.map(u => {
        const sr = salaryMap.get(u.id);
        return {
          user:        u,
          status:      sr ? (sr.status as RunStatus) : 'missing',
          net_salary:  sr?.net_salary ?? null,
          salary_id:   sr?.id ?? null,
          generating:  false,
          markingPaid: false,
          error:       null,
        };
      })
    );

    setLoadingStatus(false);
  }, [staff, month]);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  // ── Update a single row field ──────────────────────────────────────────────
  const patchRow = (userId: string, patch: Partial<StaffRunRow>) => {
    setRows(prev => prev.map(r => r.user.id === userId ? { ...r, ...patch } : r));
  };

  // ── Generate / Regenerate salary for one staff member ─────────────────────
  const generateOne = async (row: StaffRunRow) => {
    patchRow(row.user.id, { generating: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-monthly-salary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ user_id: row.user.id, month }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Calculation failed');

      const d = json.data;
      patchRow(row.user.id, {
        status:     d.status as RunStatus,
        net_salary: d.net_salary,
        salary_id:  d.salary_id,
        generating: false,
      });
    } catch (err: any) {
      patchRow(row.user.id, { generating: false, error: err.message });
    }
  };

  // ── Generate ALL missing/draft in sequence (no parallel) ──────────────────
  const generateAll = async () => {
    const pending = rows.filter(r => r.status !== 'paid' && !r.generating);
    for (const row of pending) {
      // await each one sequentially to avoid race conditions on audit logs
      await generateOne(row);
    }
  };

  // ── Mark one as paid via Edge Function ────────────────────────────────────
  const markPaidOne = async (row: StaffRunRow) => {
    if (!row.salary_id) return;
    patchRow(row.user.id, { markingPaid: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-monthly-salary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            action:    'mark_paid',
            salary_id: row.salary_id,
            user_id:   row.user.id,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to mark paid');

      patchRow(row.user.id, { status: 'paid', markingPaid: false });
    } catch (err: any) {
      patchRow(row.user.id, { markingPaid: false, error: err.message });
    }
  };

  // ── Summary counts ─────────────────────────────────────────────────────────
  const counts = {
    missing: rows.filter(r => r.status === 'missing').length,
    draft:   rows.filter(r => r.status === 'draft').length,
    paid:    rows.filter(r => r.status === 'paid').length,
  };

  return (
    <div className={styles.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <PlayCircle size={20} style={{ flexShrink: 0 }} />
            Payroll Run
          </h2>
          <p className={styles.hint}>Generate and manage monthly salary for all staff in one place.</p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Month picker */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <input
              id="payroll-month-picker"
              className={styles.input}
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              style={{ paddingRight: 32 }}
            />
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: 'var(--color-admin-text-muted)' }} />
          </div>

          {/* Refresh */}
          <button
            className={styles.btnSecondary}
            onClick={loadStatuses}
            disabled={loadingStatus}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} style={{ animation: loadingStatus ? 'spin 1s linear infinite' : undefined }} />
            Refresh
          </button>

          {/* Generate All */}
          <button
            className={styles.btnPrimary}
            onClick={generateAll}
            disabled={counts.missing === 0 && counts.draft === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <PlayCircle size={14} />
            Generate All ({counts.missing + counts.draft} pending)
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['missing', 'draft', 'paid'] as RunStatus[]).map(s => (
          <span
            key={s}
            style={{
              padding: '3px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              background: statusColor[s].bg,
              color: statusColor[s].fg,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {statusIcon(s)}
            {counts[s]} {statusLabel[s]}
          </span>
        ))}
      </div>

      {/* Staff table */}
      {loadingStatus ? (
        <p className={styles.hint}>Loading payroll status...</p>
      ) : rows.length === 0 ? (
        <p className={styles.hint}>No active staff found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-admin-border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', color: 'var(--color-admin-text-secondary)', fontWeight: 600 }}>Staff</th>
              <th style={{ padding: '8px 10px', color: 'var(--color-admin-text-secondary)', fontWeight: 600 }}>Role</th>
              <th style={{ padding: '8px 10px', color: 'var(--color-admin-text-secondary)', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '8px 10px', color: 'var(--color-admin-text-secondary)', fontWeight: 600, textAlign: 'right' }}>Net Salary</th>
              <th style={{ padding: '8px 10px', color: 'var(--color-admin-text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.user.id} style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                <td style={{ padding: '10px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-admin-text-primary)' }}>{row.user.name}</span>
                </td>
                <td style={{ padding: '10px', textTransform: 'capitalize', color: 'var(--color-admin-text-secondary)' }}>
                  {row.user.role}
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background: statusColor[row.status].bg,
                    color: statusColor[row.status].fg,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    {statusIcon(row.status)}
                    {statusLabel[row.status]}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: 'var(--color-admin-text-primary)' }}>
                  {row.net_salary !== null ? formatCurrency(row.net_salary) : '—'}
                </td>
                <td style={{ padding: '10px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                    {row.error && (
                      <span style={{ fontSize: 11, color: 'var(--color-admin-danger)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.error}>
                        {row.error}
                      </span>
                    )}

                    {/* Generate / Regenerate */}
                    {row.status !== 'paid' && (
                      <button
                        className={styles.btnPrimary}
                        onClick={() => generateOne(row)}
                        disabled={row.generating}
                        style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <PlayCircle size={12} />
                        {row.generating ? 'Generating...' : row.status === 'missing' ? 'Generate' : 'Regenerate'}
                      </button>
                    )}

                    {/* Mark Paid */}
                    {row.status === 'draft' && row.salary_id && (
                      <button
                        className={styles.btnSecondary}
                        onClick={() => markPaidOne(row)}
                        disabled={row.markingPaid}
                        style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <CheckCircle2 size={12} />
                        {row.markingPaid ? 'Marking...' : 'Mark Paid'}
                      </button>
                    )}

                    {/* Paid badge */}
                    {row.status === 'paid' && (
                      <span style={{ fontSize: 12, color: 'var(--color-admin-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} /> Paid
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
