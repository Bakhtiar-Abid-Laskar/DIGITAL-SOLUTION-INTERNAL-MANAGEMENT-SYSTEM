# Supabase Database Webhooks Setup

To trigger the push notifications and WhatsApp messages automatically, we must hook our Edge Functions to the database events. 

## 1. Secrets Setup
Before deploying your Edge Functions, you must set your Meta WhatsApp secrets in your Supabase dashboard or via CLI. 
*(Note: You do not need to set `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`, as Supabase automatically provides those to Edge Functions!)*

Command line example:
```bash
npx supabase secrets set WHATSAPP_ACCESS_TOKEN=<your-system-user-access-token>
npx supabase secrets set WHATSAPP_PHONE_NUMBER_ID=<your-phone-number-id>
```

## 2. Deploy Functions
Deploy the functions to your project:
```bash
supabase functions deploy notify-on-job-created
supabase functions deploy notify-on-status-change
```

## 3. Webhook Setup (Dashboard)
Go to your Supabase Dashboard -> Database -> Webhooks.

### Webhook 1: Job Created
1. Click **Create Webhook**.
2. Name: `notify-on-job-created`
3. Table: `jobs`
4. Events: Check `Insert`
5. Type: Edge Function (or HTTP Request pointing to your Edge Function URL).
6. Select the `notify-on-job-created` function.
7. Save.

### Webhook 2: Job Status Changed
1. Click **Create Webhook**.
2. Name: `notify-on-status-change`
3. Table: `jobs`
4. Events: Check `Update`
5. Type: Edge Function (or HTTP Request pointing to your Edge Function URL).
6. Select the `notify-on-status-change` function.
7. Save.

## Testing & Troubleshooting
- For Meta WhatsApp API, verify that the recipient's phone number is added to your WhatsApp sandbox/developer account's allowed numbers list if you are using a development/trial account.
- Free-form messages will fail if the 24-hour window has expired. Ensure you use pre-approved templates for production alerts.
- To receive Push Notifications, you MUST log in using a physical Android or iOS device. Expo Go simulators cannot receive real push tokens.
- Check the `notifications` table in your database to see exactly what triggered, the messages generated, and their success/failure status.
