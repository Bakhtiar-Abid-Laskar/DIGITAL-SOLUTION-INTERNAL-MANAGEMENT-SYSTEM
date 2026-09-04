// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { sendPushNotification } from '../_shared/notifications.ts'
import { sendCustomerWhatsApp } from '../_shared/whatsappClient.ts'

declare const Deno: any;

serve(async (req: Request) => {

  try {
    const signature = req.headers.get('webhook-signature') || req.headers.get('x-webhook-secret')
    const authHeader = req.headers.get('Authorization')
    const webhookSecret = Deno.env.get('APP_WEBHOOK_SECRET')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    let isAuthorized = false

    if (webhookSecret && signature && signature === webhookSecret) {
      isAuthorized = true
    } else if (serviceRoleKey && authHeader && authHeader === `Bearer ${serviceRoleKey}`) {
      isAuthorized = true
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim()
      if (token && anonKey && token === anonKey) {
        isAuthorized = true
      } else if (token && token.length > 20) {
        const supabaseAuthCheck = createClient(
          Deno.env.get('SUPABASE_URL') || '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        )
        const { data: authData, error: authErr } = await supabaseAuthCheck.auth.getUser(token)
        if (!authErr && authData?.user) {
          isAuthorized = true
        }
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or missing webhook credentials' }), {
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

        // 3. Automated Customer WhatsApp Notifications
        if (newJob.customer_contact) {
          const customerName = newJob.customer_name || 'Customer';

          if (newJob.status === 'Completed') {
            // Check if an invoice or billing amount exists
            let totalNotice = '';
            try {
              const { data: inv } = await supabase
                .from('invoices')
                .select('grand_total')
                .eq('job_id', newJob.id)
                .maybeSingle();

              if (inv?.grand_total && Number(inv.grand_total) > 0) {
                totalNotice = `\n💰 *Total Amount:* ₹${Number(inv.grand_total).toFixed(2)}\n`;
              }
            } catch (_) {
              // Non-critical, continue without total
            }

            const readyMsg = `Hello ${customerName},\n\n` +
              `🎉 Great news! Your device for Job *${newJob.job_code}* has been successfully repaired and is *READY FOR PICKUP*.\n` +
              totalNotice +
              `\nPlease visit *Digital Solution* during shop hours with your intake receipt to collect your device.\n\n` +
              `Thank you for trusting Digital Solution!`;

            await sendCustomerWhatsApp(supabase, {
              phone: newJob.customer_contact,
              customerName: newJob.customer_name,
              eventType: 'JOB_COMPLETED',
              messageText: readyMsg,
              jobId: newJob.id,
            });

          } else if (newJob.status === 'Delivered') {
            // Customer collected device -> Send Google Form Review Link
            let reviewUrl = 'https://forms.gle/DigiSolutionReview';
            try {
              const { data: ws } = await supabase
                .from('whatsapp_settings')
                .select('google_review_url')
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();

              if (ws?.google_review_url?.trim()) {
                reviewUrl = ws.google_review_url.trim();
              }
            } catch (_) {}

            const reviewMsg = `Hello ${customerName},\n\n` +
              `Thank you for collecting your device for Job *${newJob.job_code}* from *Digital Solution*!\n\n` +
              `We hope you are delighted with the service. We would greatly appreciate 30 seconds of your time to share your feedback on our Google Form:\n\n` +
              `⭐ *Google Review Link:* ${reviewUrl}\n\n` +
              `Your feedback helps us continuously improve. Have a wonderful day!`;

            await sendCustomerWhatsApp(supabase, {
              phone: newJob.customer_contact,
              customerName: newJob.customer_name,
              eventType: 'REVIEW_REQUEST',
              messageText: reviewMsg,
              jobId: newJob.id,
            });

          } else if (newJob.status === 'Waiting for Materials') {
            const partsMsg = `Hello ${customerName},\n\n` +
              `Update on your repair Job *${newJob.job_code}*:\n` +
              `Our technician has inspected your device and ordered required replacement parts. Work will resume immediately upon their arrival.\n\n` +
              `We will keep you updated. Digital Solution.`;

            await sendCustomerWhatsApp(supabase, {
              phone: newJob.customer_contact,
              customerName: newJob.customer_name,
              eventType: 'JOB_STATUS_CHANGED',
              messageText: partsMsg,
              jobId: newJob.id,
            });

          } else if (newJob.status === 'In Progress') {
            const progressMsg = `Hello ${customerName},\n\n` +
              `Update on your repair Job *${newJob.job_code}*:\n` +
              `Our technician has begun active repair work on your device. We will notify you as soon as testing and repairs are complete.\n\n` +
              `Thank you for your patience! Digital Solution.`;

            await sendCustomerWhatsApp(supabase, {
              phone: newJob.customer_contact,
              customerName: newJob.customer_name,
              eventType: 'JOB_STATUS_CHANGED',
              messageText: progressMsg,
              jobId: newJob.id,
            });
          }
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
