# RepairShop Edge Function Security

## Required Secrets

All secrets must be set via `npx supabase secrets set` — never hardcode them.

| Secret | Used By | Purpose |
|---|---|---|
| `SUPABASE_URL` | All functions | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | All functions | Admin-level DB access (bypasses RLS) |
| `WHATSAPP_ACCESS_TOKEN` | notify-on-job-created, notify-on-status-change | Meta system user access token |
| `WHATSAPP_PHONE_NUMBER_ID` | notify-on-job-created, notify-on-status-change | Meta registered phone number ID |
| `RESEND_API_KEY` | send-invoice-email | Resend email API key |
| `RESEND_FROM_EMAIL` | send-invoice-email | Verified sender address |
| `WEBHOOK_SECRET` | notify-on-job-created, notify-on-status-change | Optional shared secret for database webhook validation |

## Function Auth Strategy

| Function | Auth Method | Who Can Call | Enforcement |
|---|---|---|---|
| `calculate-monthly-salary` | JWT (Bearer token) | Admin only | `requireRole(req, ['admin'])` in function code |
| `send-invoice-email` | JWT (Bearer token) | Receptionist or Admin | `requireRole(req, ['admin', 'receptionist'])` in function code |
| `notify-on-job-created` | Webhook secret | Supabase Database Webhook | `verifyWebhookSecret(req)` — validates X-Webhook-Secret header |
| `notify-on-status-change` | Webhook secret | Supabase Database Webhook | `verifyWebhookSecret(req)` — validates X-Webhook-Secret header |

### JWT Verification Flow

For `calculate-monthly-salary` and `send-invoice-email`:

1. Function extracts Bearer token from `Authorization` header.
2. Verifies token with Supabase Auth (`getUser(token)`).
3. Fetches caller's profile from `public.users`.
4. Checks `is_active = true`.
5. Checks `role` is in the allowed roles list.
6. Rejects with 400 error if any check fails.

### Webhook Secret Verification Flow

For `notify-on-job-created` and `notify-on-status-change`:

1. If `WEBHOOK_SECRET` environment variable is NOT set → skip validation (development mode).
2. If `WEBHOOK_SECRET` IS set → validate `X-Webhook-Secret` header matches.
3. Rejects with 500 error if header is missing or doesn't match.

To enable webhook secret validation:
```bash
npx supabase secrets set WEBHOOK_SECRET=your-random-secret-here --project-ref pjlqluyghnmiiyrkkwgl
```

Then configure the database webhook in Supabase Dashboard to include the header:
- Header Name: `X-Webhook-Secret`
- Header Value: same secret value

## Shared Auth Module

All auth verification logic is in `_shared/verifyAuth.ts`:

- `verifyAuthenticatedUser(req)` — Verify JWT, return user profile
- `requireRole(req, allowedRoles)` — Verify JWT + check role
- `verifyWebhookSecret(req)` — Validate webhook secret header

## What Must NEVER Be Exposed

- ❌ `SUPABASE_SERVICE_ROLE_KEY` in mobile app or admin-panel frontend
- ❌ Meta WhatsApp credentials in any client-side code
- ❌ Resend API key in any client-side code
- ❌ `WEBHOOK_SECRET` in any client-side code
- ❌ Any secret in `console.log()` output
- ❌ Any secret in error messages returned to clients
- ❌ Any secret in Git commits or `.env` files checked into version control

## Deployment Commands

```bash
# Deploy all functions
npx supabase functions deploy --project-ref pjlqluyghnmiiyrkkwgl

# Deploy specific function
npx supabase functions deploy calculate-monthly-salary --project-ref pjlqluyghnmiiyrkkwgl
npx supabase functions deploy send-invoice-email --project-ref pjlqluyghnmiiyrkkwgl
npx supabase functions deploy notify-on-job-created --project-ref pjlqluyghnmiiyrkkwgl
npx supabase functions deploy notify-on-status-change --project-ref pjlqluyghnmiiyrkkwgl

# Set secrets
npx supabase secrets set SUPABASE_URL=https://pjlqluyghnmiiyrkkwgl.supabase.co --project-ref pjlqluyghnmiiyrkkwgl
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key> --project-ref pjlqluyghnmiiyrkkwgl
npx supabase secrets set WEBHOOK_SECRET=<random-secret> --project-ref pjlqluyghnmiiyrkkwgl
```

## Testing Permissions

1. Log in as **technician** → try calling `calculate-monthly-salary` → should get "Access denied. Required role: admin. Your role: technician".
2. Log in as **receptionist** → call `send-invoice-email` → should succeed for valid job.
3. Log in as **technician** → call `send-invoice-email` → should get "Access denied. Required role: admin or receptionist. Your role: technician".
4. Call `notify-on-job-created` without X-Webhook-Secret header (when WEBHOOK_SECRET is set) → should get "Invalid webhook secret".
5. Call `notify-on-job-created` with correct X-Webhook-Secret header → should succeed.
