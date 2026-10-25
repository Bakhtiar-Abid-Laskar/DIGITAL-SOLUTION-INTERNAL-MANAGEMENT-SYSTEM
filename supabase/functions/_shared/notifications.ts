// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

export interface PushNotificationPayload {
  userId: string;
  pushToken?: string | null;
  title: string;
  body: string;
  data?: Record<string, any>;
  jobId?: string;
}

/**
 * Validates whether a given string is a valid Expo push token format
 * Accepts both ExpoPushToken[...] (EAS / modern SDK) and ExponentPushToken[...] (legacy)
 */
export function isValidExpoPushToken(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  return /^(Expo|Exponent)PushToken\[[a-zA-Z0-9_\-\.]+\]$/.test(trimmed) ||
         trimmed.startsWith('ExpoPushToken[') ||
         trimmed.startsWith('ExponentPushToken[');
}

/**
 * Shared push notification sender for all RepairShop Edge Functions
 * - Always records an audit entry in public.notifications
 * - Dispatches to Expo Push Notification Service when a valid token exists
 * - Inspects Expo ticket responses for errors (e.g. DeviceNotRegistered)
 * - Automatically prunes stale/unregistered tokens from public.users
 * - Updates notification status to 'sent' or 'failed'
 */
export async function sendPushNotification(
  supabase: any,
  { userId, pushToken, title, body, data, jobId }: PushNotificationPayload
) {
  const now = new Date().toISOString();

  const resolvedTitle = title || 'RepairShop';

  // 1. Always record in notifications table (in-app audit trail)
  const { data: notifRecord, error: dbError } = await supabase
    .from('notifications')
    .insert({
      recipient_user_id: userId,
      title: resolvedTitle,
      message: body,
      job_id: jobId || null,
      channel: 'push',
      sent_at: now,
      status: 'pending',
    })
    .select('id')
    .single();

  if (dbError) {
    console.error(`[Push Notification] Error logging notification to DB for user ${userId}:`, dbError.message);
  }

  // 2. Validate push token
  if (!isValidExpoPushToken(pushToken)) {
    console.log(`[Push Notification] Skipped push delivery: User ${userId} has no valid Expo push token (token: "${pushToken || 'null'}"). Logged to DB.`);
    return { success: false, reason: 'no_token', notifId: notifRecord?.id };
  }

  const cleanToken = pushToken!.trim();
  console.log(`[Push Notification] Dispatching to Expo for user ${userId} [${cleanToken.slice(0, 18)}...]: "${resolvedTitle}"`);

  // 3. Dispatch to Expo Push API
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: cleanToken,
        sound: 'default',
        priority: 'high',
        title: resolvedTitle,
        body,
        data: data || {},
        channelId: 'default',
      }),
    });

    const dataRes = await res.json();
    console.log(`[Push Notification] Expo response status ${res.status}:`, JSON.stringify(dataRes));

    // Check top-level API errors
    if (dataRes.errors && dataRes.errors.length > 0) {
      const errDetail = dataRes.errors.map((e: any) => e.message).join('; ');
      console.error(`[Push Notification] Expo API error for user ${userId}:`, errDetail);
      if (notifRecord?.id) {
        await supabase.from('notifications').update({ status: 'failed' }).eq('id', notifRecord.id);
      }
      return { success: false, error: errDetail };
    }

    // Inspect individual ticket results
    const ticket = Array.isArray(dataRes.data) ? dataRes.data[0] : dataRes.data;
    if (ticket) {
      if (ticket.status === 'ok') {
        console.log(`[Push Notification] ✅ Successfully delivered to Expo for user ${userId} (Ticket ID: ${ticket.id})`);
        if (notifRecord?.id) {
          await supabase.from('notifications').update({ status: 'sent' }).eq('id', notifRecord.id);
        }
        return { success: true, ticketId: ticket.id };
      } else if (ticket.status === 'error') {
        const errorType = ticket.details?.error || ticket.message;
        console.error(`[Push Notification] ❌ Expo delivery error for user ${userId}:`, ticket.message, errorType);

        // Auto-prune stale token if device unregistered
        if (errorType === 'DeviceNotRegistered') {
          console.warn(`[Push Notification] 🧹 Auto-pruning unregistered token for user ${userId}`);
          await supabase
            .from('users')
            .update({ expo_push_token: null })
            .eq('id', userId);
        }

        if (notifRecord?.id) {
          await supabase.from('notifications').update({ status: 'failed' }).eq('id', notifRecord.id);
        }
        return { success: false, error: ticket.message };
      }
    }

    if (notifRecord?.id) {
      await supabase.from('notifications').update({ status: 'sent' }).eq('id', notifRecord.id);
    }
    return { success: true };
  } catch (err: any) {
    console.error(`[Push Notification] Network/fetch failure while sending push to ${userId}:`, err.message);
    if (notifRecord?.id) {
      await supabase.from('notifications').update({ status: 'failed' }).eq('id', notifRecord.id);
    }
    return { success: false, error: err.message };
  }
}

declare const Deno: any;

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

export interface EdgeAuthResult {
  isAuthorized: boolean;
  callerType?: 'webhook' | 'service_role' | 'user';
  user?: any;
  error?: string;
  status: number;
}

/**
 * Shared authorization helper for Supabase Edge Functions.
 * Rejects public anon key callers (SEC-001).
 * Authenticates either:
 * 1. Server-to-server webhook secret (header: x-webhook-secret or webhook-signature)
 * 2. Service role key (Authorization: Bearer <service_role_key>)
 * 3. Authenticated active user JWT with valid role in allowedRoles (if specified)
 */
export async function authorizeEdgeRequest(
  req: Request,
  allowedRoles?: string[]
): Promise<EdgeAuthResult> {
  const webhookSecret = Deno.env.get('APP_WEBHOOK_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  const signature = req.headers.get('x-webhook-secret') || req.headers.get('webhook-signature');
  const authHeader = req.headers.get('Authorization');

  // 1. Verify webhook secret if present
  if (webhookSecret && signature && timingSafeCompare(signature, webhookSecret)) {
    return { isAuthorized: true, callerType: 'webhook', status: 200 };
  }

  // 2. Verify Authorization header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    // SEC-001: Explicitly reject public anon key callers
    if (anonKey && token === anonKey) {
      return {
        isAuthorized: false,
        error: 'Unauthorized: Public anon key is not permitted to trigger this function',
        status: 401,
      };
    }

    // Check service role key
    if (serviceRoleKey && timingSafeCompare(token, serviceRoleKey)) {
      return { isAuthorized: true, callerType: 'service_role', status: 200 };
    }

    // Check authenticated user JWT
    if (token && token.length > 20) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      if (!supabaseUrl || !serviceRoleKey) {
        return { isAuthorized: false, error: 'Server configuration error', status: 500 };
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: authData, error: authErr } = await adminClient.auth.getUser(token);

      if (authErr || !authData?.user) {
        return { isAuthorized: false, error: 'Unauthorized: Invalid user session', status: 401 };
      }

      // Query public.users to check active status and role
      const { data: userData, error: userErr } = await adminClient
        .from('users')
        .select('id, role, is_active, name')
        .eq('id', authData.user.id)
        .single();

      if (userErr || !userData) {
        return { isAuthorized: false, error: 'Unauthorized: User record not found', status: 403 };
      }

      if (!userData.is_active) {
        return { isAuthorized: false, error: 'Unauthorized: User account is inactive', status: 403 };
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userData.role)) {
        return {
          isAuthorized: false,
          error: `Forbidden: Role '${userData.role}' is not authorized for this action`,
          status: 403,
        };
      }

      return { isAuthorized: true, callerType: 'user', user: userData, status: 200 };
    }
  }

  return {
    isAuthorized: false,
    error: 'Unauthorized: Missing or invalid authentication credentials',
    status: 401,
  };
}
