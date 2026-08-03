# RepairShop — Roadmap and Future Features

## Current State (v1.0)

The system is feature-complete for Phase 1–9 as defined in `GEMINI.md` and `SKILL.md`, with the following gaps remaining:

| Module | Status |
|---|---|
| Auth + Role Routing | ✅ Complete |
| Attendance (selfie + GPS) | ✅ Complete |
| Receptionist Job Intake | ✅ Complete |
| Technician Work Updates | ✅ Complete |
| Billing + Invoice | ✅ Complete |
| Push Notifications | ⚠️ Partial (deep link missing) |
| WhatsApp Integration | ✅ Complete |
| Email Integration | ✅ Complete |
| Admin Panel (Web) | ✅ Complete |
| Salary Management | ✅ Complete |
| Expenditure Tracking | ✅ Complete |
| Inventory Management | ✅ Complete |
| Reports | ✅ Complete |
| Customer Tab (Mobile) | ❌ Coming Soon |

---

## Immediate Fixes (Pre-Launch)

### Priority 1: Critical
1. **Push notification deep linking** — tap notification → navigate to job screen
2. **Webhook signature verification** — secure Edge Functions
3. **AddStaffModal service role fix** — move to Edge Function

### Priority 2: High
4. **Sentry error tracking** — production error monitoring
5. **Automated testing** — at least unit tests for billing + salary formulas
6. **Technician reassignment notification** — push to new technician

---

## Phase 2: Feature Enhancements

### Mobile Improvements
- **Customers Tab** — Search customer by name/phone, view all their job history
- **Job History Filtering** — Filter by date range on job list
- **Technician Reassignment Notification** — Auto push to new technician
- **Notification Deep Links** — Tap push → open specific job
- **Offline Graceful Degradation** — Show cached data when offline

### Admin Panel Improvements
- **Revenue Date Range Filter** — Monthly/yearly revenue breakdown
- **Bulk Status Update** — Mark multiple jobs as completed/received
- **Export Attendance CSV** — Monthly attendance report for payroll
- **Job Analytics** — Average repair time per device type
- **Customer CRM** — Customer profile with lifetime job history and revenue

### Operations
- **Job Aging Alerts** — Flag jobs older than 3/7/14 days without status update
- **SLA Tracking** — Track jobs by priority SLA (Urgent = same day, etc.)
- **Auto-escalation** — Notify admin when Urgent job has no update in 4 hours

---

## Phase 3: Expansion Features

### Multi-Location Support
For businesses with multiple shops:
- Add `location_id` to jobs, attendance, inventory
- Location-based staff assignment
- Per-location reports and inventory
- Admin can switch between locations

### Customer Portal
A web/mobile interface for customers to:
- Track their job status by job code
- View invoice and pay online
- Receive automatic status updates
- Rate the service after completion

### Payment Integration
For in-shop payments:
- UPI payment QR code generation
- Payment confirmation integration
- Razorpay / PayU integration for card payments
- Invoice marked paid automatically on payment

### Advanced Inventory
- **Auto-deduct from inventory** when materials added to a job
- **Supplier management** — track parts suppliers
- **Purchase order generation** — auto-generate PO when item falls below threshold
- **Barcode scanning** for material entry

### Advanced Salary
- **Leave management** — apply and approve leaves
- **Shift scheduling** — define shift times per staff member
- **Automatic OT/Early calculation** based on shift schedule
- **Salary advance approval workflow** — technician requests → admin approves

---

## Phase 4: AI and Automation

### AI-Powered Features
- **Issue Diagnosis Suggestion** — Based on device type + issue description, suggest common solutions
- **Estimated Repair Time** — ML model trained on historical repair times
- **Parts Price Suggestion** — Auto-fill common part prices based on previous jobs
- **Spam Customer Detection** — Flag suspicious repeat warranty claims

### Process Automation
- **Auto-assign technician** — Based on technician workload and specialization
- **Status update reminders** — Remind technician to update job after 24h
- **Customer follow-up** — Auto-WhatsApp 7 days after pickup for satisfaction check
- **Inventory reorder alerts** — Auto-WhatsApp to admin when stock falls below threshold

---

## Technical Debt Roadmap

### Short-Term (1-3 months)
1. **Eliminate cross-app import** — Move `DocumentRenderer` to shared package
2. **Add TanStack Query** — Replace manual state management with proper caching
3. **Remove duplicate utilities** — Share `billing.ts`, `formatCurrency.ts` between apps
4. **Add JSDoc to all utilities** — Improve developer experience
5. **Replace `any` types** — Full TypeScript strict mode compliance

### Medium-Term (3-6 months)
6. **Extract shared package** (`@repairshop/shared`) for common code
7. **Add E2E tests** — Maestro for mobile, Playwright for admin
8. **Add unit tests** — 80% coverage on business logic utilities
9. **Optimize mobile bundle size** — Analyze and reduce
10. **Server Components in admin panel** — Reduce client-side data fetching

### Long-Term (6-12 months)
11. **Migrate to monorepo** — Nx or Turborepo for workspace management
12. **Add Supabase type generation** — `supabase gen types typescript` for DB types
13. **Implement error boundary components** — Graceful React error handling
14. **Add accessibility audit** — WCAG 2.1 AA compliance for admin panel

---

## Infrastructure Roadmap

### Current Stack Limits
| Component | Current Limit | When to Upgrade |
|---|---|---|
| Supabase (Free tier) | 500MB storage, 50MB DB | After ~1 year of selfie photos |
| Supabase Realtime | 200 concurrent connections | At ~100+ concurrent users |
| Expo Push | 1000 notifications/month free | If volume increases |
| Resend Email | 3000 emails/month free | If volume increases |
| Twilio WhatsApp | Pay-per-message | Current scale is fine |
| Vercel (Hobby) | 100GB bandwidth/month | At significant web traffic |

### Upgrade Path
```
Supabase Free → Supabase Pro ($25/month)
  → Adds: 8GB storage, daily backups, Point-in-time recovery, advanced logs

Vercel Hobby → Vercel Pro ($20/month)
  → Adds: custom domains, team collaboration, analytics

EAS Free → EAS Production ($99/month)
  → Adds: priority builds, more concurrent builds, OTA update channels
```

### Scaling Architecture (When Needed)
For 10+ concurrent shops or 100+ daily jobs:
1. Move Edge Functions to dedicated Node.js/Deno server (Railway/Render)
2. Add Redis for session/rate limiting cache
3. Add CDN for static assets (already via Vercel)
4. Add Supabase read replicas for heavy reporting queries
5. Implement job queue (BullMQ) for reliable notification delivery

---

## Competing System Comparison

For reference, here's how RepairShop compares to commercial alternatives:

| Feature | RepairShop | RepairDesk | RepairShopr | mHelpDesk |
|---|---|---|---|---|
| Custom mobile app | ✅ | ❌ | ❌ | ❌ |
| Attendance with selfie | ✅ | ❌ | ❌ | ❌ |
| WhatsApp integration | ✅ | ✅ | ❌ | ❌ |
| Offline support | ❌ | ✅ | ✅ | ✅ |
| Customer portal | ❌ | ✅ | ✅ | ✅ |
| Multi-location | ❌ | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ✅ | ✅ |
| Salary management | ✅ | ❌ | ❌ | ❌ |
| Monthly cost | Free (infra costs) | $80-200/month | $60-150/month | $30-80/month |

RepairShop's key differentiators: **custom mobile app with selfie attendance + WhatsApp-first communication + integrated salary management** — all custom-built for the Indian repair shop context.

---

## Contribution Guidelines (For Future Developers)

### Before Making Changes
1. Read `GEMINI.md` in the project root — contains all architectural rules
2. Read the relevant phase section in `SKILL.md`
3. Check the affected database tables in `06_DATABASE_SCHEMA.md`
4. Check `15_BUGS_AND_GAPS.md` for related known issues

### Code Standards
- TypeScript strict mode (minimize `any`)
- All Supabase operations must handle errors
- User-facing errors must be actionable messages (not "An error occurred")
- New utilities must have JSDoc
- New business logic must have unit tests
- Job codes are never generated client-side

### Commit Message Format
```
feat(mobile): Add customer search screen
fix(admin): Fix salary calculation for halfday
chore(deps): Update @supabase/supabase-js to 2.115.0
refactor(shared): Extract DocumentRenderer to shared package
test(billing): Add unit tests for calculateGrandTotal
```

### Branch Strategy
```
main → production-ready code (auto-deploys to Vercel)
dev → integration branch
feature/[name] → individual feature branches
fix/[bug-id] → bug fix branches
```

### Pull Request Checklist
- [ ] TypeScript compiles without errors (`tsc --noEmit`)
- [ ] No service role keys exposed
- [ ] Business logic changes documented in comments
- [ ] Related tests updated
- [ ] GEMINI.md rules not violated
- [ ] RLS implications reviewed if DB schema changed
- [ ] No accidental changes to unrelated files
