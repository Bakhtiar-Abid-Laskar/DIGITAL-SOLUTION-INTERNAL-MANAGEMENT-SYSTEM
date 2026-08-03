// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

declare const Deno: any;

const allowedOrigin = Deno.env.get('ADMIN_URL') || 'http://localhost:3000';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const payload = await req.json()
    console.log('Received payload:', payload)
    
    // Support direct client invocation (job_id, customer_email)
    const jobId = payload.job_id || payload.record?.job_id;
    
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Missing job_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Rate Limiting: Check if we sent an email for this job in the last 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentEmail, error: rateLimitError } = await supabase
      .from('notifications')
      .select('id, sent_at')
      .eq('job_id', jobId)
      .eq('channel', 'email')
      .gte('sent_at', oneMinuteAgo)
      .limit(1)
      .maybeSingle();

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (recentEmail) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute before sending another email.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      })
    }

    // Fetch the billing and job details
    const { data: billing, error: billingError } = await supabase
      .from('billing')
      .select('*')
      .eq('job_id', jobId)
      .single()

    if (billingError || !billing) {
      throw new Error(`Failed to fetch billing for job ${jobId}`)
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('job_code, customer_name, customer_email, device_type')
      .eq('id', jobId)
      .single()
      
    if (jobError) {
      throw new Error(`Failed to fetch job for billing ${billing.id}: ${jobError.message}`)
    }

    const targetEmail = payload.customer_email || job.customer_email;

    if (!targetEmail) {
      console.log(`Skipping email: No email provided for job ${job.job_code}`)
      return new Response(JSON.stringify({ message: 'No customer email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (!resendApiKey) {
      console.log('Skipping email: RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ message: 'No RESEND_API_KEY' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Sending invoice email to ${targetEmail} for job ${job.job_code}`)
    
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>RepairShop Invoice</h2>
        <p>Hi ${job.customer_name},</p>
        <p>Thank you for choosing RepairShop for your ${job.device_type} repair (Job: <strong>${job.job_code}</strong>).</p>
        <hr style="border-top: 1px solid #ccc; margin: 20px 0;" />
        <p><strong>Parts Total:</strong> ₹${billing.parts_total}</p>
        <p><strong>Labour Charge:</strong> ₹${billing.labour_charge}</p>
        <p><strong>Tax:</strong> ${billing.tax_percent}%</p>
        <p><strong>Discount:</strong> ₹${billing.discount}</p>
        <h3 style="color: #2E9E52;"><strong>Grand Total:</strong> ₹${billing.grand_total}</h3>
        <hr style="border-top: 1px solid #ccc; margin: 20px 0;" />
        <p>If you have any questions, please reply to this email.</p>
        <p>Best regards,<br/>RepairShop Team</p>
      </div>
    `

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'RepairShop <billing@yourdomain.com>',
        to: [targetEmail],
        subject: `Invoice for Repair Job ${job.job_code}`,
        html: htmlBody
      })
    })

    const resendData = await resendRes.json()
    console.log('Resend response:', resendData)

    await supabase.from('notifications').insert({
      job_id: job.id,
      recipient_user_id: null,
      channel: 'email',
      message: `Invoice email sent for job ${job.job_code} (Total: ₹${billing.grand_total})`,
      status: resendRes.ok ? 'sent' : 'failed',
      sent_at: new Date().toISOString()
    })

    return new Response(JSON.stringify({ success: true, message: 'Invoice email processed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Edge Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
