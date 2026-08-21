// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/** Working days in a calendar month (Mon–Sat) excluding Sunday & holidays */
function getWorkingDaysInMonth(year: number, month: number, holidayDates: Set<string>): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && !holidayDates.has(dStr)) count++;
  }
  return count;
}

function getMonthRange(monthStr: string): { start: string; end: string } {
  const [y, m] = monthStr.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${monthStr}-01`, end: `${monthStr}-${String(lastDay).padStart(2, '0')}` };
}

/** Write a single audit log row */
async function insertAuditLog(
  client: any,
  action: string,
  userId: string | null,
  details: Record<string, unknown>,
  performedBy: string
) {
  await client.from('payroll_audit_log').insert({
    action,
    user_id: userId,
    details,
    performed_by: performedBy,
  });
}

// ---------------------------------------------------------------------------
// Threshold-breach deduction logic (single source of truth)
//
// Rule (confirmed by business owner):
//   total_leave_absent = attendance_leave_days + absent_days (combined)
//   if total_leave_absent > max_leave_allowed:
//     threshold is BREACHED — every leave/absent day charged at absent_day_deduction
//     (no free days at all)
//   else:
//     normal — (total_leave_absent - allowed_leave_days) days charged,
//     floor at 0 (i.e. free days absorb the rest)
// ---------------------------------------------------------------------------
function computeLeaveDeductions(params: {
  leave_count: number;
  absent_count: number;
  allowed_leave_days: number;
  max_leave_allowed: number;
  absent_day_deduction: number;
}): {
  threshold_breached: boolean;
  total_leave_absent: number;
  chargeable_days: number;
  absence_deduction: number;
  leave_deduction: number;
} {
  const {
    leave_count,
    absent_count,
    allowed_leave_days,
    max_leave_allowed,
    absent_day_deduction,
  } = params;

  const total_leave_absent = leave_count + absent_count;
  const threshold_breached = total_leave_absent > max_leave_allowed;

  let chargeable_days: number;
  let absence_deduction: number;
  let leave_deduction: number;

  if (threshold_breached) {
    // ALL leave + absent days are charged — no free allowance
    chargeable_days   = total_leave_absent;
    absence_deduction = Math.round(chargeable_days * absent_day_deduction * 100) / 100;
    leave_deduction   = 0; // rolled into absence_deduction
  } else {
    // Normal: subtract free days
    chargeable_days   = Math.max(0, total_leave_absent - allowed_leave_days);
    absence_deduction = Math.round(chargeable_days * absent_day_deduction * 100) / 100;
    leave_deduction   = 0;
  }

  return {
    threshold_breached,
    total_leave_absent,
    chargeable_days,
    absence_deduction,
    leave_deduction,
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY') || serviceKey;

    // ── 1. Authenticate caller ──────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401, corsHeaders);

    const token = authHeader.replace('Bearer ', '');
    const callerClient = createClient(supabaseUrl, anonKey);
    const { data: { user: callerUser }, error: authErr } = await callerClient.auth.getUser(token);
    if (authErr || !callerUser) return json({ error: 'Unauthorized' }, 401, corsHeaders);

    const adminClient = createClient(supabaseUrl, serviceKey);

    // ── 2. Verify caller and parse request ──────────────────────────────────
    const { data: callerProfile } = await adminClient
      .from('users').select('role, is_active, name').eq('id', callerUser.id).single();
    if (!callerProfile || !callerProfile.is_active) {
      return json({ error: 'Forbidden' }, 403, corsHeaders);
    }

    const body = await req.json();
    const { user_id, month, action = 'calculate' } = body;

    // Admin can do anything. Non-admin can only preview their own salary.
    if (callerProfile.role !== 'admin') {
      if (user_id !== callerUser.id) {
        return json({ error: 'Forbidden: can only preview own salary' }, 403, corsHeaders);
      }
      if (action !== 'preview') {
        return json({ error: 'Forbidden: staff can only preview' }, 403, corsHeaders);
      }
    }

    // ── 3. Handle mark-paid action ───────────────────────────────────────────
    if (action === 'mark_paid') {
      if (callerProfile.role !== 'admin') {
        return json({ error: 'Forbidden: admin access only' }, 403, corsHeaders);
      }
      const { salary_id } = body;
      if (!salary_id) return json({ error: 'Missing salary_id for mark_paid' }, 400, corsHeaders);
      const { error: updateErr } = await adminClient
        .from('salary')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', salary_id);
      if (updateErr) return json({ error: updateErr.message }, 500, corsHeaders);

      await insertAuditLog(adminClient, 'payroll_marked_paid', user_id || null, { salary_id }, callerUser.id);
      return json({ success: true }, 200, corsHeaders);
    }

    // ── 4. Validate required fields ─────────────────────────────────────────
    if (!user_id || !month) return json({ error: 'Missing required fields: user_id, month' }, 400, corsHeaders);
    if (!/^\d{4}-\d{2}$/.test(month)) return json({ error: 'month must be in YYYY-MM format' }, 400, corsHeaders);

    const [year, monthNum] = month.split('-').map(Number);
    const { start: dateStart, end: dateEnd } = getMonthRange(month);

    // ── 5. Fetch target employee ─────────────────────────────────────────────
    const { data: employee, error: empErr } = await adminClient
      .from('users').select('id, name, role').eq('id', user_id).single();
    if (empErr || !employee) return json({ error: 'Employee not found' }, 404, corsHeaders);

    // ── 6. Fetch payroll profile ─────────────────────────────────────────────
    const { data: rates } = await adminClient
      .from('staff_rates').select('*').eq('user_id', user_id).maybeSingle();

    const monthly_salary         = rates?.monthly_salary ?? rates?.base_pay ?? 0;
    const allowed_leave_days     = rates?.allowed_leave_days ?? 2;
    const max_leave_allowed      = rates?.max_leave_allowed ?? 1;
    const ot_rate_per_hour       = rates?.ot_rate_per_hour ?? 0;
    const halfday_deduction_rate = rates?.halfday_deduction ?? 80;
    const penalty_tier1_amount   = rates?.penalty_tier1_amount ?? 30;
    const penalty_tier2_amount   = rates?.penalty_tier2_amount ?? 60;

    // absent_day_deduction: explicit rate or derive from monthly salary
    const absent_day_deduction =
      (rates?.absent_day_deduction ?? 0) > 0
        ? rates.absent_day_deduction
        : monthly_salary > 0
          ? Math.round(monthly_salary / 30)
          : 0;

    // Fixed schedule constants (IST: 10:30 check-in, 19:00 check-out)
    const preferred_checkin_mins  = 10 * 60 + 30; // 10:30 IST
    const preferred_checkout_mins = 19 * 60;       // 19:00 IST

    // ── 7. Fetch holidays ────────────────────────────────────────────────────
    const { data: holidaysRows } = await adminClient
      .from('holidays').select('date').gte('date', dateStart).lte('date', dateEnd);
    const holidayDates   = new Set<string>((holidaysRows || []).map((h: { date: string }) => h.date));
    const holidays_count = holidayDates.size;
    const working_days   = getWorkingDaysInMonth(year, monthNum, holidayDates);

    // ── 8. Fetch attendance & compute per-day penalties ─────────────────────
    const { data: attendanceRows, error: attErr } = await adminClient
      .from('attendance')
      .select('date, status, check_in_time, check_out_time, ot_hours')
      .eq('user_id', user_id)
      .gte('date', dateStart)
      .lte('date', dateEnd);
    if (attErr) return json({ error: 'Failed to fetch attendance: ' + attErr.message }, 500, corsHeaders);

    const records = attendanceRows || [];

    let present_days          = 0;
    let halfday_count         = 0;
    let leave_count           = 0;  // attendance rows with status = 'Leave'
    let absent_count          = 0;  // attendance rows with status = 'Absent' (non-holiday)
    let ot_hours              = 0;
    let total_late_deduction  = 0;
    let total_early_deduction = 0;

    for (const r of records) {
      const isHoliday = holidayDates.has(r.date);
      const status    = (r.status || '').toLowerCase();

      if      (status === 'present')               { present_days++; }
      else if (status === 'halfday')               { halfday_count++; }
      else if (status === 'leave')                 { leave_count++; }
      else if (status === 'absent' && !isHoliday) { absent_count++; }

      // Per-day penalty calculation
      let late_penalty_today  = 0;
      let early_penalty_today = 0;

      if (r.check_in_time) {
        const checkInDate    = new Date(r.check_in_time);
        const checkInMins    = checkInDate.getUTCHours() * 60 + checkInDate.getUTCMinutes();
        const checkInMinsIST = (checkInMins + 330) % (24 * 60);
        const lateMinutes    = Math.max(0, checkInMinsIST - preferred_checkin_mins);

        if (lateMinutes > 0) {
          late_penalty_today = lateMinutes <= 60 ? penalty_tier1_amount : penalty_tier2_amount;
        }
      }

      if (r.check_out_time) {
        const checkOutDate    = new Date(r.check_out_time);
        const checkOutMins    = checkOutDate.getUTCHours() * 60 + checkOutDate.getUTCMinutes();
        const checkOutMinsIST = (checkOutMins + 330) % (24 * 60);
        const earlyMinutes    = Math.max(0, preferred_checkout_mins - checkOutMinsIST);

        if (earlyMinutes > 0) {
          early_penalty_today = earlyMinutes <= 60 ? penalty_tier1_amount : penalty_tier2_amount;
        }

        // OT: only past 19:00 IST
        const overTimeMinutes = Math.max(0, checkOutMinsIST - preferred_checkout_mins);
        if (overTimeMinutes > 0) {
          ot_hours += overTimeMinutes / 60;
        }
      }

      // Cap combined daily penalty at tier2 max
      const max_daily_penalty = penalty_tier2_amount;
      const daily_penalty     = Math.min(late_penalty_today + early_penalty_today, max_daily_penalty);

      const raw_sum = late_penalty_today + early_penalty_today;
      if (raw_sum > 0 && daily_penalty < raw_sum) {
        const ratio = daily_penalty / raw_sum;
        total_late_deduction  += late_penalty_today  * ratio;
        total_early_deduction += early_penalty_today * ratio;
      } else {
        total_late_deduction  += late_penalty_today;
        total_early_deduction += early_penalty_today;
      }
    }

    total_late_deduction  = Math.round(total_late_deduction  * 100) / 100;
    total_early_deduction = Math.round(total_early_deduction * 100) / 100;

    // ── 9. Leave deduction — threshold-breach rule ───────────────────────────
    // Combines BOTH attendance-sourced leave_count + absent_count against
    // max_leave_allowed (confirmed by business owner Q1 answer).
    const {
      threshold_breached,
      total_leave_absent,
      chargeable_days,
      absence_deduction,
      leave_deduction,
    } = computeLeaveDeductions({
      leave_count,
      absent_count,
      allowed_leave_days,
      max_leave_allowed,
      absent_day_deduction,
    });

    // ── 10. Half-day deduction ───────────────────────────────────────────────
    const halfday_deduction_total = Math.round(halfday_count * halfday_deduction_rate * 100) / 100;

    // ── 11. OT pay ───────────────────────────────────────────────────────────
    ot_hours = Math.round(ot_hours * 100) / 100;
    const ot_pay = Math.round(ot_hours * ot_rate_per_hour * 100) / 100;

    // ── 12. Staff incentives (job/sale completions in the month) ─────────────
    let incentive_pay = 0;
    const { data: incentiveRows } = await adminClient
      .from('staff_incentives').select('amount').eq('user_id', user_id)
      .gte('created_at', `${dateStart}T00:00:00+05:30`)
      .lte('created_at', `${dateEnd}T23:59:59.999+05:30`);
    incentive_pay = (incentiveRows || []).reduce(
      (sum: number, r: { amount: number }) => sum + (Number(r.amount) || 0), 0
    );
    incentive_pay = Math.round(incentive_pay * 100) / 100;

    // ── 13. Bonus from employee_bonus table ──────────────────────────────────
    let bonus_amount = 0;
    const { data: bonusRows } = await adminClient
      .from('employee_bonus').select('amount')
      .eq('user_id', user_id).eq('month', monthNum).eq('year', year);
    bonus_amount = (bonusRows || []).reduce(
      (sum: number, r: { amount: number }) => sum + (Number(r.amount) || 0), 0
    );
    bonus_amount = Math.round(bonus_amount * 100) / 100;

    // ── 14. Gross salary ─────────────────────────────────────────────────────
    // Base = FIXED monthly salary. Attendance feeds only deductions.
    const total_additions  = ot_pay + incentive_pay + bonus_amount;
    const total_deductions = halfday_deduction_total + absence_deduction + leave_deduction
                           + total_late_deduction + total_early_deduction;
    const gross_salary     = Math.max(0, Math.round((monthly_salary + total_additions - total_deductions) * 100) / 100);

    // ── 15. Advance salary deducted ──────────────────────────────────────────
    const { data: advanceRows } = await adminClient
      .from('payments').select('amount').eq('user_id', user_id).eq('type', 'advance_salary')
      .gte('created_at', `${dateStart}T00:00:00+05:30`)
      .lte('created_at', `${dateEnd}T23:59:59.999+05:30`);
    const advance_deducted = Math.round(
      (advanceRows || []).reduce((sum: number, r: { amount: number }) => sum + (Number(r.amount) || 0), 0) * 100
    ) / 100;

    // ── 16. Net salary ───────────────────────────────────────────────────────
    const net_salary = Math.max(0, Math.round((gross_salary - advance_deducted) * 100) / 100);

    // ── 17. Existing salary record ───────────────────────────────────────────
    const { data: existingSalary } = await adminClient
      .from('salary').select('id, status').eq('user_id', user_id).eq('month', `${month}-01`).maybeSingle();

    // ── 18. Persist (if not preview) ─────────────────────────────────────────
    const salaryPayload = {
      user_id,
      month: `${month}-01`,
      // Legacy columns
      base_daily_rate:           monthly_salary > 0 ? Math.round((monthly_salary / 30) * 100) / 100 : 0,
      working_days,
      present_days,
      halfday_count,
      leave_count,
      ot_hours,
      ot_rate_per_hour,
      early_hours:               0,
      early_deduction_per_hour:  0,
      advance_deducted,
      gross_salary,
      net_salary,
      // Breakdown columns
      monthly_salary_base:       monthly_salary,
      halfday_deduction_total,
      absence_deduction_total:   absence_deduction,
      late_in_deduction_total:   total_late_deduction,
      early_out_deduction_total: total_early_deduction,
      customer_review_deduction: 0,
      early_in_bonus_total:      0,
      late_out_bonus_total:      0,
      overtime_pay:              ot_pay,
      customer_review_bonus_total: 0,
      job_completion_bonus:      0,
      incentive_amount:          incentive_pay,
      bonus_amount,
      leave_deduction,
      late_deduction:            total_late_deduction,
      early_deduction:           total_early_deduction,
      status:                    existingSalary?.status === 'paid' ? 'paid' : 'draft',
      generated_by:              callerUser.id,
      // Snapshot columns (schema-fixed in migration 20260821000000)
      allowed_leave_days_snap:   allowed_leave_days,
      max_leave_allowed_snap:    max_leave_allowed,
      threshold_breached,
    };

    let salary_id = existingSalary?.id ?? null;

    if (action !== 'preview') {
      if (salary_id) {
        await adminClient.from('salary').update(salaryPayload).eq('id', salary_id);
      } else {
        const { data: insertedSalary } = await adminClient
          .from('salary').insert(salaryPayload).select('id').single();
        salary_id = insertedSalary?.id ?? null;
      }

      await insertAuditLog(
        adminClient,
        existingSalary ? 'payroll_regenerated' : 'payroll_generated',
        user_id,
        {
          month,
          gross_salary,
          net_salary,
          salary_id,
          threshold_breached,
          total_leave_absent,
          chargeable_days,
        },
        callerUser.id
      );
    }

    // ── 19. Assemble response ─────────────────────────────────────────────────
    const breakdown = {
      user_id:        employee.id,
      employee_name:  employee.name,
      employee_role:  employee.role,
      month,
      salary_id,
      status: existingSalary?.status === 'paid' ? 'paid' : 'draft',

      // Base
      monthly_salary,
      base_pay: monthly_salary,

      // Working days
      working_days,
      holidays_count,

      // Attendance
      present_days,
      halfday_count,
      leave_count,
      absent_count,
      full_absent_days:    absent_count,
      half_absent_days:    halfday_count,
      total_leave_absent,

      // Leave threshold
      allowed_leave_days,
      max_leave_allowed,
      threshold_breached,
      chargeable_days,

      // Additions
      ot_hours,
      ot_rate_per_hour,
      ot_pay,
      incentive_pay,
      bonus_amount,
      total_additions,

      // Deductions
      halfday_deduction_rate,
      halfday_deduction_total,
      absent_day_deduction,
      absence_deduction,
      leave_deduction,
      late_deduction:   total_late_deduction,
      early_deduction:  total_early_deduction,
      total_deductions,
      advance_deducted,

      // Totals
      gross_salary,
      net_salary,
    };

    return json({ data: breakdown }, 200, corsHeaders);

  } catch (err: any) {
    console.error('[calculate-monthly-salary] Unhandled error:', err);
    return json({ error: err.message || 'Internal server error' }, 500, corsHeaders);
  }
});
