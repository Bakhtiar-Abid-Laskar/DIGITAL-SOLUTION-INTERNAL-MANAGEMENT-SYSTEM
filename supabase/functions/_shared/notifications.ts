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

  // 1. Always record in notifications table (in-app audit trail)
  const { data: notifRecord, error: dbError } = await supabase
    .from('notifications')
    .insert({
      recipient_user_id: userId,
      title: title || 'Digital Solution',
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
  console.log(`[Push Notification] Dispatching to Expo for user ${userId} [${cleanToken.slice(0, 18)}...]: "${title}"`);

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
        title,
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
