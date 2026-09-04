// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { sendPushNotification } from '../_shared/notifications.ts'
import { sendCustomerWhatsApp } from '../_shared/whatsappClient.ts'

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

        // Customer WhatsApp: Sale Receipt + Google Form Review Link
        if (record.customer_contact) {
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

          const saleMsg = `Hello ${record.customer_name || 'Customer'},\n\n` +
            `Thank you for your purchase at *Digital Solution*!\n\n` +
            `🧾 *Sale Code:* ${saleCode}\n` +
            `💰 *Grand Total:* ${amountStr}\n` +
            (record.payment_mode ? `💳 *Payment Mode:* ${record.payment_mode}\n` : '') +
            `\nWe appreciate your business! Please take 30 seconds to share your shopping experience with us:\n\n` +
            `⭐ *Google Review Link:* ${reviewUrl}\n\n` +
            `Have a wonderful day!`;

          await sendCustomerWhatsApp(supabase, {
            phone: record.customer_contact,
            customerName: record.customer_name,
            eventType: 'SALE_CREATED',
            messageText: saleMsg,
            saleId: record.id,
          });
        }

        return new Response(JSON.stringify({ success: true, message: 'Sale notification processed' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // ── 5. DIRECT ACTION: SEND INVOICE PDF TO CUSTOMER ───────────────────────
    if (payload.type === 'SEND_INVOICE_PDF' || payload.action === 'SEND_INVOICE_PDF') {
      const { phone, customerName, documentUrl, invoiceCode, grandTotal, jobId, saleId } = payload;

      if (!phone) {
        return new Response(JSON.stringify({ error: 'Missing customer phone number' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const caption = `Hello ${customerName || 'Customer'}, here is your official invoice ${invoiceCode || ''} from Digital Solution.\n\n` +
        (grandTotal ? `Total: ₹${Number(grandTotal).toFixed(2)}\n\n` : '') +
        `Thank you for your business!`;

      const result = await sendCustomerWhatsApp(supabase, {
        phone,
        customerName,
        eventType: 'INVOICE_PDF',
        messageText: caption,
        documentUrl: documentUrl || undefined,
        documentFilename: `${invoiceCode || 'Invoice'}.pdf`,
        jobId,
        saleId,
      });

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500,
      });
    }

    // ── 6. DIRECT ACTION: SEND PENDING PAYMENT REMINDER ───────────────────────
    if (payload.type === 'SEND_PENDING_REMINDER' || payload.action === 'SEND_PENDING_REMINDER') {
      const { phone, customerName, reference, balanceDue, totalAmount, dueDate, jobId, saleId } = payload;

      if (!phone) {
        return new Response(JSON.stringify({ error: 'Missing customer phone number' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const reminderMsg = `Hello ${customerName || 'Customer'},\n\n` +
        `This is a friendly payment reminder from *Digital Solution*.\n\n` +
        `📋 *Reference:* ${reference || 'Repair Service'}\n` +
        (totalAmount ? `💰 *Total Bill:* ₹${Number(totalAmount).toFixed(2)}\n` : '') +
        `⚠️ *Outstanding Balance Due:* *₹${Number(balanceDue || 0).toFixed(2)}*\n` +
        (dueDate ? `📅 *Due Date:* ${dueDate}\n` : '') +
        `\nPlease arrange the payment at your earliest convenience via Cash, Card, or UPI.\n\n` +
        `For questions or assistance, please contact Digital Solution. Thank you!`;

      const result = await sendCustomerWhatsApp(supabase, {
        phone,
        customerName,
        eventType: 'PAYMENT_PENDING',
        messageText: reminderMsg,
        jobId,
        saleId,
      });

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500,
      });
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
