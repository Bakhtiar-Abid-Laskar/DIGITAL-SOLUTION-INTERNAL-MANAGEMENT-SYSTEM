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
    
    if (payload.type === 'INSERT' && payload.table === 'onsite_visits') {
      const visit = payload.record
      
      const { data: job } = await supabase.from('jobs').select('job_code').eq('id', visit.job_id).single()
      const { data: tech } = await supabase.from('users').select('name').eq('id', visit.technician_id).single()
      
      const jobCode = job ? job.job_code : 'Unknown Job'
      const techName = tech ? tech.name : 'A technician'

      const { data: staff } = await supabase
        .from('users')
        .select('id, expo_push_token')
        .in('role', ['admin', 'receptionist'])
        .not('expo_push_token', 'is', null)

      if (staff && staff.length > 0) {
        await Promise.all(staff.map(async (user: any) => {
          await sendPushNotification(supabase, {
            userId: user.id,
            pushToken: user.expo_push_token,
            title: 'Onsite Arrival',
            body: `${techName} arrived onsite for job ${jobCode}.`,
            data: { screen: 'JobDetail', jobId: visit.job_id },
            jobId: visit.job_id
          })
        }))
      }

      return new Response(JSON.stringify({ success: true, message: 'Onsite visit notifications processed' }), {
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
