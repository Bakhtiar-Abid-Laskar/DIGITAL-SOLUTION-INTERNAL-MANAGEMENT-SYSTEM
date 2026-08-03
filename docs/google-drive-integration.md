# Google Drive Integration — Team Reference

## Overview

RepairShop automatically exports data and media to a dedicated Google Drive account using OAuth 2.0. No service account is involved — this uses a personal Gmail account's 15 GB free quota.

---

## Drive Folder Structure

```
My Drive/
├── Data Export/
│   └── 2026/
│       └── August/
│           └── August 2026 digital solution backup.xlsx
├── Attendance Report/
│   └── 2026/
│       └── August/
│           ├── rahul-kumar-082026.xlsx
│           └── arshad-ali-082026.xlsx
├── Attendance Selfies/
│   └── 2026/
│       └── August/
│           └── StaffName/
│               ├── staffname-20260801-checkin.webp
│               └── staffname-20260801-checkout.webp
├── Onsite Photos/
│   └── 2026/
│       └── August/
│           └── RS-2026-0042/
│               └── technician-name-20260803-143022.webp
├── Invoices/
│   └── 2026/
│       └── August/
│           └── INV-001-customer-name.pdf
└── Receipts/
    └── 2026/
        └── August/
            └── RS-2026-0042-customer-name.pdf
```

---

## Scheduled Exports (Automatic)

| Job | Schedule | What it does |
|---|---|---|
| `monthly-drive-export` | 1st of month, 20:00 UTC (1:30 AM IST) | Exports Jobs, Sales, Stock Snapshot xlsx |
| `monthly-attendance-export` | 1st of month, 20:30 UTC (2:00 AM IST) | Exports per-staff attendance xlsx files |
| `retry-pending-uploads` | Every 15 minutes | Retries failed Drive uploads from queue |

Verify schedules: `select jobname, schedule, active from cron.job;`

---

## Manual Triggers (Admin Panel)

Both export functions can be triggered manually from the admin panel's Settings or Reports page:
- **Export Monthly Data** — generates the xlsx for any selected month
- **Export Attendance Reports** — generates per-staff xlsx files for any selected month

Both buttons show a loading state and return a clickable Drive link on success.

---

## Edge Functions

| Function | Purpose |
|---|---|
| `export-monthly-data` | Monthly Jobs/Sales/Stock xlsx |
| `export-attendance-reports` | Per-staff attendance xlsx |
| `upload-attendance-selfie` | Selfie WebP → Drive + links attendance row |
| `upload-job-photo` | Onsite WebP → Drive + links onsite_visits row |
| `process-pending-uploads` | Retry worker for failed Drive uploads |
| `test-drive-auth` | One-time auth verification (remove after setup) |

---

## Secrets Required

Set via `npx supabase secrets set <KEY>=<VALUE>`:

| Secret | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GOOGLE_REFRESH_TOKEN` | Long-lived refresh token (never expires unless revoked) |

**Never commit these values.** They live only in Supabase Edge Function secrets.

---

## One-Time Setup Steps

### If you need to regenerate the refresh token (e.g. token was revoked):

1. Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set as environment variables locally.
2. Run the token generation script:
   ```bash
   GOOGLE_CLIENT_ID=<id> GOOGLE_CLIENT_SECRET=<secret> node scripts/get-google-refresh-token.mjs
   ```
3. Open the printed URL in the browser as the Drive owner's Gmail account.
4. Copy the printed refresh token.
5. Update the Supabase secret:
   ```bash
   npx supabase secrets set GOOGLE_REFRESH_TOKEN=<new-token>
   ```
6. Redeploy affected Edge Functions:
   ```bash
   npx supabase functions deploy export-monthly-data
   npx supabase functions deploy export-attendance-reports
   npx supabase functions deploy upload-attendance-selfie
   npx supabase functions deploy upload-job-photo
   npx supabase functions deploy process-pending-uploads
   ```
7. Verify with `test-drive-auth` Edge Function.

---

## pg_cron Migrations — Placeholder Substitution Required

**Before applying migrations `20260803000002` and `20260803000005`**, replace these placeholders:

| Placeholder | Replace with |
|---|---|
| `<project-ref>` | Your Supabase project reference (Settings → General) |
| `<anon-key>` | Your Supabase anon key (Settings → API — it's the public key, safe to use here) |

The service role key is **never** placed in pg_cron SQL.

---

## Draining Stuck Uploads

If the admin panel shows stuck uploads (failed after 3 attempts):

1. Check `pending_uploads` table for `attempts >= 3` rows.
2. Review the `last_error` column to understand why the upload failed.
3. If the issue is resolved (e.g. Drive auth was revoked and has been fixed):
   - Reset stuck rows: `UPDATE pending_uploads SET attempts = 0 WHERE attempts >= 3;`
   - The retry worker will pick them up within 15 minutes.
4. If the original image is gone from Supabase Storage, the row must be manually removed.

---

## Drive Quota Monitoring

The export system uses the **personal Gmail account's 15 GB free quota**. Monitor usage:
- Go to [drive.google.com/drive/quota](https://drive.google.com/drive/quota)
- Or: Google Account → Manage Storage

**Estimated storage per month:**
- Monthly xlsx: ~500 KB – 2 MB
- Attendance xlsx (per staff): ~50–200 KB each
- Selfie WebP (per checkin/checkout): ~100–300 KB each (after 1280px / 0.78 quality compression)
- Invoice PDF: ~50–200 KB each

For a team of 5 staff, estimated monthly usage: **~30–80 MB/month**.
Free 15 GB = roughly **2–4 years** before needing Google One paid storage.

---

## Supabase Edge Function Limits (as of August 2026)

> Update this section if Supabase changes its limits.

- Free tier: 500,000 invocations/month, 400 MB memory per invocation, wall-clock time varies.
- The export functions paginate data at 500 rows per query to stay within memory/time limits.
- If the monthly data export times out on very large datasets, reduce `PAGE_SIZE` in `exportWorkbook.ts`.
