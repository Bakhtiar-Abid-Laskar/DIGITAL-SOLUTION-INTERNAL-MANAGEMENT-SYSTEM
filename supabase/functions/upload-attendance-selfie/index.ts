// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { getAccessToken } from '../_shared/googleAuth.ts';
import { ensureFolderPath } from '../_shared/driveFolders.ts';
import { uploadFileToDrive, sanitizeFilenameSegment, formatDateForFilename, monthName } from '../_shared/driveUpload.ts';

/**
 * upload-attendance-selfie — Supabase Edge Function
 *
 * Called from the mobile app immediately after a check-in or check-out selfie
 * is captured. The photo MUST already be converted to WebP on-device before
 * sending (expo-image-manipulator, SaveFormat.WEBP, quality 0.78, max 1280px).
 *
 * NON-BLOCKING design: The attendance record must already be saved in the DB
 * before calling this function. If Drive upload fails, the attendance row stays
 * intact and the failed upload is queued in pending_uploads for retry.
 * The user's check-in/check-out is NEVER blocked by Drive availability.
 *
 * Accepts: multipart/form-data with fields:
 *   - staffId:      UUID of the staff member (must match auth.uid())
 *   - staffName:    Display name for folder/filename generation
 *   - attendanceId: UUID of the attendance row to update with the Drive link
 *   - timestamp:    ISO string of when the photo was taken
 *   - type:         'checkin' | 'checkout'
 *   - image:        WebP file bytes (Blob/File field)
 *
 * Drive path: Attendance Selfies / <year> / <month> / <StaffName> / <name>-<YYYYMMDD>-<checkin|checkout>.webp
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
  // Auth: any active staff member can upload their own selfie
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
  const attendanceId = formData.get('attendanceId') as string;
  const timestamp = formData.get('timestamp') as string;
  const type = formData.get('type') as string; // 'checkin' | 'checkout'
  const imageFile = formData.get('image') as File | null;

  if (!staffId || !staffName || !attendanceId || !timestamp || !type || !imageFile) {
    return new Response(JSON.stringify({ error: 'Missing required fields: staffId, staffName, attendanceId, timestamp, type, image' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (type !== 'checkin' && type !== 'checkout') {
    return new Response(JSON.stringify({ error: 'type must be checkin or checkout' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Security: ensure the caller can only upload for their own staffId
  if (staffId !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden: staffId does not match authenticated user' }), {
      status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // -------------------------------------------------------------------------
  // Determine folder and filename
  // -------------------------------------------------------------------------
  const ts = new Date(timestamp);
  const year = ts.getUTCFullYear();
  const month = ts.getUTCMonth() + 1;
  const mName = monthName(month);
  const safeName = sanitizeFilenameSegment(staffName);
  const dateStr = formatDateForFilename(ts);
  const filename = `${safeName}-${dateStr}-${type}.webp`;

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

  const originalSize = imageBytes.length;

  // -------------------------------------------------------------------------
  // Upload to Drive (non-blocking: queue on failure rather than failing response)
  // -------------------------------------------------------------------------
  try {
    const token = await getAccessToken();
    const folderId = await ensureFolderPath(
      token,
      ['Attendance Selfies', String(year), mName, staffName]
    );

    const { fileId, webViewLink } = await uploadFileToDrive(token, {
      name: filename,
      mimeType: 'image/webp',
      parentId: folderId,
      data: imageBytes,
    });

    // Write Drive link back to the attendance row
    const linkColumn = type === 'checkin' ? 'checkin_photo_drive_link' : 'checkout_photo_drive_link';
    await supabaseAdmin
      .from('attendance')
      .update({ [linkColumn]: webViewLink })
      .eq('id', attendanceId);

    console.log(`[upload-attendance-selfie] Uploaded ${filename} (${originalSize} bytes) → ${webViewLink}`);

    return new Response(
      JSON.stringify({ success: true, fileId, link: webViewLink, filename, sizeBytes: originalSize }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error(`[upload-attendance-selfie] Drive upload failed for ${filename}:`, e.message);

    // Queue for retry — attendance row already saved, user not blocked
    try {
      await supabaseAdmin.from('pending_uploads').insert({
        type: 'attendance-selfie',
        reference_id: attendanceId,
        reference_table: 'attendance',
        payload_json: {
          staffId, staffName, attendanceId, timestamp, type,
          filename, year, month,
          // Note: image bytes are NOT stored in pending_uploads (too large for jsonb).
          // The retry worker will re-attempt if the original Supabase Storage URL
          // (check_in_selfie_url / check_out_selfie_url) is still available.
          // If not, the admin can manually re-trigger from the attendance record.
        },
        attempts: 1,
        last_error: e.message,
      });
    } catch (queueError: any) {
      console.error('[upload-attendance-selfie] Failed to queue retry:', queueError.message);
    }

    // Return success from the user's perspective — their check-in succeeded.
    // The upload failure is handled asynchronously.
    return new Response(
      JSON.stringify({
        success: true,
        uploadStatus: 'queued_for_retry',
        message: 'Attendance recorded. Photo will be uploaded in the background.',
      }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
