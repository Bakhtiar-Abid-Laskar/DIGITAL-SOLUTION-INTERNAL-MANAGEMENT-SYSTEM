// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { getAccessToken } from '../_shared/googleAuth.ts';
import { ensureFolderPath } from '../_shared/driveFolders.ts';
import { uploadFileToDrive, monthName } from '../_shared/driveUpload.ts';
import { buildMonthlyWorkbook } from '../_shared/exportWorkbook.ts';

/**
 * export-monthly-data — Supabase Edge Function
 *
 * Builds a multi-sheet .xlsx workbook (Jobs, Sales, Stock Snapshot) for a
 * given month and uploads it to Google Drive under:
 *   Data Export / <year> / <month name> / <Month> <Year> digital solution backup.xlsx
 *
 * Called:
 * - Manually by an admin via the admin panel (with optional { year, month } body)
 * - Automatically by pg_cron on the 1st of each month (no body → previous month)
 *
 * JWT check: caller must be admin role.
 * Returns: { success, link, filename } or { success: false, error }
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
  let month: number; // 1-indexed

  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.month === 'string' && body.month.includes('-')) {
      const [y, m] = body.month.split('-');
      year = Number(y);
      month = Number(m);
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        throw new Error('Invalid month format. Expected YYYY-MM');
      }
    } else if (body.year && body.month) {
      year = Number(body.year);
      month = Number(body.month);
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        throw new Error('Invalid year/month values');
      }
    } else {
      // Default: previous calendar month
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

  const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
  const mm = String(month).padStart(2, '0');
  const yy = String(year).slice(-2);
  const filename = `Monthly_Data_${mm}${yy}.xlsx`;

  // -------------------------------------------------------------------------
  // Log the export attempt
  // -------------------------------------------------------------------------
  const { data: jobRow, error: jobInsertError } = await supabaseAdmin
    .from('export_jobs')
    .insert({
      type: 'monthly-data',
      status: 'running',
      target_month: targetMonth,
    })
    .select('id')
    .single();

  if (jobInsertError) {
    console.error('Could not create export_jobs row:', jobInsertError.message);
    // Continue anyway — don't block the export for a logging failure
  }

  const jobId = jobRow?.id as string | undefined;

  async function failJob(errorMessage: string) {
    if (jobId) {
      await supabaseAdmin
        .from('export_jobs')
        .update({ status: 'failed', error_message: errorMessage, completed_at: new Date().toISOString() })
        .eq('id', jobId);
    }
  }

  // -------------------------------------------------------------------------
  // Build workbook
  // -------------------------------------------------------------------------
  let xlsxBytes: Uint8Array;
  try {
    xlsxBytes = await buildMonthlyWorkbook(supabaseAdmin, year, month);
  } catch (e: any) {
    await failJob(`Workbook build failed: ${e.message}`);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // -------------------------------------------------------------------------
  // Upload to Drive
  // -------------------------------------------------------------------------
  try {
    const token = await getAccessToken();
    const folderId = await ensureFolderPath(token, ['REPORTS', String(year), String(month).padStart(2, '0')]);
    const { fileId, webViewLink } = await uploadFileToDrive(token, {
      name: filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      parentId: folderId,
      data: xlsxBytes,
    });

    // Update export_jobs row
    if (jobId) {
      await supabaseAdmin
        .from('export_jobs')
        .update({
          status: 'success',
          drive_file_id: fileId,
          drive_link: webViewLink,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    return new Response(
      JSON.stringify({ success: true, link: webViewLink, filename, targetMonth }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    await failJob(`Drive upload failed: ${e.message}`);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
