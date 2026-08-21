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
    console.log('[Finance Event] Received payload:', JSON.stringify(payload))

    // ── 1. SALARY SLIP GENERATED / FINALIZED ──────────────────────────────────
    if (payload.table === 'salary') {
      const record = payload.record;
      if (record && record.user_id && record.month) {
        const { data: user } = await supabase
          .from('users')
          .select('name, expo_push_token')
          .eq('id', record.user_id)
          .single();

        const monthStr = record.month.slice(0, 7);
        const netFormatted = record.net_salary !== undefined && record.net_salary !== null ? ` (Net: ₹${Number(record.net_salary).toFixed(2)})` : '';

        console.log(`[Finance Event] Sending salary notification to user ${record.user_id}`);
        await sendPushNotification(supabase, {
          userId: record.user_id,
          pushToken: user?.expo_push_token,
          title: 'Salary Slip Ready',
          body: `Your salary slip for ${monthStr} is ready to view${netFormatted}.`,
          data: { screen: 'Salary' },
        });

        return new Response(JSON.stringify({ success: true, message: 'Salary notification sent' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // ── 2. ADVANCE SALARY PAYMENT RECORDED ────────────────────────────────────
    if (payload.table === 'payments') {
      const record = payload.record;
      if (payload.type === 'INSERT' && record.type === 'advance_salary' && record.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('name, expo_push_token')
          .eq('id', record.user_id)
          .single();

        const monthStr = record.month ? ` for ${record.month.slice(0, 7)}` : '';
        const amountStr = `₹${Number(record.amount || 0).toFixed(2)}`;

        console.log(`[Finance Event] Sending advance salary notification to user ${record.user_id}`);
        await sendPushNotification(supabase, {
          userId: record.user_id,
          pushToken: user?.expo_push_token,
          title: 'Advance Salary Recorded',
          body: `An advance salary payment of ${amountStr}${monthStr} has been credited to your account.`,
          data: { screen: 'Salary' },
        });

        return new Response(JSON.stringify({ success: true, message: 'Advance payment notification sent' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // ── 3. EMPLOYEE BONUS AWARDED ─────────────────────────────────────────────
    if (payload.table === 'employee_bonus') {
      const record = payload.record;
      if (payload.type === 'INSERT' && record.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('name, expo_push_token')
          .eq('id', record.user_id)
          .single();

        const monthStr = record.month ? ` for ${record.month.slice(0, 7)}` : '';
        const amountStr = `₹${Number(record.amount || 0).toFixed(2)}`;
        const reasonStr = record.reason ? `: ${record.reason}` : '';

        console.log(`[Finance Event] Sending bonus notification to user ${record.user_id}`);
        await sendPushNotification(supabase, {
          userId: record.user_id,
          pushToken: user?.expo_push_token,
          title: 'Bonus Awarded',
          body: `A performance bonus of ${amountStr}${monthStr} has been awarded${reasonStr}.`,
          data: { screen: 'Salary' },
        });

        return new Response(JSON.stringify({ success: true, message: 'Bonus notification sent' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // ── 4. COUNTER SALE RECORDED ──────────────────────────────────────────────
    if (payload.table === 'sales') {
      const record = payload.record;
      if (payload.type === 'INSERT') {
        const saleCode = record.sale_code || 'Sale';
        const amountStr = `₹${Number(record.grand_total || 0).toFixed(2)}`;
        const customerName = record.customer_name ? ` (${record.customer_name})` : '';

        // Notify all active admins
        const { data: admins } = await supabase
          .from('users')
          .select('id, expo_push_token')
          .eq('role', 'admin')
          .eq('is_active', true);

        if (admins && admins.length > 0) {
          console.log(`[Finance Event] Notifying ${admins.length} admins of sale ${saleCode}`);
          await Promise.all(admins.map(async (admin: any) => {
            await sendPushNotification(supabase, {
              userId: admin.id,
              pushToken: admin.expo_push_token,
              title: 'New Sale Recorded',
              body: `Sale ${saleCode}${customerName} completed for ${amountStr}.`,
              data: { screen: 'SalesList' },
            });
          }));
        }

        return new Response(JSON.stringify({ success: true, message: 'Sale notification sent' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Payload ignored' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[Finance Event Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
