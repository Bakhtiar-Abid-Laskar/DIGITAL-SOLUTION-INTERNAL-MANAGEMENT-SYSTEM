// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getAccessToken, verifyAuth } from '../_shared/googleAuth.ts';
import { ensureFolderPath, clearFolderCache } from '../_shared/driveFolders.ts';
import { authorizeEdgeRequest } from '../_shared/notifications.ts';

/**
 * test-drive-auth — Edge Function
 *
 * Verifies that Google Drive authentication is working correctly.
 * Restricted strictly to administrators.
 */

declare const Deno: any;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const auth = await authorizeEdgeRequest(req, ['admin']);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: auth.error || 'UNAUTHORIZED' }), {
      status: auth.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Get access token (tests token exchange)
    const token = await getAccessToken();


    // 2. Verify identity (tests Drive API connectivity)
    const identity = await verifyAuth();

    // 3. Test folder creation (tests ensureFolderPath idempotency)
    clearFolderCache();
    const folderId1 = await ensureFolderPath(token, ['RepairShop Test', 'Auth Verification']);
    const folderId2 = await ensureFolderPath(token, ['RepairShop Test', 'Auth Verification']);

    if (folderId1 !== folderId2) {
      throw new Error(`Folder deduplication failed — created two folders instead of one (${folderId1} vs ${folderId2})`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        authenticatedAs: identity,
        testFolderPath: 'RepairShop Test / Auth Verification',
        testFolderId: folderId1,
        message: 'Auth is working correctly. Both calls returned the same folder ID — no duplicates.',
      }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('test-drive-auth error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
