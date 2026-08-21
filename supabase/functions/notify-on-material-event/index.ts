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
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid credentials' }), {
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
    console.log('[Material Event] Received payload:', JSON.stringify(payload))

    // Direct invocation format: { action: 'remind_return', allotment_id: '...' }
    if (payload.action === 'remind_return' && payload.allotment_id) {
      const { data: allotment } = await supabase
        .from('material_allotments')
        .select('*, technician:users!material_allotments_technician_id_fkey(id, name, expo_push_token), inventory:inventory(item_name), jobs:jobs(job_code)')
        .eq('id', payload.allotment_id)
        .single();

      if (allotment && allotment.technician) {
        const tech = allotment.technician;
        const itemName = allotment.inventory?.item_name || 'Material item';
        const jobCode = allotment.jobs?.job_code || 'repair job';

        console.log(`[Material Event] Sending return reminder to tech ${tech.name} (${tech.id})`);
        await sendPushNotification(supabase, {
          userId: tech.id,
          pushToken: tech.expo_push_token,
          title: 'Return Reminder',
          body: `Please return ${allotment.quantity}x unused ${itemName} from Job ${jobCode}.`,
          data: { screen: 'AllottedMaterialsScreen', mode: 'scoped' },
          jobId: allotment.job_id,
        });

        return new Response(JSON.stringify({ success: true, message: 'Return reminder sent' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // Webhook Trigger format from material_allotments table
    if (payload.table === 'material_allotments') {
      const record = payload.record;

      // Event: Material Allotted to Technician (INSERT)
      if (payload.type === 'INSERT') {
        const { data: allotment } = await supabase
          .from('material_allotments')
          .select('*, technician:users!material_allotments_technician_id_fkey(id, name, expo_push_token), inventory:inventory(item_name), jobs:jobs(job_code)')
          .eq('id', record.id)
          .single();

        if (allotment && allotment.technician) {
          const tech = allotment.technician;
          const itemName = allotment.inventory?.item_name || 'Material item';
          const jobCode = allotment.jobs?.job_code || 'repair job';

          console.log(`[Material Event] Sending allotment notification to tech ${tech.name}`);
          await sendPushNotification(supabase, {
            userId: tech.id,
            pushToken: tech.expo_push_token,
            title: 'Material Allotted',
            body: `${allotment.quantity}x ${itemName} has been allotted to you for Job ${jobCode}.`,
            data: { screen: 'AllottedMaterialsScreen', mode: 'scoped' },
            jobId: allotment.job_id,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Material allotment event processed' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Payload ignored' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[Material Event Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
