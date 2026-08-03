# Environment Variables

## ⚠️ Safety Rules

- **FRONTEND-SAFE**: These can be embedded in client apps. They use the **anon** key which respects RLS.
- **BACKEND-ONLY**: These must ONLY be used in Supabase Edge Functions via `Deno.env.get()`. NEVER put them in mobile or web frontend code.

---

## Mobile App (Expo React Native)

| Variable | Safety | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ Frontend-safe | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ Frontend-safe | Supabase anon key (RLS enforced) |

File: `RepairShopApp/.env`

### For EAS Cloud Builds

Environment variables in EAS builds can be set in three ways:

1. **`.env` file** — loaded automatically during local and cloud builds
2. **`eas.json` env block** — set per build profile (development/preview/production)
3. **EAS Secrets** — set via `eas secret:create` for sensitive values in cloud builds

```bash
# Set EAS secrets (recommended for cloud builds)
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://your-project.supabase.co
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-anon-key
```

---

## Admin Panel (Next.js)

| Variable | Safety | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Frontend-safe | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Frontend-safe | Supabase anon key (RLS enforced) |

File: `admin-panel/.env.local`

### For Vercel Deployment

Set these in Vercel Dashboard → Project → Settings → Environment Variables.

⚠️ **NEVER** set `SUPABASE_SERVICE_ROLE_KEY` in Vercel. It belongs ONLY in Supabase Edge Function secrets.

---

## Supabase Edge Functions (Backend)

Set via `npx supabase secrets set` — never commit these to code.

| Secret | Safety | Purpose |
|---|---|---|
| `SUPABASE_URL` | 🔒 Backend-only | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 Backend-only | Full DB access, bypasses RLS |
| `WHATSAPP_ACCESS_TOKEN` | 🔒 Backend-only | Meta system user access token |
| `WHATSAPP_PHONE_NUMBER_ID` | 🔒 Backend-only | Meta registered phone number ID |
| `RESEND_API_KEY` | 🔒 Backend-only | Resend email API key |
| `RESEND_FROM_EMAIL` | 🔒 Backend-only | Verified email sender address |
| `WEBHOOK_SECRET` | 🔒 Backend-only | Optional shared secret for database webhook validation |

### Setting Secrets

```bash
# Required for all Edge Functions
npx supabase secrets set SUPABASE_URL=https://your-project.supabase.co --project-ref <ref>
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key> --project-ref <ref>

# Required for notification functions (Meta WhatsApp Cloud API)
npx supabase secrets set WHATSAPP_ACCESS_TOKEN=<token> --project-ref <ref>
npx supabase secrets set WHATSAPP_PHONE_NUMBER_ID=<id> --project-ref <ref>

# Required for invoice email function (Resend)
npx supabase secrets set RESEND_API_KEY=<key> --project-ref <ref>
npx supabase secrets set RESEND_FROM_EMAIL=invoices@yourdomain.com --project-ref <ref>

# Optional: webhook secret for database webhooks
npx supabase secrets set WEBHOOK_SECRET=<random-secret> --project-ref <ref>
```

---

## .env.example Files

### Mobile: `RepairShopApp/.env`
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Admin: `admin-panel/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## ❌ Variables That Must NEVER Appear in Frontend

| Variable | Where It Belongs |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Functions only |
| `WHATSAPP_ACCESS_TOKEN` | Supabase Edge Functions only |
| `WHATSAPP_PHONE_NUMBER_ID` | Supabase Edge Functions only |
| `RESEND_API_KEY` | Supabase Edge Functions only |
| `WEBHOOK_SECRET` | Supabase Edge Functions only |

If you see any of these in mobile app code, admin-panel code, `.env` files bundled into client builds, or Git commits — **stop and fix immediately**.
