// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { getAccessToken } from '../_shared/googleAuth.ts';
import { ensureFolderPath } from '../_shared/driveFolders.ts';
import { uploadFileToDrive, sanitizeFilenameSegment, monthName } from '../_shared/driveUpload.ts';

/**
 * process-pending-uploads — Supabase Edge Function
 *
 * Retry worker for Drive uploads that failed during user-facing actions
 * (attendance check-in, onsite arrival, invoice generation).
 *
 * Processes items from the pending_uploads table in batches of 20.
 * After 3 total attempts a row is left as "stuck" (visible in admin panel count).
 *
 * Called every 15 minutes by pg_cron (see migration 20260803000005).
 * Also callable manually by an admin if needed.
 *
 * NOTE: For selfie/photo retries, the original image must still be available
 * in Supabase Storage (check_in_selfie_url / arrival_selfie_url etc.) to
 * re-download and re-upload. If storage has been cleaned, the row stays stuck
 * and requires manual admin resolution.
 */

declare const Deno: any;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 20;

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // -------------------------------------------------------------------------
  // Fetch pending items that haven't exceeded max attempts
  // -------------------------------------------------------------------------
  const { data: pending, error: fetchError } = await supabaseAdmin
    .from('pending_uploads')
    .select('*')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ processed: 0, message: 'No pending uploads' }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const token = await getAccessToken();
  const results: Array<{ id: string; type: string; status: string; error?: string }> = [];

  for (const item of pending) {
    try {
      const payload = item.payload_json as Record<string, any>;
      let driveLink: string | null = null;
      let linkColumn: string | null = null;

      if (item.type === 'attendance-selfie') {
        // Re-fetch image from Supabase Storage using the original URL
        const { staffName, attendanceId, type: selfieType, year, month } = payload;
        const mName = monthName(Number(month));

        // Get the original selfie URL from the attendance row
        const { data: attRow } = await supabaseAdmin
          .from('attendance')
          .select('check_in_selfie_url, check_out_selfie_url')
          .eq('id', attendanceId)
          .single();

        const storageUrl = selfieType === 'checkin'
          ? attRow?.check_in_selfie_url
          : attRow?.check_out_selfie_url;

        if (!storageUrl) throw new Error('Original selfie URL no longer available in storage');

        const imgRes = await fetch(storageUrl);
        if (!imgRes.ok) throw new Error(`Could not fetch original image: ${imgRes.status}`);
        const imgBytes = new Uint8Array(await imgRes.arrayBuffer());

        const safeName = sanitizeFilenameSegment(staffName);
        const filename = payload.filename as string;
        const folderId = await ensureFolderPath(
          token, ['Attendance Selfies', String(year), mName, staffName]
        );
        const { webViewLink } = await uploadFileToDrive(token, {
          name: filename, mimeType: 'image/webp', parentId: folderId, data: imgBytes,
        });
        driveLink = webViewLink;
        linkColumn = selfieType === 'checkin' ? 'checkin_photo_drive_link' : 'checkout_photo_drive_link';

        await supabaseAdmin
          .from('attendance')
          .update({ [linkColumn]: driveLink })
          .eq('id', attendanceId);

      } else if (item.type === 'onsite-photo') {
        const { staffName, jobCode, onsiteVisitId, type: photoType, year, month } = payload;
        const mName = monthName(Number(month));

        const { data: visitRow } = await supabaseAdmin
          .from('onsite_visits')
          .select('arrival_selfie_url, departure_selfie_url')
          .eq('id', onsiteVisitId)
          .single();

        const storageUrl = photoType === 'arrival'
          ? visitRow?.arrival_selfie_url
          : visitRow?.departure_selfie_url;

        if (!storageUrl) throw new Error('Original photo URL no longer available in storage');

        const imgRes = await fetch(storageUrl);
        if (!imgRes.ok) throw new Error(`Could not fetch original image: ${imgRes.status}`);
        const imgBytes = new Uint8Array(await imgRes.arrayBuffer());

        const filename = payload.filename as string;
        const folderId = await ensureFolderPath(
          token, ['Onsite Photos', String(year), mName, jobCode]
        );
        const { webViewLink } = await uploadFileToDrive(token, {
          name: filename, mimeType: 'image/webp', parentId: folderId, data: imgBytes,
        });
        driveLink = webViewLink;
        linkColumn = photoType === 'arrival' ? 'arrival_photo_drive_link' : 'departure_photo_drive_link';

        await supabaseAdmin
          .from('onsite_visits')
          .update({ [linkColumn]: driveLink })
          .eq('id', onsiteVisitId);

      } else if (item.type === 'invoice' || item.type === 'receipt') {
        // Two sub-cases:
        //   A. driveAlreadyUploaded = true → Drive upload already succeeded during
        //      generate-invoice but the billing DB update failed. Only write DB.
        //   B. Full re-upload → Drive upload itself failed; re-encode HTML and upload.

        const { jobId, driveAlreadyUploaded, driveLink: existingDriveLink, driveFileId,
                docType, filename, htmlContent, year, month } = payload;

        if (!jobId) throw new Error('Missing jobId in invoice pending_upload payload');

        if (driveAlreadyUploaded && existingDriveLink) {
          // Sub-case A: Drive file already exists — just write the link to invoices
          const { error: updateError } = await supabaseAdmin
            .from('invoices')
            .update({ drive_link: existingDriveLink, drive_file_id: driveFileId })
            .eq('job_id', jobId);

          if (updateError) throw new Error(`invoices update error: ${updateError.message}`);
          driveLink = existingDriveLink;
          linkColumn = 'drive_link';

        } else {
          // Sub-case B: Re-upload the HTML to Drive
          if (!htmlContent) throw new Error('No htmlContent in payload — cannot retry upload');
          if (!filename) throw new Error('No filename in payload — cannot retry upload');

          const mName = monthName(Number(month));
          const folderId = await ensureFolderPath(
            token, ['Invoices', String(year), mName]
          );

          const htmlBytes = new TextEncoder().encode(htmlContent as string);
          const { fileId, webViewLink } = await uploadFileToDrive(token, {
            name: filename as string,
            mimeType: 'text/html',
            parentId: folderId,
            data: htmlBytes,
          });

          driveLink = webViewLink;
          linkColumn = 'drive_link';

          const { error: updateError } = await supabaseAdmin
            .from('invoices')
            .update({ drive_link: webViewLink, drive_file_id: fileId })
            .eq('job_id', jobId);

          if (updateError) throw new Error(`invoices update error: ${updateError.message}`);
        }
      }

      // Success — remove from queue
      await supabaseAdmin.from('pending_uploads').delete().eq('id', item.id);
      results.push({ id: item.id, type: item.type, status: 'success' });

    } catch (e: any) {
      const newAttempts = (item.attempts ?? 0) + 1;
      await supabaseAdmin
        .from('pending_uploads')
        .update({ attempts: newAttempts, last_error: e.message })
        .eq('id', item.id);

      results.push({ id: item.id, type: item.type, status: 'failed', error: e.message });
      console.error(`[process-pending-uploads] Item ${item.id} attempt ${newAttempts} failed:`, e.message);
    }
  }

  const succeeded = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;

  return new Response(
    JSON.stringify({ processed: results.length, succeeded, failed, results }),
    { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
  );
});
