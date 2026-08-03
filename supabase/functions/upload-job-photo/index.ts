// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { getAccessToken } from '../_shared/googleAuth.ts';
import { ensureFolderPath } from '../_shared/driveFolders.ts';
import { uploadFileToDrive, sanitizeFilenameSegment, formatDateForFilename, monthName } from '../_shared/driveUpload.ts';

/**
 * upload-job-photo — Supabase Edge Function
 *
 * Called from the mobile app when a technician captures an onsite arrival or
 * departure selfie. The photo MUST already be converted to WebP on-device
 * (expo-image-manipulator, SaveFormat.WEBP, quality 0.78, max 1280px).
 *
 * NON-BLOCKING design: the onsite_visits row must be saved before calling this.
 * Drive upload failures are queued in pending_uploads and do not block the user.
 *
 * Accepts: multipart/form-data with fields:
 *   - staffId:       UUID of the technician (must match auth.uid())
 *   - staffName:     Display name for filename
 *   - jobCode:       Job code (e.g. RS-2026-0042) used as Drive folder name
 *   - onsiteVisitId: UUID of the onsite_visits row to update
 *   - timestamp:     ISO string of when the photo was taken
 *   - type:          'arrival' | 'departure'
 *   - image:         WebP file bytes
 *
 * Drive path: Onsite Photos / <year> / <month> / <jobCode> / <staffname>-<YYYYMMDD>-<HHmmss>.webp
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
  // Auth: any active staff member can upload their own photo
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

  // -------------------------------------------------------------------------
  // Parse multipart form
  // -------------------------------------------------------------------------
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Invalid form data: ' + e.message }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const staffId = formData.get('staffId') as string;
  const staffName = formData.get('staffName') as string;
  const jobCode = formData.get('jobCode') as string;
  const onsiteVisitId = formData.get('onsiteVisitId') as string;
  const timestamp = formData.get('timestamp') as string;
  const type = formData.get('type') as string; // 'arrival' | 'departure'
  const imageFile = formData.get('image') as File | null;

  if (!staffId || !staffName || !jobCode || !onsiteVisitId || !timestamp || !type || !imageFile) {
    return new Response(JSON.stringify({ error: 'Missing required fields: staffId, staffName, jobCode, onsiteVisitId, timestamp, type, image' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (type !== 'arrival' && type !== 'departure') {
    return new Response(JSON.stringify({ error: 'type must be arrival or departure' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Security: only the technician themselves can upload their photo
  if (staffId !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden: staffId does not match authenticated user' }), {
      status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // -------------------------------------------------------------------------
  // Build Drive path and filename
  // -------------------------------------------------------------------------
  const ts = new Date(timestamp);
  const year = ts.getUTCFullYear();
  const month = ts.getUTCMonth() + 1;
  const mName = monthName(month);
  const safeName = sanitizeFilenameSegment(staffName);
  const dateStr = formatDateForFilename(ts);
  const hh = String(ts.getUTCHours()).padStart(2, '0');
  const mm = String(ts.getUTCMinutes()).padStart(2, '0');
  const ss = String(ts.getUTCSeconds()).padStart(2, '0');
  const filename = `${safeName}-${dateStr}-${hh}${mm}${ss}.webp`;

  // -------------------------------------------------------------------------
  // Read image bytes
  // -------------------------------------------------------------------------
  let imageBytes: Uint8Array;
  try {
    const arrayBuffer = await imageFile.arrayBuffer();
    imageBytes = new Uint8Array(arrayBuffer);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to read image: ' + e.message }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // -------------------------------------------------------------------------
  // Upload to Drive (non-blocking: queue on failure)
  // -------------------------------------------------------------------------
  try {
    const token = await getAccessToken();
    // Folder: Onsite Photos / <year> / <month> / <jobCode>
    const folderId = await ensureFolderPath(
      token,
      ['Onsite Photos', String(year), mName, jobCode]
    );

    const { fileId, webViewLink } = await uploadFileToDrive(token, {
      name: filename,
      mimeType: 'image/webp',
      parentId: folderId,
      data: imageBytes,
    });

    // Write Drive link back to the onsite_visits row
    const linkColumn = type === 'arrival' ? 'arrival_photo_drive_link' : 'departure_photo_drive_link';
    await supabaseAdmin
      .from('onsite_visits')
      .update({ [linkColumn]: webViewLink })
      .eq('id', onsiteVisitId);

    console.log(`[upload-job-photo] Uploaded ${filename} (${imageBytes.length} bytes) → ${webViewLink}`);

    return new Response(
      JSON.stringify({ success: true, fileId, link: webViewLink, filename }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error(`[upload-job-photo] Drive upload failed for ${filename}:`, e.message);

    // Queue for retry
    try {
      await supabaseAdmin.from('pending_uploads').insert({
        type: 'onsite-photo',
        reference_id: onsiteVisitId,
        reference_table: 'onsite_visits',
        payload_json: { staffId, staffName, jobCode, onsiteVisitId, timestamp, type, filename, year, month },
        attempts: 1,
        last_error: e.message,
      });
    } catch (queueError: any) {
      console.error('[upload-job-photo] Failed to queue retry:', queueError.message);
    }

    // Return success — the onsite visit row is already saved
    return new Response(
      JSON.stringify({
        success: true,
        uploadStatus: 'queued_for_retry',
        message: 'Onsite visit recorded. Photo will be uploaded in the background.',
      }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
