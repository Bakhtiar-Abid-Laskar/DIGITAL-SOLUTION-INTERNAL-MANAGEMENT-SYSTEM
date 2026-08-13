import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

export async function sendPushNotification(supabase: any, { userId, pushToken, title, body, data, jobId }: { userId: string, pushToken: string, title: string, body: string, data?: any, jobId?: string }) {
  // Log to notifications table
  const { error } = await supabase.from('notifications').insert({
    recipient_user_id: userId,
    title,
    body,
    related_job_id: jobId
  });
  
  if (error) {
    console.error('Error logging notification:', error);
  }

  // Send to Expo
  if (pushToken && pushToken.startsWith('ExponentPushToken')) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          sound: 'default',
          title,
          body,
          data
        })
      });
      const dataRes = await res.json();
      console.log('Expo Push Response:', dataRes);
    } catch (e) {
      console.error('Error sending Expo push notification:', e);
    }
  }
}
