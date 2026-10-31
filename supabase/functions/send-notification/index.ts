// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { sendPushNotification, authorizeEdgeRequest } from '../_shared/notifications.ts';

declare const Deno: any;

serve(async (req: Request) => {
  // Support CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
      },
    });
  }

  try {
    // 1. Authorize caller (staff user or internal webhook / service_role)
    const authResult = await authorizeEdgeRequest(req, ['admin', 'receptionist']);
    if (!authResult.isAuthorized) {
      return new Response(JSON.stringify({ error: authResult.error || 'Unauthorized' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: authResult.status || 401,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    const {
      user_ids,
      roles,
      title = 'Digital Solution',
      body,
      data = {},
      channel = 'push',
      jobId,
      idempotency_key,
    } = payload;

    if (!body) {
      return new Response(JSON.stringify({ error: 'Missing notification body' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 400,
      });
    }

    // 2. Idempotency Check (optional duplicate send protection)
    if (idempotency_key) {
      const { data: existingLog } = await supabase
        .from('notification_logs')
        .select('id, status, created_at')
        .eq('payload->>idempotency_key', idempotency_key)
        .limit(1)
        .maybeSingle();

      if (existingLog) {
        return new Response(
          JSON.stringify({
            message: 'Duplicate request suppressed via idempotency_key',
            idempotency_key,
            existing_log_id: existingLog.id,
          }),
          {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 200,
          }
        );
      }
    }

    // 3. Resolve target recipient user IDs
    const targetUserIds = new Set<string>();

    if (Array.isArray(user_ids)) {
      user_ids.forEach((id: string) => {
        if (typeof id === 'string' && id.trim()) targetUserIds.add(id.trim());
      });
    }

    if (Array.isArray(roles) && roles.length > 0) {
      const { data: staffUsers, error: staffErr } = await supabase
        .from('users')
        .select('id')
        .in('role', roles)
        .eq('is_active', true);

      if (!staffErr && staffUsers) {
        staffUsers.forEach((u: { id: string }) => targetUserIds.add(u.id));
      }
    }

    if (targetUserIds.size === 0) {
      return new Response(JSON.stringify({ error: 'No target recipients found for provided user_ids or roles' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 400,
      });
    }

    console.log(`[Unified Dispatcher] Sending push to ${targetUserIds.size} recipient(s): "${title}"`);

    // 4. Fan-out dispatch to each recipient user
    const dispatchResults: Record<string, any> = {};

    for (const recipientId of Array.from(targetUserIds)) {
      const result = await sendPushNotification(supabase, {
        userId: recipientId,
        title,
        body,
        data: { ...data, idempotency_key },
        jobId,
        channel,
      });
      dispatchResults[recipientId] = result;
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipients_count: targetUserIds.size,
        results: dispatchResults,
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[Unified Dispatcher] Error processing notification dispatch:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
});

