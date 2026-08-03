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

    // Use Service Role key to bypass RLS for fetching tokens and inserting notification logs
    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload = await req.json()
    console.log('Received payload:', payload)
    
    // Check if this is an INSERT trigger on the jobs table
    if (payload.type === 'INSERT' && payload.table === 'jobs') {
      const job = payload.record
      
      // 1. Notify Technician
      if (job.technician_id) {
        const { data: tech, error } = await supabase
          .from('users')
          .select('expo_push_token, name')
          .eq('id', job.technician_id)
          .single()

        if (tech && tech.expo_push_token) {
          console.log(`Sending push to technician ${tech.name}: ${tech.expo_push_token}`)
          const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: tech.expo_push_token,
              sound: 'default',
              title: 'New Job Assigned',
              body: `Job ${job.job_code} has been assigned to you. Priority: ${job.priority}`,
              data: { screen: 'JobDetail', jobId: job.id },
            }),
          })
          
          const pushResult = await pushResponse.json()
          console.log('Push response:', pushResult)
          
          // Log attempt in the notifications table
          await supabase.from('notifications').insert({
            job_id: job.id,
            recipient_user_id: job.technician_id,
            channel: 'push',
            message: `Job ${job.job_code} assigned to you. Priority: ${job.priority}`,
            status: pushResponse.ok ? 'sent' : 'failed',
            sent_at: new Date().toISOString()
          })
        }
      }

      // 2. Notify Customer via WhatsApp (Placeholder if Twilio not configured)
      const twilioSid = Deno.env.get('TWILIO_SID')
      const twilioToken = Deno.env.get('TWILIO_TOKEN')
      const twilioFrom = Deno.env.get('TWILIO_WHATSAPP_FROM')
      
      if (twilioSid && twilioToken && twilioFrom && job.customer_contact) {
        console.log(`Sending WhatsApp to ${job.customer_contact}`)
        const message = `Hello ${job.customer_name}, we have received your device (${job.device_type}) at RepairShop. Your job code is ${job.job_code}. We will update you shortly.`
        
        // Ensure contact has country code (rudimentary fix for demo, should be proper E164)
        const contact = job.customer_contact.startsWith('+') ? job.customer_contact : `+91${job.customer_contact}`
        
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
        
        console.log('WhatsApp response status:', waResponse.status)
        
        // Log to notifications table
        await supabase.from('notifications').insert({
          job_id: job.id,
          recipient_user_id: null, // Customer has no user_id
          channel: 'whatsapp',
          message: message,
          status: waResponse.ok ? 'sent' : 'failed',
          sent_at: new Date().toISOString()
        })
      } else {
        console.log('Skipping WhatsApp notification: Twilio secrets not configured or no customer contact.')
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
