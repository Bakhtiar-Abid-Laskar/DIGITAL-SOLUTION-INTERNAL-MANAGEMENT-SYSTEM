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

/** Parse "HH:MM" string into minutes since midnight */
function parseTimeToMinutes(t: string): number {
  const parts = (t || '').split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/** Compute tiered penalty amount from minutes late/early */
function tieredPenalty(minutes: number, tier1Mins: number, tier1Amt: number, tier2Amt: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= tier1Mins) return tier1Amt;
  return tier2Amt;
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

    // Handle mark-paid action separately
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

    // Default: calculate / generate
    if (!user_id || !month) return json({ error: 'Missing required fields: user_id, month' }, 400, corsHeaders);
    if (!/^\d{4}-\d{2}$/.test(month)) return json({ error: 'month must be in YYYY-MM format' }, 400, corsHeaders);

    const [year, monthNum] = month.split('-').map(Number);
    const { start: dateStart, end: dateEnd } = getMonthRange(month);

    // ── 4. Fetch target employee ─────────────────────────────────────────────
    const { data: employee, error: empErr } = await adminClient
      .from('users').select('id, name, role').eq('id', user_id).single();
    if (empErr || !employee) return json({ error: 'Employee not found' }, 404, corsHeaders);

    // ── 5. Fetch payroll profile ─────────────────────────────────────────────
    const { data: rates } = await adminClient
      .from('staff_rates').select('*').eq('user_id', user_id).maybeSingle();

    const monthly_salary              = rates?.monthly_salary ?? rates?.base_pay ?? 0;
    
    // Fixed System Constants (Phase 2 of simplified payroll)
    const preferred_checkin_mins      = 10 * 60 + 30; // 10:30
    const preferred_checkout_mins     = 19 * 60;      // 19:00

    // Leave deduction rate: derived from monthly salary if absent_day_deduction is not set
    const absent_day_deduction        = rates?.absent_day_deduction > 0 ? rates.absent_day_deduction : (monthly_salary > 0 ? Math.round(monthly_salary / 30) : 0);
    const allowed_leave_days          = rates?.allowed_leave_days ?? 2;
    const ot_rate_per_hour            = rates?.ot_rate_per_hour ?? 0;
    const halfday_deduction_rate      = rates?.halfday_deduction ?? 80;
    const penalty_tier1_amount        = rates?.penalty_tier1_amount ?? 30;
    const penalty_tier2_amount        = rates?.penalty_tier2_amount ?? 60;

    // ── 6. Fetch holidays ────────────────────────────────────────────────────
    const { data: holidaysRows } = await adminClient
      .from('holidays').select('date').gte('date', dateStart).lte('date', dateEnd);
    const holidayDates   = new Set<string>((holidaysRows || []).map((h: { date: string }) => h.date));
    const holidays_count = holidayDates.size;
    const working_days   = getWorkingDaysInMonth(year, monthNum, holidayDates);

    // ── 7. Fetch attendance & compute per-day penalties ───────────────────────
    const { data: attendanceRows, error: attErr } = await adminClient
      .from('attendance')
      .select('date, status, check_in_time, check_out_time, ot_hours, early_hours, late_in_minutes, early_in_minutes, late_out_minutes')
      .eq('user_id', user_id)
      .gte('date', dateStart)
      .lte('date', dateEnd);
    if (attErr) return json({ error: 'Failed to fetch attendance: ' + attErr.message }, 500, corsHeaders);

    const records = attendanceRows || [];

    let present_days       = 0;
    let halfday_count      = 0;
    let leave_count        = 0;
    let absent_count       = 0;
    let ot_hours           = 0;
    let early_in_instances = 0;
    let late_out_instances = 0;
    let total_late_deduction  = 0;
    let total_early_deduction = 0;

    for (const r of records) {
      const isHoliday = holidayDates.has(r.date);
      const status    = (r.status || '').toLowerCase();

      if (status === 'present')                             { present_days++; }
      else if (status === 'halfday')                        { halfday_count++; }
      else if (status === 'leave')                          { leave_count++; }
      else if (status === 'absent' && !isHoliday)           { absent_count++; }

      // Simplified Penalty Logic (Phase 3)
      let late_penalty_today  = 0;
      let early_penalty_today = 0;
      let ot_hours_today      = 0;

      if (r.check_in_time) {
        const checkInDate       = new Date(r.check_in_time);
        const checkInMins       = checkInDate.getUTCHours() * 60 + checkInDate.getUTCMinutes();
        const checkInMinsIST    = (checkInMins + 330) % (24 * 60);
        const lateMinutes       = Math.max(0, checkInMinsIST - preferred_checkin_mins);

        if (lateMinutes > 0) {
          late_penalty_today = lateMinutes <= 60 ? penalty_tier1_amount : penalty_tier2_amount;
        }
      }

      if (r.check_out_time) {
        const checkOutDate      = new Date(r.check_out_time);
        const checkOutMins      = checkOutDate.getUTCHours() * 60 + checkOutDate.getUTCMinutes();
        const checkOutMinsIST   = (checkOutMins + 330) % (24 * 60);
        const earlyMinutes      = Math.max(0, preferred_checkout_mins - checkOutMinsIST);

        if (earlyMinutes > 0) {
          early_penalty_today = earlyMinutes <= 60 ? penalty_tier1_amount : penalty_tier2_amount;
        }
        
        // Overtime only counts past 19:00
        const overTimeMinutes   = Math.max(0, checkOutMinsIST - preferred_checkout_mins);
        if (overTimeMinutes > 0) {
          ot_hours_today = overTimeMinutes / 60;
          ot_hours += ot_hours_today;
        }
      }

      // Combine and cap at max penalty_tier2_amount per day
      const max_daily_penalty = penalty_tier2_amount;
      const daily_penalty = Math.min(late_penalty_today + early_penalty_today, max_daily_penalty);

      // Distribute proportionally if capped, to track late vs early separately for the breakdown
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

    // ── 8. Leave deduction ───────────────────────────────────────────────────
    // Approved leaves from employee_leave table
    const { data: leaveRows } = await adminClient
      .from('employee_leave')
      .select('leave_date')
      .eq('user_id', user_id)
      .eq('status', 'approved')
      .gte('leave_date', dateStart)
      .lte('leave_date', dateEnd);

    const approved_leave_count = (leaveRows || []).length;
    // Absences beyond the allowed free leave days (using per-day absent_day_deduction rate)
    const chargeable_absent  = Math.max(0, absent_count - Math.max(0, allowed_leave_days - leave_count));
    const chargeable_leaves  = Math.max(0, approved_leave_count - allowed_leave_days);
    const absence_deduction  = chargeable_absent  * absent_day_deduction;
    const leave_deduction    = chargeable_leaves  * absent_day_deduction;

    // ── 9. Half-day deduction ────────────────────────────────────────────────
    const halfday_deduction_total = halfday_count * halfday_deduction_rate;

    // ── 10. OT pay ────────────────────────────────────────────────────────────
    const ot_pay = ot_hours * ot_rate_per_hour;

    // ── 11. Staff incentives ──────────────────────────────────────────────────
    let incentive_pay = 0;
    const { data: incentiveRows } = await adminClient
      .from('staff_incentives').select('amount').eq('user_id', user_id)
      .gte('created_at', `${dateStart}T00:00:00+05:30`)
      .lte('created_at', `${dateEnd}T23:59:59.999+05:30`);
    incentive_pay = (incentiveRows || []).reduce((sum: number, r: { amount: number }) => sum + (Number(r.amount) || 0), 0);

    // ── 12. Bonus from employee_bonus table ───────────────────────────────────
    let bonus_amount = 0;
    const { data: bonusRows } = await adminClient
      .from('employee_bonus').select('amount')
      .eq('user_id', user_id).eq('month', monthNum).eq('year', year);
    bonus_amount = (bonusRows || []).reduce((sum: number, r: { amount: number }) => sum + (Number(r.amount) || 0), 0);

    // ── 13. Gross Salary ─────────────────────────────────────────────────────
    // Base is FIXED monthly salary — attendance only feeds deductions
    const total_additions  = ot_pay + incentive_pay + bonus_amount;
    const total_deductions = halfday_deduction_total + absence_deduction + leave_deduction + total_late_deduction + total_early_deduction;
    const gross_salary     = Math.max(0, monthly_salary + total_additions - total_deductions);

    // ── 17. Advance salary deducted ───────────────────────────────────────────
    const { data: advanceRows } = await adminClient
      .from('payments').select('amount').eq('user_id', user_id).eq('type', 'advance_salary')
      .gte('created_at', `${dateStart}T00:00:00+05:30`)
      .lte('created_at', `${dateEnd}T23:59:59.999+05:30`);
    const advance_deducted = (advanceRows || []).reduce((sum: number, r: { amount: number }) => sum + (Number(r.amount) || 0), 0);

    // ── 18. Net Salary ────────────────────────────────────────────────────────
    const net_salary = Math.max(0, gross_salary - advance_deducted);

    // ── 19. Check existing salary record ─────────────────────────────────────
    const { data: existingSalary } = await adminClient
      .from('salary').select('id, status').eq('user_id', user_id).eq('month', `${month}-01`).maybeSingle();

    // ── 20. Save to salary table ──────────────────────────────────────────────
    const salaryPayload = {
      user_id,
      month: `${month}-01`,
      // Legacy / existing columns
      base_daily_rate:            monthly_salary > 0 ? Math.round((monthly_salary / 30) * 100) / 100 : 0,
      working_days,
      present_days,
      halfday_count,
      leave_count,
      ot_hours,
      ot_rate_per_hour,
      early_hours:                0,
      early_deduction_per_hour:   0,
      advance_deducted,
      gross_salary,
      net_salary,
      // New breakdown columns
      monthly_salary_base:        monthly_salary,
      halfday_deduction_total,
      absence_deduction_total:    absence_deduction,
      late_in_deduction_total:    total_late_deduction,
      early_out_deduction_total:  total_early_deduction,
      customer_review_deduction:  0,
      early_in_bonus_total:       0,
      late_out_bonus_total:       0,
      overtime_pay:               ot_pay,
      customer_review_bonus_total:0,
      job_completion_bonus:       0,
      incentive_amount:           incentive_pay,
      // Phase 5 new columns
      bonus_amount,
      leave_deduction,
      late_deduction:             total_late_deduction,
      early_deduction:            total_early_deduction,
      status:                     existingSalary?.status === 'paid' ? 'paid' : 'draft',
      generated_by:               callerUser.id,
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

      // ── 21. Audit log ─────────────────────────────────────────────────────────
      await insertAuditLog(adminClient,
        existingSalary ? 'payroll_regenerated' : 'payroll_generated',
        user_id,
        { month, gross_salary, net_salary, salary_id },
        callerUser.id
      );
    }

    // ── 22. Assemble response ─────────────────────────────────────────────────
    const breakdown = {
      user_id: employee.id,
      employee_name: employee.name,
      employee_role: employee.role,
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
      full_absent_days: absent_count,
      half_absent_days: halfday_count,
      allowed_leave_days,
      chargeable_days: chargeable_absent,
      approved_leave_count,
      chargeable_leaves,

      // Additions
      ot_hours,
      ot_rate_per_hour,
      ot_pay,
      incentive_pay,
      bonus_amount,
      total_additions,

      // Deductions
      halfday_deduction_rate: 80,
      halfday_deduction_total,
      absent_day_deduction,
      absence_deduction,
      leave_deduction,
      late_deduction: total_late_deduction,
      early_deduction: total_early_deduction,
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
