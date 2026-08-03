// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

declare const Deno: any;

serve(async (req: Request) => {

  try {
    const signature = req.headers.get('webhook-signature')
    const webhookSecret = Deno.env.get('SUPABASE_WEBHOOK_SECRET')
    
    if (!signature || !webhookSecret || signature !== webhookSecret) {
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
    
    if (payload.type === 'UPDATE' && payload.table === 'jobs') {
      const newJob = payload.record
      const oldJob = payload.old_record
      
      // Only proceed if status actually changed
      if (newJob.status === oldJob.status) {
        return new Response(JSON.stringify({ message: 'Status unchanged' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      console.log(`Job ${newJob.job_code} status changed: ${oldJob.status} -> ${newJob.status}`)

      // 1. Notify Receptionists & Admins
      const { data: staffUsers } = await supabase
        .from('users')
        .select('id, expo_push_token, role')
        .in('role', ['admin', 'receptionist'])
        .not('expo_push_token', 'is', null)

      if (staffUsers && staffUsers.length > 0) {
        const pushMessages = staffUsers.map((user: any) => ({
          to: user.expo_push_token,
          sound: 'default',
          title: `Job Status Update`,
          body: `Job ${newJob.job_code} is now ${newJob.status}.`,
          data: { screen: 'JobDetail', jobId: newJob.id },
        }))

        // Send push notifications in parallel
        await Promise.all(pushMessages.map(async (msg: any) => {
          try {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
              body: JSON.stringify(msg),
            })
          } catch (e) {
            console.error('Failed to send push:', e)
          }
        }))

        // We can just log one summary row for the group notification, or one per user
        // Let's log one general record for receptionist update
        await supabase.from('notifications').insert({
          job_id: newJob.id,
          channel: 'push',
          message: `Job ${newJob.job_code} status updated to ${newJob.status}`,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
      }

      // 2. Notify Customer if Completed
      if (newJob.status === 'Completed') {
        const twilioSid = Deno.env.get('TWILIO_SID')
        const twilioToken = Deno.env.get('TWILIO_TOKEN')
        const twilioFrom = Deno.env.get('TWILIO_WHATSAPP_FROM')
        
        if (twilioSid && twilioToken && twilioFrom && newJob.customer_contact) {
          console.log(`Sending WhatsApp completion to ${newJob.customer_contact}`)
          const message = `Hello ${newJob.customer_name}, great news! Your device (${newJob.device_type}) is repaired and ready for pickup. Job code: ${newJob.job_code}.`
          
          const contact = newJob.customer_contact.startsWith('+') ? newJob.customer_contact : `+91${newJob.customer_contact}`
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
          const twilioBody = new URLSearchParams()
          twilioBody.append('To', `whatsapp:${contact}`)
          twilioBody.append('From', `whatsapp:${twilioFrom}`)
          twilioBody.append('Body', message)

          const waResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`
            },
            body: twilioBody.toString()
          })
          
          await supabase.from('notifications').insert({
            job_id: newJob.id,
            channel: 'whatsapp',
            message: message,
            status: waResponse.ok ? 'sent' : 'failed',
            sent_at: new Date().toISOString()
          })
        }
      }

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
