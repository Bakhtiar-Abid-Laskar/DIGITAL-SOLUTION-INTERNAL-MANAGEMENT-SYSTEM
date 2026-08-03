// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { getAccessToken } from '../_shared/googleAuth.ts';
import { ensureFolderPath } from '../_shared/driveFolders.ts';
import { uploadFileToDrive, sanitizeFilenameSegment, monthName } from '../_shared/driveUpload.ts';
import { buildStaffAttendanceWorkbook } from '../_shared/attendanceReport.ts';

/**
 * export-attendance-reports — Supabase Edge Function
 *
 * Generates one per-staff .xlsx attendance report for every active staff member
 * for a given month, and uploads each to Google Drive under:
 *   Attendance Report / <year> / <month name> / <sanitized-name>-MMYYYY.xlsx
 *
 * Separate from export-monthly-data for independent error isolation.
 * If one staff member's export fails, the others still proceed.
 *
 * Called:
 * - Manually by admin via admin panel
 * - Automatically by pg_cron on the 1st of each month (30 min after monthly data export)
 *
 * JWT check: caller must be admin role.
 * Returns: { success, results: [...] } where results has one entry per staff member.
 */

declare const Deno: any;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // -------------------------------------------------------------------------
  // Auth: verify caller is admin
  // -------------------------------------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
      status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // -------------------------------------------------------------------------
  // Determine target month
  // -------------------------------------------------------------------------
  let year: number;
  let month: number;

  try {
    const body = await req.json().catch(() => ({}));
    if (body.year && body.month) {
      year = Number(body.year);
      month = Number(body.month);
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) throw new Error('Invalid year/month');
    } else {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      now.setDate(1);
      now.setMonth(now.getMonth() - 1);
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const mName = monthName(month);
  const mmYYYY = `${String(month).padStart(2, '0')}${year}`;

  // -------------------------------------------------------------------------
  // Fetch all active staff
  // -------------------------------------------------------------------------
  const { data: staffList, error: staffError } = await supabaseAdmin
    .from('users')
    .select('id, name, role')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (staffError || !staffList) {
    return new Response(JSON.stringify({ error: 'Failed to fetch staff list' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // -------------------------------------------------------------------------
  // Ensure Drive folder once (shared across all staff files)
  // -------------------------------------------------------------------------
  let folderId: string;
  try {
    const token = await getAccessToken();
    folderId = await ensureFolderPath(token, ['Attendance Report', String(year), mName]);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: `Drive folder setup failed: ${e.message}` }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // -------------------------------------------------------------------------
  // Generate + upload one file per staff member
  // -------------------------------------------------------------------------
  const results: Array<{
    staffId: string;
    staffName: string;
    status: 'success' | 'failed';
    link?: string;
    filename?: string;
    error?: string;
  }> = [];

  // Get token once (cached for invocation duration by googleAuth.ts)
  const token = await getAccessToken();

  for (const staff of staffList) {
    const safeName = sanitizeFilenameSegment(staff.name); // e.g. 'rahul-kumar'
    const filename = `${safeName}-${mmYYYY}.xlsx`;         // e.g. 'rahul-kumar-082026.xlsx'

    try {
      const xlsxBytes = await buildStaffAttendanceWorkbook(
        supabaseAdmin, staff.id, staff.name, year, month
      );

      const { webViewLink } = await uploadFileToDrive(token, {
        name: filename,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        parentId: folderId,
        data: xlsxBytes,
      });

      results.push({ staffId: staff.id, staffName: staff.name, status: 'success', link: webViewLink, filename });
    } catch (e: any) {
      console.error(`Attendance export failed for ${staff.name}:`, e.message);
      results.push({ staffId: staff.id, staffName: staff.name, status: 'failed', error: e.message });
    }
  }

  const anySuccess = results.some(r => r.status === 'success');
  const allFailed = results.every(r => r.status === 'failed');

  // Log a single export_jobs row for this run
  await supabaseAdmin.from('export_jobs').insert({
    type: 'attendance-report',
    status: allFailed ? 'failed' : 'success',
    target_month: `${year}-${String(month).padStart(2, '0')}`,
    error_message: allFailed ? 'All staff exports failed' : null,
    completed_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({
      success: anySuccess,
      targetMonth: `${year}-${String(month).padStart(2, '0')}`,
      folder: `Attendance Report / ${year} / ${mName}`,
      results,
    }),
    { status: anySuccess ? 200 : 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
  );
});
