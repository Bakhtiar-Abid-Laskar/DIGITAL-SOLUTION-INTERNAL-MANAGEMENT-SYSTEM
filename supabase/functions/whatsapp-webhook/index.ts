// index.ts — Supabase Edge Function: whatsapp-webhook
// Inbound Webhook Receiver for Meta WhatsApp Cloud API
// Handles:
// 1. GET: Webhook verification challenge (hub.challenge / hub.verify_token)
// 2. POST: Message delivery receipts (delivered, read, failed) & incoming customer messages
// 3. HMAC-SHA256 signature verification via X-Hub-Signature-256 header

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

declare const Deno: any;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
};

/**
 * Validates Meta's HMAC-SHA256 signature against raw payload.
 */
async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): Promise<boolean> {
  if (!signatureHeader || !appSecret) return true; // If secret not set yet, proceed in dev mode
  try {
    const cleanSig = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice(7)
      : signatureHeader;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBuf = new Uint8Array(
      cleanSig.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBuf,
      encoder.encode(rawBody)
    );
  } catch (err) {
    console.error('[WhatsApp Webhook] Signature verification failed:', err);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase credentials' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── 1. GET REQUEST: META WEBHOOK VERIFICATION HANDSHAKE ─────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    // Fetch verify_token from DB settings or Deno env
    let expectedToken = Deno.env.get('WEBHOOK_VERIFY_TOKEN') || Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'repairshop_webhook_secret';
    try {
      const { data: ws } = await supabase
        .from('whatsapp_settings')
        .select('verify_token')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (ws?.verify_token?.trim()) {
        expectedToken = ws.verify_token.trim();
      }
    } catch (_) {}

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[WhatsApp Webhook] Verification successful. Returning challenge.');
      return new Response(challenge || '', { status: 200 });
    }

    console.warn(`[WhatsApp Webhook] Verification failed. Token mismatch: "${token}" !== "${expectedToken}"`);
    return new Response('Forbidden', { status: 403 });
  }

  // ── 2. POST REQUEST: EVENT NOTIFICATIONS (DELIVERY RECEIPTS & INBOUND MESSAGES)
  if (req.method === 'POST') {
    try {
      const rawBody = await req.text();
      const signatureHeader = req.headers.get('x-hub-signature-256');

      // Check app secret for verification
      let appSecret = Deno.env.get('META_APP_SECRET');
      try {
        const { data: ws } = await supabase
          .from('whatsapp_settings')
          .select('app_secret')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (ws?.app_secret?.trim()) {
          appSecret = ws.app_secret.trim();
        }
      } catch (_) {}

      if (appSecret) {
        const isValid = await verifyMetaSignature(rawBody, signatureHeader, appSecret);
        if (!isValid) {
          console.error('[WhatsApp Webhook] Invalid X-Hub-Signature-256');
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 401,
          });
        }
      }

      const body = JSON.parse(rawBody);
      console.log('[WhatsApp Webhook] Received event payload:', JSON.stringify(body));

      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const val = change.value;
          if (!val) continue;

          // A. Process Status Updates (sent, delivered, read, failed)
          const statuses = val.statuses || [];
          for (const st of statuses) {
            const metaId = st.id;
            const newStatus = st.status; // 'sent' | 'delivered' | 'read' | 'failed'
            const timestamp = st.timestamp ? new Date(parseInt(st.timestamp) * 1000).toISOString() : new Date().toISOString();

            console.log(`[WhatsApp Webhook] Message ${metaId} status updated to: ${newStatus}`);

            const updateData: Record<string, any> = {
              status: newStatus,
            };

            if (newStatus === 'delivered') updateData.delivered_at = timestamp;
            if (newStatus === 'read') updateData.read_at = timestamp;
            if (st.errors && st.errors.length > 0) {
              updateData.error_detail = JSON.stringify(st.errors);
            }

            await supabase
              .from('whatsapp_messages')
              .update(updateData)
              .eq('meta_message_id', metaId);
          }

          // B. Process Inbound Messages from Customers
          const messages = val.messages || [];
          for (const msg of messages) {
            const fromPhone = msg.from;
            const msgType = msg.type;
            const msgText = msg.text?.body || `[${msgType}]`;
            const customerName = val.contacts?.[0]?.profile?.name || 'Customer';

            console.log(`[WhatsApp Webhook] Inbound message from ${fromPhone} (${customerName}): "${msgText}"`);

            await supabase.from('whatsapp_messages').insert({
              to_number: fromPhone,
              customer_name: customerName,
              message_body: `[Inbound] ${msgText}`,
              event_type: 'INBOUND_CUSTOMER_REPLY',
              meta_message_id: msg.id,
              status: 'delivered',
              sent_at: new Date().toISOString(),
            });

            await supabase.from('whatsapp_logs').insert({
              phone: fromPhone,
              event_type: 'INBOUND_MESSAGE',
              message: msgText,
              status: 'received',
              payload: msg,
            });
          }
        }
      }

      // Always return 200 OK to Meta so it does not retry the webhook
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (err: any) {
      console.error('[WhatsApp Webhook] Handler error:', err.message);
      // Return 200 with error payload to prevent Meta from disabling the webhook endpoint
      return new Response(JSON.stringify({ error: err.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
