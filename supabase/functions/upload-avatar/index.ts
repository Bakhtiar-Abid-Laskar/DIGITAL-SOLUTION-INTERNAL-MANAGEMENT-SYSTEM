// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { getAccessToken } from '../_shared/googleAuth.ts';
import { ensureFolderPath } from '../_shared/driveFolders.ts';
import { uploadFileToDrive, sanitizeFilenameSegment } from '../_shared/driveUpload.ts';

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

  const authHeader = req.headers.get('Authorization') ?? '';
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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Invalid form data: ' + e.message }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const staffName = formData.get('staffName') as string;
  const imageFile = formData.get('image') as File | null;

  if (!staffName || !imageFile) {
    return new Response(JSON.stringify({ error: 'Missing required fields: staffName, image' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const filename = `${sanitizeFilenameSegment(staffName)}-Avatar-${Date.now()}.webp`;

  let imageBytes: Uint8Array;
  try {
    const arrayBuffer = await imageFile.arrayBuffer();
    imageBytes = new Uint8Array(arrayBuffer);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to read image' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = await getAccessToken();
    const folderId = await ensureFolderPath(
      token,
      ['App Photos', staffName, 'Avatar']
    );

    const { fileId, webViewLink } = await uploadFileToDrive(token, {
      name: filename,
      mimeType: 'image/webp',
      parentId: folderId,
      data: imageBytes,
    });

    return new Response(
      JSON.stringify({ success: true, fileId, link: webViewLink }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
