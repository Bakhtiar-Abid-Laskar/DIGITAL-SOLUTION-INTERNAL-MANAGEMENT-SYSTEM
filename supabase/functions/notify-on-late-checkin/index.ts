// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { sendPushNotification } from '../_shared/notifications.ts'

declare const Deno: any;

serve(async (req: Request) => {
  try {
    const signature = req.headers.get('webhook-signature')
    const authHeader = req.headers.get('Authorization')
    const webhookSecret = Deno.env.get('APP_WEBHOOK_SECRET')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    const isAuthorized =
      !webhookSecret ||
      (signature && signature === webhookSecret) ||
      (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) ||
      (authHeader && authHeader.startsWith('Bearer '));

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid webhook signature' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const payload = await req.json()
    console.log('Received payload:', payload)
    
    if (payload.type === 'INSERT' && payload.table === 'attendance') {
      const attendance = payload.record
      
      // Preferred check-in time logic (matches calculate-monthly-salary)
      // Usually around 10:30 AM
      if (attendance.check_in_time) {
        const checkInDate = new Date(attendance.check_in_time)
        const checkInMins = checkInDate.getUTCHours() * 60 + checkInDate.getUTCMinutes()
        const checkInMinsIST = (checkInMins + 330) % (24 * 60)
        
        const preferredCheckinMins = 10 * 60 + 30; // 10:30 AM
        const lateMinutes = Math.max(0, checkInMinsIST - preferredCheckinMins)
        
        // Notify if late by more than 30 mins (past 11:00 AM)
        if (lateMinutes > 30) {
          const { data: user } = await supabase.from('users').select('name').eq('id', attendance.user_id).single()
          const userName = user ? user.name : 'Unknown Staff'
          
          const { data: admins } = await supabase
            .from('users')
            .select('id, expo_push_token')
            .eq('role', 'admin')
            .not('expo_push_token', 'is', null)

          if (admins && admins.length > 0) {
            await Promise.all(admins.map(async (admin: any) => {
              await sendPushNotification(supabase, {
                userId: admin.id,
                pushToken: admin.expo_push_token,
                title: 'Late Check-in Alert',
                body: `${userName} checked in ${lateMinutes} minutes late today.`,
                data: { screen: 'Attendance' },
              })
            }))
          }
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Late check-in notifications processed' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Payload ignored' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Edge Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
