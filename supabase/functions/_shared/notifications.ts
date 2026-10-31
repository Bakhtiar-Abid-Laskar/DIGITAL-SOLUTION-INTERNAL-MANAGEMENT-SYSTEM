// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
// @ts-ignore
import webpush from 'https://esm.sh/web-push@3.6.7';

declare const Deno: any;

export interface PushNotificationPayload {
  userId: string;
  pushToken?: string | null;
  title: string;
  body: string;
  data?: Record<string, any>;
  jobId?: string;
  channel?: string;
}

export interface DeviceTokenRow {
  id: string;
  user_id: string;
  platform: 'android' | 'ios' | 'web';
  token_or_endpoint: string;
  keys?: { p256dh: string; auth: string } | null;
  is_active: boolean;
}

/**
 * Validates whether a given string is a valid Expo push token format
 */
export function isValidExpoPushToken(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  return (
    /^(Expo|Exponent)PushToken\[[a-zA-Z0-9_\-\.]+\]$/.test(trimmed) ||
    trimmed.startsWith('ExpoPushToken[') ||
    trimmed.startsWith('ExponentPushToken[')
  );
}

/**
 * Shared push notification sender for all RepairShop Edge Functions.
 * 
 * Capabilities:
 * - Records an in-app audit record in public.notifications (triggering Supabase Realtime).
 * - Dispatches to ALL active devices registered in public.device_tokens (multi-device support).
 * - Fans out to Expo Push Service (Android native / iOS native) with channelId='default' and priority='high'.
 * - Fans out to Web Push Service (iOS Safari 16.4+ PWA / Desktop Web) via RFC 8291 / VAPID.
 * - Logs per-device delivery attempts, tickets, and provider responses to public.notification_logs.
 * - Auto-prunes unregistered/expired tokens (DeviceNotRegistered on Expo, 404/410 on Web Push).
 */
export async function sendPushNotification(
  supabase: any,
  { userId, pushToken, title, body, data, jobId, channel = 'push' }: PushNotificationPayload
) {
  const now = new Date().toISOString();
  const resolvedTitle = title || 'RepairShop';

  // 1. Record in-app notification entry for Realtime delivery & in-app notifications screen
  const { data: notifRecord, error: dbError } = await supabase
    .from('notifications')
    .insert({
      recipient_user_id: userId,
      title: resolvedTitle,
      message: body,
      job_id: jobId || null,
      channel,
      sent_at: now,
      status: 'pending',
    })
    .select('id')
    .single();

  if (dbError) {
    console.error(`[Push Notification] Error logging notification to DB for user ${userId}:`, dbError.message);
  }

  // 2. Fetch all registered active device tokens for this user
  let devices: DeviceTokenRow[] = [];
  try {
    const { data: deviceRows, error: devError } = await supabase
      .from('device_tokens')
      .select('id, user_id, platform, token_or_endpoint, keys, is_active')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!devError && Array.isArray(deviceRows) && deviceRows.length > 0) {
      devices = deviceRows as DeviceTokenRow[];
    }
  } catch (err: any) {
    console.warn(`[Push Notification] Could not fetch device_tokens for user ${userId}:`, err.message);
  }

  // 3. Backward compatibility: if no device_tokens found, check pushToken or users.expo_push_token
  if (devices.length === 0) {
    let fallbackToken = pushToken;
    if (!fallbackToken) {
      const { data: userRow } = await supabase
        .from('users')
        .select('expo_push_token')
        .eq('id', userId)
        .single();
      fallbackToken = userRow?.expo_push_token;
    }

    if (isValidExpoPushToken(fallbackToken)) {
      devices.push({
        id: 'legacy-fallback',
        user_id: userId,
        platform: 'android',
        token_or_endpoint: fallbackToken!.trim(),
        keys: null,
        is_active: true,
      });
    }
  }

  if (devices.length === 0) {
    console.log(`[Push Notification] User ${userId} has no active device tokens. Realtime in-app delivery recorded.`);
    if (notifRecord?.id) {
      await supabase.from('notifications').update({ status: 'sent' }).eq('id', notifRecord.id);
    }
    return { success: true, reason: 'no_tokens_in_app_only', notifId: notifRecord?.id, devicesCount: 0 };
  }

  console.log(`[Push Notification] Dispatching to ${devices.length} device(s) for user ${userId}: "${resolvedTitle}"`);

  let anyDelivered = false;
  const deliveryResults: any[] = [];

  // VAPID credentials for Web Push
  const vapidPublicKey =
    Deno.env.get('VAPID_PUBLIC_KEY') ||
    'BJti9LStmps1ap93J9kfIs4l-_IHMFo51ZawFtUdvFBCvTngCuM8x3lESXu3Au7yRD-8_BDl8GL4p3SAqIPglbg';
  const vapidPrivateKey =
    Deno.env.get('VAPID_PRIVATE_KEY') || 'mUPw0SbviYaLDysEsrxYaaTkVA8WW0FUiwAQZjvpbJc';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@digitalsolution.cc';

  // 4. Iterate over each registered device
  for (const device of devices) {
    if (device.platform === 'android' || device.platform === 'ios') {
      // --- EXPO PUSH FLOW ---
      const cleanToken = device.token_or_endpoint.trim();
      if (!isValidExpoPushToken(cleanToken)) continue;

      try {
        const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
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
            data: { jobId: jobId || null, ...(data || {}) },
            channelId: 'default',
          }),
        });

        const expoData = await expoRes.json();
        const ticket = Array.isArray(expoData.data) ? expoData.data[0] : expoData.data;

        if (ticket?.status === 'ok') {
          anyDelivered = true;
          deliveryResults.push({ deviceId: device.id, platform: device.platform, status: 'ok', ticketId: ticket.id });

          // Record success in notification_logs
          await supabase.from('notification_logs').insert({
            user_id: userId,
            platform: device.platform,
            channel: 'push',
            title: resolvedTitle,
            body,
            payload: { jobId, data },
            status: 'sent',
            provider_response: ticket,
          });
        } else if (ticket?.status === 'error') {
          const errorType = ticket.details?.error || ticket.message;
          console.error(`[Push Notification] Expo ticket error for device ${device.id}:`, errorType);

          deliveryResults.push({ deviceId: device.id, platform: device.platform, status: 'error', error: errorType });

          // Prune dead token
          if (errorType === 'DeviceNotRegistered') {
            console.warn(`[Push Notification] 🧹 Pruning unregistered token for device ${device.id}`);
            if (device.id !== 'legacy-fallback') {
              await supabase.from('device_tokens').delete().eq('id', device.id);
            }
            await supabase.from('users').update({ expo_push_token: null }).eq('id', userId);
          }

          await supabase.from('notification_logs').insert({
            user_id: userId,
            platform: device.platform,
            channel: 'push',
            title: resolvedTitle,
            body,
            payload: { jobId, data },
            status: 'failed',
            provider_response: ticket,
            error_message: errorType,
          });
        }
      } catch (expoErr: any) {
        console.error(`[Push Notification] Network failure to Expo for device ${device.id}:`, expoErr.message);
        deliveryResults.push({ deviceId: device.id, platform: device.platform, status: 'failed', error: expoErr.message });
      }
    } else if (device.platform === 'web' && device.keys?.p256dh && device.keys?.auth) {
      // --- WEB PUSH / PWA FLOW ---
      try {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        const pushSubscription = {
          endpoint: device.token_or_endpoint,
          keys: {
            p256dh: device.keys.p256dh,
            auth: device.keys.auth,
          },
        };

        const pushPayload = JSON.stringify({
          title: resolvedTitle,
          body,
          icon: '/assets/icon.png',
          data: { jobId: jobId || null, ...(data || {}) },
        });

        await webpush.sendNotification(pushSubscription, pushPayload);
        anyDelivered = true;
        deliveryResults.push({ deviceId: device.id, platform: 'web', status: 'ok' });

        await supabase.from('notification_logs').insert({
          user_id: userId,
          platform: 'web',
          channel: 'webpush',
          title: resolvedTitle,
          body,
          payload: { jobId, data },
          status: 'sent',
          provider_response: { success: true },
        });
      } catch (webErr: any) {
        console.error(`[Push Notification] Web Push error for device ${device.id}:`, webErr.statusCode || webErr.message);
        deliveryResults.push({ deviceId: device.id, platform: 'web', status: 'error', error: webErr.message });

        // HTTP 404 or 410 indicates subscription expired or revoked
        if (webErr.statusCode === 404 || webErr.statusCode === 410) {
          console.warn(`[Push Notification] 🧹 Pruning expired Web Push subscription for device ${device.id}`);
          await supabase.from('device_tokens').delete().eq('id', device.id);
        }

        await supabase.from('notification_logs').insert({
          user_id: userId,
          platform: 'web',
          channel: 'webpush',
          title: resolvedTitle,
          body,
          payload: { jobId, data },
          status: 'failed',
          provider_response: { statusCode: webErr.statusCode },
          error_message: webErr.message,
        });
      }
    }
  }

  // Update in-app notifications status
  if (notifRecord?.id) {
    await supabase
      .from('notifications')
      .update({ status: anyDelivered ? 'sent' : 'failed' })
      .eq('id', notifRecord.id);
  }

  return {
    success: anyDelivered,
    notifId: notifRecord?.id,
    devicesCount: devices.length,
    results: deliveryResults,
  };
}

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
 * Rejects unauthenticated public callers.
 * Authenticates either:
 * 1. Server-to-server webhook secret (header: x-webhook-secret or webhook-signature)
 * 2. Service role key (Authorization: Bearer <service_role_key>)
 * 3. Authenticated active user JWT with valid role in allowedRoles (if specified)
 */
export async function authorizeEdgeRequest(
  req: Request,
  allowedRoles?: string[]
): Promise<EdgeAuthResult> {
  const webhookSecret =
    Deno.env.get('APP_WEBHOOK_SECRET') || 'ds-repairshop-internal-webhook-secret-v1';
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

    // Check service role key
    if (serviceRoleKey && timingSafeCompare(token, serviceRoleKey)) {
      return { isAuthorized: true, callerType: 'service_role', status: 200 };
    }

    // Explicitly reject public anon key callers if no webhook secret was passed
    if (anonKey && token === anonKey) {
      return {
        isAuthorized: false,
        error: 'Unauthorized: Public anon key is not permitted to trigger this function without webhook signature',
        status: 401,
      };
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
