// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

declare const Deno: any;

/**
 * Meta WhatsApp Cloud API Webhook Edge Function
 * 
 * GET: Handles Meta Webhook Verification Challenge (hub.mode, hub.verify_token, hub.challenge)
 * POST: Handles incoming Webhook Events (Messages, Delivery Statuses, Account Updates)
 */

serve(async (req: Request) => {
  const url = new URL(req.url)

  // ---------------------------------------------------------------------------
  // 1. GET Request — Meta Verification Handshake
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || Deno.env.get('WEBHOOK_VERIFY_TOKEN')

    console.log(`[WhatsApp Webhook] Verification request received. Mode: ${mode}, Token provided: ${token ? 'YES' : 'NO'}`)

    if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
      console.log('[WhatsApp Webhook] Verification SUCCESS. Responding with challenge.')
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    } else {
      console.error('[WhatsApp Webhook] Verification FAILED. Token mismatch or missing parameters.')
      return new Response(JSON.stringify({ error: 'Verification failed. Invalid or missing verify token.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // ---------------------------------------------------------------------------
  // 2. POST Request — Webhook Event Notifications
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      let supabase: any = null
      if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey)
      }

      const bodyText = await req.text()
      let payload: any = {}

      try {
        payload = JSON.parse(bodyText)
      } catch (e) {
        console.error('[WhatsApp Webhook] Invalid JSON body received:', e)
        return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      console.log('[WhatsApp Webhook] Received POST event:', JSON.stringify(payload, null, 2))

      // Check if this payload originates from a WhatsApp Business Account
      if (payload.object === 'whatsapp_business_account') {
        for (const entry of payload.entry || []) {
          for (const change of entry.changes || []) {
            const value = change.value
            const field = change.field

            if (!value) continue

            // A. INCOMING MESSAGES
            if (value.messages && value.messages.length > 0) {
              for (const msg of value.messages) {
                const fromPhone = msg.from // e.g. "16505551234"
                const msgId = msg.id
                const msgTimestamp = msg.timestamp
                const msgType = msg.type
                let textBody = ''

                if (msgType === 'text' && msg.text) {
                  textBody = msg.text.body
                } else if (msgType === 'image') {
                  textBody = `[Image Received: ${msg.image?.caption || msg.image?.id}]`
                } else if (msgType === 'document') {
                  textBody = `[Document Received: ${msg.document?.filename || msg.document?.id}]`
                } else if (msgType === 'location') {
                  textBody = `[Location Received: Lat ${msg.location?.latitude}, Long ${msg.location?.longitude}]`
                } else {
                  textBody = `[Media/Other message type: ${msgType}]`
                }

                const contactName = value.contacts?.[0]?.profile?.name || 'Unknown Contact'
                console.log(`[WhatsApp Webhook] Incoming message from ${contactName} (${fromPhone}): "${textBody}"`)

                // Log incoming message to Supabase database if connected
                if (supabase) {
                  // Standardize phone format for matching customer_contact
                  const formattedContact = fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`

                  // Try to find matching job for this customer
                  const { data: matchingJobs } = await supabase
                    .from('jobs')
                    .select('id, job_code')
                    .or(`customer_contact.eq.${fromPhone},customer_contact.eq.${formattedContact},customer_contact.eq.${fromPhone.replace(/^91/, '')}`)
                    .order('created_at', { ascending: false })
                    .limit(1)

                  const associatedJobId = matchingJobs && matchingJobs.length > 0 ? matchingJobs[0].id : null

                  await supabase.from('notifications').insert({
                    job_id: associatedJobId,
                    recipient_user_id: null,
                    channel: 'whatsapp_inbound',
                    message: `From ${contactName} (${fromPhone}): ${textBody}`,
                    status: 'received',
                    sent_at: new Date(parseInt(msgTimestamp, 10) * 1000).toISOString()
                  }).catch((dbErr: any) => console.error('[WhatsApp Webhook] DB Insert Error:', dbErr))
                }
              }
            }

            // B. MESSAGE STATUS UPDATES (sent, delivered, read, failed)
            if (value.statuses && value.statuses.length > 0) {
              for (const statusObj of value.statuses) {
                const statusMsgId = statusObj.id
                const recipientId = statusObj.recipient_id
                const deliveryStatus = statusObj.status // e.g. "sent", "delivered", "read", "failed"
                const errors = statusObj.errors

                console.log(`[WhatsApp Webhook] Message status update - ID: ${statusMsgId}, Recipient: ${recipientId}, Status: ${deliveryStatus}`)

                if (errors) {
                  console.error(`[WhatsApp Webhook] Delivery error details:`, JSON.stringify(errors))
                }

                // Log or update status in Supabase database if connected
                if (supabase) {
                  await supabase.from('notifications').insert({
                    job_id: null,
                    recipient_user_id: null,
                    channel: 'whatsapp_status',
                    message: `Message ID ${statusMsgId} to ${recipientId} status: ${deliveryStatus}${errors ? ' (Errors: ' + JSON.stringify(errors) + ')' : ''}`,
                    status: deliveryStatus,
                    sent_at: new Date().toISOString()
                  }).catch((dbErr: any) => console.error('[WhatsApp Webhook] DB Status Log Error:', dbErr))
                }
              }
            }

            // C. OTHER SYSTEM NOTIFICATIONS (Template status changes, account updates, etc.)
            if (field && field !== 'messages') {
              console.log(`[WhatsApp Webhook] Account / Template notification field: ${field}`)
            }
          }
        }
      }

      // Meta requires a 200 OK response to acknowledge receipt of the webhook
      return new Response(JSON.stringify({ status: 'EVENT_RECEIVED' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error: any) {
      console.error('[WhatsApp Webhook] Error processing POST payload:', error)
      // Even on internal processing error, return 200 so Meta doesn't continuously spam retry requests
      return new Response(JSON.stringify({ status: 'ERROR_HANDLED', message: error.message }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Other HTTP Methods — Not Allowed
  // ---------------------------------------------------------------------------
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  })
})
