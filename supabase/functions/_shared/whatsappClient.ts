// whatsappClient.ts — Central Meta WhatsApp Cloud API Client for RepairShop
// Handles customer-only automated notifications, E.164 phone formatting,
// document/PDF invoice attachments, Google Review links, and message audit logs.

declare const Deno: any;

export interface WhatsAppSendOptions {
  phone: string;
  customerName?: string;
  eventType: 
    | 'JOB_CREATED'
    | 'JOB_STATUS_CHANGED'
    | 'JOB_COMPLETED'
    | 'DEVICE_DELIVERED'
    | 'REVIEW_REQUEST'
    | 'SALE_CREATED'
    | 'INVOICE_PDF'
    | 'PAYMENT_PENDING'
    | 'TEST_MESSAGE';
  messageText?: string;
  documentUrl?: string;
  documentFilename?: string;
  jobId?: string;
  saleId?: string;
  templateName?: string;
  templateComponents?: any[];
}

/**
 * Normalizes Indian and international phone numbers for Meta WhatsApp Cloud API.
 * Output format: E.164 digits without "+" (e.g. "919876543210").
 */
export function formatPhoneForWhatsApp(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const digits = input.replace(/\D/g, '');
  if (!digits) return null;

  // 10-digit Indian mobile (starts with 6, 7, 8, 9)
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }

  // 11-digit starting with 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
    return `91${digits.slice(1)}`;
  }

  // 12-digit already with 91 country code
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    return digits;
  }

  // Generic international fallback (minimum 10 digits)
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
}

/**
 * Dispatches automated customer notification via Meta WhatsApp Cloud API
 * and records immutable audit log in public.whatsapp_messages & public.whatsapp_logs.
 */
export async function sendCustomerWhatsApp(
  supabase: any,
  options: WhatsAppSendOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const {
    phone,
    customerName,
    eventType,
    messageText,
    documentUrl,
    documentFilename,
    jobId,
    saleId,
    templateName,
    templateComponents,
  } = options;

  const cleanPhone = formatPhoneForWhatsApp(phone);
  if (!cleanPhone) {
    const errorMsg = `Invalid customer phone format: "${phone}"`;
    console.error(`[WhatsApp Engine] ${errorMsg}`);
    await logFailedAttempt(supabase, {
      phone: phone || 'UNKNOWN',
      customerName,
      eventType,
      jobId,
      saleId,
      errorDetail: errorMsg,
      messageBody: messageText || 'N/A',
    });
    return { success: false, error: errorMsg };
  }

  // 1. Fetch WhatsApp credentials & event toggles from database or environment
  let settings: any = null;
  try {
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      settings = data;
    }
  } catch (err) {
    console.warn('[WhatsApp Engine] Error reading whatsapp_settings table:', err);
  }

  // Resolve active credentials (DB overrides or Deno env vars)
  const phoneNumberId = settings?.phone_number_id || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const accessToken = settings?.access_token || Deno.env.get('WHATSAPP_ACCESS_TOKEN');

  // 2. Check Event Toggle if configured
  if (settings) {
    const toggleMap: Record<string, boolean | undefined> = {
      JOB_CREATED: settings.notify_job_created,
      JOB_STATUS_CHANGED: settings.notify_job_status_changed,
      JOB_COMPLETED: settings.notify_job_completed,
      DEVICE_DELIVERED: settings.notify_device_delivered,
      REVIEW_REQUEST: settings.notify_review_link,
      SALE_CREATED: settings.notify_sale_created,
      INVOICE_PDF: settings.notify_invoice_pdf,
      PAYMENT_PENDING: settings.notify_payment_pending,
    };

    if (toggleMap[eventType] === false) {
      console.log(`[WhatsApp Engine] Notification skipped: Event toggle "${eventType}" is disabled in whatsapp_settings.`);
      return { success: true, messageId: 'skipped_disabled_by_settings' };
    }
  }

  if (!phoneNumberId || !accessToken) {
    const errorMsg = 'Missing Meta WhatsApp credentials (WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set).';
    console.warn(`[WhatsApp Engine] ${errorMsg}`);
    await logFailedAttempt(supabase, {
      phone: cleanPhone,
      customerName,
      eventType,
      jobId,
      saleId,
      errorDetail: errorMsg,
      messageBody: messageText || 'N/A',
      documentUrl,
    });
    return { success: false, error: errorMsg };
  }

  // 3. Construct Meta Cloud API payload
  let payload: Record<string, any>;

  if (documentUrl) {
    // Document / PDF attachment message
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'document',
      document: {
        link: documentUrl,
        filename: documentFilename || 'Invoice.pdf',
        caption: messageText || 'Your Digital Solution Invoice',
      },
    };
  } else if (templateName) {
    // Pre-approved Meta Template message
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: templateComponents || [],
      },
    };
  } else {
    // Direct formatted Text message (with link preview enabled)
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: true,
        body: messageText || '',
      },
    };
  }

  const endpoint = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  console.log(`[WhatsApp Engine] Dispatching ${eventType} message to ${cleanPhone} via ${endpoint}...`);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errDetail = data.error ? `${data.error.message} (code: ${data.error.code})` : `HTTP ${res.status}`;
      console.error(`[WhatsApp Engine] Meta API dispatch error:`, errDetail);

      await logFailedAttempt(supabase, {
        phone: cleanPhone,
        customerName,
        eventType,
        jobId,
        saleId,
        errorDetail: errDetail,
        messageBody: messageText || 'N/A',
        documentUrl,
        templateName,
      });

      return { success: false, error: errDetail };
    }

    const metaMessageId = data.messages?.[0]?.id || null;
    console.log(`[WhatsApp Engine] Successfully dispatched ${eventType} to ${cleanPhone}. Meta Message ID: ${metaMessageId}`);

    // 4. Log successful outbound message in public.whatsapp_messages & public.whatsapp_logs
    await supabase.from('whatsapp_messages').insert({
      job_id: jobId || null,
      sale_id: saleId || null,
      to_number: cleanPhone,
      customer_name: customerName || null,
      event_type: eventType,
      message_body: messageText || (templateName ? `[Template: ${templateName}]` : '[Document]'),
      document_url: documentUrl || null,
      template_name: templateName || null,
      meta_message_id: metaMessageId,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    await supabase.from('whatsapp_logs').insert({
      phone: cleanPhone,
      event_type: eventType,
      template_name: templateName || 'custom',
      message: messageText || (documentUrl ? `PDF: ${documentUrl}` : 'Template message'),
      status: 'sent',
      payload: data,
    });

    return { success: true, messageId: metaMessageId };
  } catch (netErr: any) {
    const errMsg = netErr.message || 'Network failure dispatching to Meta API';
    console.error(`[WhatsApp Engine] Network exception:`, errMsg);

    await logFailedAttempt(supabase, {
      phone: cleanPhone,
      customerName,
      eventType,
      jobId,
      saleId,
      errorDetail: errMsg,
      messageBody: messageText || 'N/A',
      documentUrl,
      templateName,
    });

    return { success: false, error: errMsg };
  }
}

async function logFailedAttempt(
  supabase: any,
  info: {
    phone: string;
    customerName?: string;
    eventType: string;
    jobId?: string;
    saleId?: string;
    errorDetail: string;
    messageBody: string;
    documentUrl?: string;
    templateName?: string;
  }
) {
  try {
    await supabase.from('whatsapp_messages').insert({
      job_id: info.jobId || null,
      sale_id: info.saleId || null,
      to_number: info.phone,
      customer_name: info.customerName || null,
      event_type: info.eventType,
      message_body: info.messageBody,
      document_url: info.documentUrl || null,
      template_name: info.templateName || null,
      status: 'failed',
      error_detail: info.errorDetail,
    });

    await supabase.from('whatsapp_logs').insert({
      phone: info.phone,
      event_type: info.eventType,
      template_name: info.templateName || null,
      message: info.messageBody,
      status: 'failed',
      error_detail: info.errorDetail,
      error_message: info.errorDetail,
    });
  } catch (e: any) {
    console.error('[WhatsApp Engine] Error writing failure log to DB:', e.message);
  }
}
