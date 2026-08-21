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

    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload = await req.json()
    console.log('Received payload:', payload)
    
    if (payload.type === 'UPDATE' && payload.table === 'jobs') {
      const newJob = payload.record
      const oldJob = payload.old_record
      
      const statusChanged = newJob.status !== oldJob.status
      const techChanged = newJob.technician_id !== oldJob.technician_id

      if (!statusChanged && !techChanged) {
        return new Response(JSON.stringify({ message: 'No relevant fields changed' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      // -- Branch A: Job Reassignment --
      if (techChanged && newJob.technician_id) {
        console.log(`Job ${newJob.job_code} reassigned to ${newJob.technician_id}`)
        
        const { data: newTech } = await supabase
          .from('users')
          .select('expo_push_token, name')
          .eq('id', newJob.technician_id)
          .single()
          
        if (newTech && newTech.expo_push_token) {
          // Open Question: Should the previous technician also get an "unassigned" push?
          await sendPushNotification(supabase, {
            userId: newJob.technician_id,
            pushToken: newTech.expo_push_token,
            title: 'Job Reassigned',
            body: `Job ${newJob.job_code} has been reassigned to you.`,
            data: { screen: 'JobDetail', jobId: newJob.id },
            jobId: newJob.id,
          })
        }
      }

      // -- Branch B: Status Changed --
      if (statusChanged) {
        console.log(`Job ${newJob.job_code} status changed: ${oldJob.status} -> ${newJob.status}`)

        let techName = 'Unknown Technician'
        if (newJob.technician_id) {
          const { data: tech } = await supabase.from('users').select('name').eq('id', newJob.technician_id).single()
          if (tech) techName = tech.name
        }

        const isWaitingForMaterials = newJob.status === 'Waiting for Materials'

        // 1. Notify Receptionists & Admins (including web-only users without push tokens)
        const { data: staffUsers } = await supabase
          .from('users')
          .select('id, expo_push_token, role')
          .in('role', ['admin', 'receptionist'])

        if (staffUsers && staffUsers.length > 0) {
          // Send push notifications in parallel
          await Promise.all(staffUsers.map(async (user: any) => {
            const title = isWaitingForMaterials ? 'Materials Needed' : 'Job Status Update'
            const body = isWaitingForMaterials 
              ? `Tech ${techName} needs parts for Job ${newJob.job_code}. Please check inventory.`
              : `Job ${newJob.job_code} is now ${newJob.status}.`
              
            await sendPushNotification(supabase, {
              userId: user.id,
              pushToken: user.expo_push_token,
              title: title,
              body: body,
              data: { screen: 'JobDetail', jobId: newJob.id },
              jobId: newJob.id,
            })
          }))
        }

        // 2. Notify ALL assigned Technicians
        const { data: jobTechs } = await supabase
          .from('job_technicians')
          .select('technician:users(id, expo_push_token)')
          .eq('job_id', newJob.id)
          .is('removed_at', null)

        if (jobTechs && jobTechs.length > 0) {
          const techTokens = jobTechs
            .map((jt: any) => jt.technician)
            .filter((t: any) => t && t.expo_push_token)
          
          await Promise.all(techTokens.map(async (tech: any) => {
            await sendPushNotification(supabase, {
              userId: tech.id,
              pushToken: tech.expo_push_token,
              title: 'Job Status Updated',
              body: `Job ${newJob.job_code} status is now ${newJob.status}.`,
              data: { screen: 'JobDetail', jobId: newJob.id },
              jobId: newJob.id,
            })
          }))
        }
      } // End of Status Changed Branch



      return new Response(JSON.stringify({ success: true, message: 'Status notifications processed' }), {
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
