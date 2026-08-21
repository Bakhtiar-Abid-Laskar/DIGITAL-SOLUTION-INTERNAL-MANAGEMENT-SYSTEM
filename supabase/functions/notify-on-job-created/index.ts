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
      !webhookSecret || // If webhook secret not configured, rely on URL obscurity / server environment
      (signature && signature === webhookSecret) ||
      (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) ||
      (authHeader && authHeader.startsWith('Bearer '));

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    // Use Service Role key to bypass RLS for fetching tokens and inserting notification logs
    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload = await req.json()
    console.log('Received payload:', payload)
    
    // Check if this is an INSERT trigger on the jobs table
    if (payload.type === 'INSERT' && payload.table === 'jobs') {
      const job = payload.record
      
      const isUrgent = job.priority === 'Urgent'
      const title = isUrgent ? 'URGENT: New Job Assigned' : 'New Job Assigned'
      const body = isUrgent 
        ? `URGENT: A high-priority repair (${job.job_code}) has been assigned to you.` 
        : `Job ${job.job_code} has been assigned to you. Priority: ${job.priority}`

      // Track notified technician IDs to avoid double-notifying
      const notifiedTechIds = new Set<string>()

      // 1. Notify primary technician (job.technician_id)
      if (job.technician_id) {
        const { data: tech, error } = await supabase
          .from('users')
          .select('expo_push_token, name')
          .eq('id', job.technician_id)
          .single()

        if (tech) {
          console.log(`Sending push to technician ${tech.name}: ${tech.expo_push_token}`)
          await sendPushNotification(supabase, {
            userId: job.technician_id,
            pushToken: tech.expo_push_token,
            title: title,
            body: body,
            data: { screen: 'JobDetail', jobId: job.id },
            jobId: job.id,
          })
          notifiedTechIds.add(job.technician_id)
        }
      }

      // 2. Notify additional technicians from job_technicians (multi-tech assignments)
      const { data: jobTechs } = await supabase
        .from('job_technicians')
        .select('technician:users(id, expo_push_token, name)')
        .eq('job_id', job.id)
        .is('removed_at', null)

      if (jobTechs && jobTechs.length > 0) {
        for (const jt of jobTechs) {
          const tech = (jt as any).technician
          if (tech && !notifiedTechIds.has(tech.id)) {
            console.log(`Sending push to additional technician ${tech.name}: ${tech.expo_push_token}`)
            await sendPushNotification(supabase, {
              userId: tech.id,
              pushToken: tech.expo_push_token,
              title: title,
              body: body,
              data: { screen: 'JobDetail', jobId: job.id },
              jobId: job.id,
            })
            notifiedTechIds.add(tech.id)
          }
        }
      }


      return new Response(JSON.stringify({ success: true, message: 'Job created notifications processed' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Payload ignored' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200, // Return 200 so webhook doesn't retry on irrelevant payloads
    })
  } catch (error: any) {
    console.error('Edge Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
