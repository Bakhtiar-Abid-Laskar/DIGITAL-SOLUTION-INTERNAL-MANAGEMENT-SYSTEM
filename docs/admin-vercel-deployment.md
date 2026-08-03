# Admin Panel — Vercel Deployment Guide

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (anon key only — no service_role in frontend)
- **Charts**: Recharts

## Local Development

```bash
cd admin-panel
npm install
npm run dev
```

Open http://localhost:3000 and log in as admin.

## Build Check

```bash
npm run build
```

Must complete with **zero errors** before deploying.

## Deploy to Vercel

### Option 1: Vercel CLI
```bash
npm install -g vercel
cd admin-panel
vercel --prod
```

### Option 2: Vercel Dashboard
1. Go to https://vercel.com
2. Import Git repo or upload project
3. Set **Root Directory** to `admin-panel` if using monorepo
4. Set framework to "Next.js"
5. Add environment variables (see below)
6. Deploy

### Option 3: GitHub Integration
1. Connect your GitHub repo to Vercel
2. Set root directory to `admin-panel`
3. Configure env variables
4. Auto-deploys on push to main branch

## Environment Variables (Vercel Dashboard)

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://pjlqluyghnmiiyrkkwgl.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |

> ⚠️ **NEVER** set `SUPABASE_SERVICE_ROLE_KEY` in Vercel. It belongs ONLY in Supabase Edge Function secrets.

## Post-Deployment Verification

1. Open the deployed URL
2. Log in as admin → should reach dashboard with real data
3. Try logging in as receptionist → verify salary/expenditure pages show "Access Denied" or redirect
4. Check that overview metrics load real data
5. Test all CRUD operations (jobs, staff approval, inventory, etc.)
6. Test CSV export
7. Test salary calculation (calls Edge Function with admin JWT)
8. Test invoice email sending (calls Edge Function with admin/receptionist JWT)

## Vercel Build Logs

If the build fails:
1. Check Vercel Dashboard → Deployments → click failed deployment
2. Review Build Logs for TypeScript errors or missing dependencies
3. Fix locally with `npm run build` and push again

## Custom Domain (Optional)

1. Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed by Vercel
4. SSL is automatic
