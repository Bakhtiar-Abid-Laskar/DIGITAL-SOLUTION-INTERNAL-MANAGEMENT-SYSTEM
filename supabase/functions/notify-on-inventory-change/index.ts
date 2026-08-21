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
    
    if (payload.type === 'UPDATE' && payload.table === 'inventory') {
      const newInventory = payload.record
      
      // Check if stock dropped below low_stock_threshold
      if (newInventory.quantity <= (newInventory.low_stock_threshold || 0)) {
        console.log(`Low stock alert for inventory ID: ${newInventory.id}`);
        
        // Fetch product name and admins
        const { data: product } = await supabase.from('products').select('name').eq('id', newInventory.product_id).single();
        const productName = product ? product.name : 'Unknown Item';
        
        const { data: adminUsers } = await supabase
          .from('users')
          .select('id, expo_push_token')
          .eq('role', 'admin')
          .not('expo_push_token', 'is', null);

        if (adminUsers && adminUsers.length > 0) {
          await Promise.all(adminUsers.map(async (user: any) => {
            await sendPushNotification(supabase, {
              userId: user.id,
              pushToken: user.expo_push_token,
              title: 'Low Stock Alert',
              body: `${productName} is running low (Qty: ${newInventory.quantity}).`,
              data: { screen: 'Inventory' },
            })
          }))
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Inventory notifications processed' }), {
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
