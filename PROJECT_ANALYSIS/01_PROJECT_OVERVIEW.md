# RepairShop — Complete Project Overview

## 1. Executive Summary

**RepairShop** is a full-stack, production-grade **service and repair management system** for a computer/device repair business. It is composed of two completely independent, fully separate applications that share one backend:

| Application | Technology | Purpose |
|---|---|---|
| **Admin Panel** | Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 | Web dashboard for admin/owners |
| **Mobile App** | Expo 54 + React Native 0.81 + TypeScript | Staff-facing app for receptionist & technician |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) | Shared infrastructure |

---

## 2. Business Context

The system is built for a computer repair shop (Indian context — INR currency, +91 phone numbers, WhatsApp-first customer communication). The business operations include:

- Taking in customer devices for repair (laptops, PCs, or other devices)
- Assigning jobs to technicians
- Tracking repair status in real-time
- Managing parts/materials used
- Generating invoices and billing
- Recording staff attendance with selfie + GPS verification
- Managing salary, overtime, advance salary, and expenditure
- Tracking inventory of parts and supplies
- Sending WhatsApp messages and emails to customers
- Providing push notifications to staff

---

## 3. System Identity

- **Project Name:** RepairShop
- **Job Code Format:** `RS-YYYY-NNNN` (e.g., `RS-2026-0001`)
- **Job Code Generation:** Server-side only, via PostgreSQL sequence + `generate_job_code()` RPC
- **Currency:** INR (₹)
- **Default Country Code:** +91 (India)
- **Communication Channels:** WhatsApp (via Twilio), Email (via Resend), Push Notifications (via Expo)

---

## 4. Roles and Permissions

| Role | Mobile App | Admin Panel |
|---|---|---|
| **admin** | Overview, Staff, Inventory, Reports tabs | Full access to all pages |
| **receptionist** | Dashboard, Jobs (list/detail/intake/billing), Attendance | Limited (not the primary consumer) |
| **technician** | My Jobs, Update Work, Onsite Visit, Attendance | No access |

All roles require `is_active = true` to use the system. Inactive users are blocked and see the `InactiveUserScreen`.

---

## 5. Core Domain Objects

| Domain Object | Description |
|---|---|
| **Job** | A repair job with customer info, device, issue, status, priority, assignments |
| **JobMaterial** | Parts/materials used in a job (logged by technician) |
| **Billing** | Invoice for a job: parts total + labour + tax - discount = grand total |
| **Attendance** | Daily check-in/check-out with selfie photo + GPS coordinates |
| **OnsiteVisit** | Visit log for onsite jobs — arrival/departure selfies + GPS |
| **Inventory** | Stock items with quantity and low-stock threshold |
| **Payment** | Financial transactions: advance salary, materials purchase, daily expenditure, office development |
| **StaffRate** | Per-employee pay rates: base daily rate, OT rate, early deduction rate |
| **SalaryRecord** | Monthly payroll record with all attendance-based calculations |
| **Notification** | Log of all push/WhatsApp/email notifications sent |

---

## 6. System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                           │
│                                                              │
│  ┌─────────────────────┐    ┌──────────────────────────────┐ │
│  │   MOBILE APP        │    │      ADMIN PANEL             │ │
│  │   Expo React Native │    │      Next.js 16 (App Router) │ │
│  │   iOS + Android     │    │      Vercel Deployment       │ │
│  └──────────┬──────────┘    └──────────────┬───────────────┘ │
│             │                              │                 │
│             │  Supabase JS SDK (anon key)  │                 │
└─────────────┼──────────────────────────────┼─────────────────┘
              │                              │
              ▼                              ▼
┌──────────────────────────────────────────────────────────────┐
│                       SUPABASE BACKEND                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  PostgreSQL  │  │  Supabase    │  │  Supabase        │    │
│  │  Database    │  │  Auth        │  │  Storage         │    │
│  │  (RLS)       │  │  (JWT)       │  │  (Private Buckets│    │
│  └──────────────┘  └──────────────┘  └──────────────────┘    │
│                                                              │
│  ┌──────────────┐  ┌──────────────────────────────────────┐  │
│  │  Supabase    │  │  Edge Functions (Deno)               │  │
│  │  Realtime    │  │  • notify-on-job-created             │  │
│  │  (WebSockets)│  │  • notify-on-status-change           │  │
│  └──────────────┘  │  • send-invoice-email                │  │
│                    └──────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│  Expo Push Notification Service (exp.host)                   │
│  Twilio WhatsApp API                                         │
│  Resend Email API                                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Key Technical Decisions

| Decision | Rationale |
|---|---|
| Job code via PostgreSQL RPC | Prevents duplicate codes under concurrent job creation |
| Expo SecureStore for session | Secure native keychain storage on mobile vs. localStorage |
| Private Supabase Storage buckets | Attendance selfies and onsite photos are not publicly accessible |
| Supabase Realtime subscriptions | Live job status updates without polling |
| Edge Functions for notifications | Keeps Twilio/Resend API keys off client devices |
| Service Role key only in Edge Functions | Security — never exposed to browser or mobile |
| Shared DocumentRenderer module | Receipt and invoice HTML generated from single source of truth |
| Tailwind CSS v4 with CSS custom properties | Admin panel uses CSS variables for theme; no config file needed |
| `react-native-reanimated` for animations | Hardware-accelerated animations on mobile (spring physics) |

---

## 8. Environment Configuration

### Mobile App (`RepairShopApp/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

### Admin Panel (`admin-panel/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

### Supabase Edge Function Secrets (never in code)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
TWILIO_SID
TWILIO_TOKEN
TWILIO_WHATSAPP_FROM
RESEND_API_KEY
```

---

## 9. Build and Deployment

| App | Development | Production |
|---|---|---|
| Mobile | `expo start` | EAS Build (`eas build --platform android --profile production`) |
| Admin Panel | `next dev` | Vercel (auto-deploy from Git) |
| Edge Functions | `supabase functions serve` locally | `supabase functions deploy` |

### EAS Build Profiles
- **development** — internal distribution, development client enabled
- **preview** — internal distribution, Android APK
- **production** — Android App Bundle (.aab) + iOS App Store build

---

## 10. Database Tables Summary

| Table | Primary Purpose |
|---|---|
| `users` | All staff accounts (id = Supabase Auth uid) |
| `jobs` | All repair jobs |
| `job_materials` | Materials/parts used per job |
| `attendance` | Daily check-in/out per user |
| `onsite_visits` | Onsite arrival/departure logs |
| `billing` | Invoice data per job |
| `inventory` | Stock items |
| `payments` | All financial transactions |
| `staff_rates` | Per-user pay rates |
| `salary` | Monthly salary records |
| `notifications` | Notification send log |

---

## 11. Key Feature Inventory

| Feature | App | Status |
|---|---|---|
| Role-based login (receptionist/technician/admin) | Mobile | ✅ Implemented |
| Role-based navigation (separate tab stacks) | Mobile | ✅ Implemented |
| Attendance with selfie + GPS | Mobile | ✅ Implemented |
| New job intake (2-step: intake → assignment) | Mobile | ✅ Implemented |
| Job list with status filtering | Mobile | ✅ Implemented |
| Job detail view | Mobile | ✅ Implemented |
| Technician assignment | Mobile | ✅ Implemented |
| Billing/invoice generation | Mobile | ✅ Implemented |
| Print receipt via expo-print | Mobile | ✅ Implemented |
| WhatsApp customer communication | Mobile | ✅ Implemented |
| Email invoice via Edge Function | Mobile | ✅ Implemented |
| Technician job update + status change | Mobile | ✅ Implemented |
| Materials/parts logging | Mobile | ✅ Implemented |
| Work notes | Mobile | ✅ Implemented |
| Onsite visit (selfie + GPS) | Mobile | ✅ Implemented |
| Push notifications registration | Mobile | ✅ Implemented |
| Notifications screen | Mobile | ✅ Implemented |
| Admin overview dashboard | Admin | ✅ Implemented |
| Jobs management with filters | Admin | ✅ Implemented |
| Job detail with tabs | Admin | ✅ Implemented |
| Staff management (approve/block/add) | Admin | ✅ Implemented |
| Salary management (calculate/rates/advance) | Admin | ✅ Implemented |
| Expenditure tracking | Admin | ✅ Implemented |
| Inventory management | Admin | ✅ Implemented |
| Reports (technician performance, revenue, customer) | Admin | ✅ Implemented |
| Admin overview (mobile) | Mobile | ✅ Implemented |
| Customers tab | Mobile | 🔲 Coming Soon (ComingSoonScreen) |
| Admin settings (branding/config) | Admin | 🔲 Placeholder only |
| Receipt print (admin) | Admin | ✅ Implemented (via print route) |
| Salary slip print | Admin | ✅ Implemented |

---

## 12. Cross-Application Communication

The mobile app and admin panel share the **same Supabase project**, meaning:

- Both read/write to the same PostgreSQL tables
- Supabase Realtime channels allow live sync between apps
- A job created on the mobile app instantly appears in the admin panel
- A status update in admin shows in the mobile app for the technician
- The `DocumentRenderer` module is physically shared — `BillingScreen.tsx` in mobile imports from `../../../admin-panel/src/shared/documents/DocumentRenderer` (a relative path cross-application import)

> **Warning:** This cross-app import is a coupling risk. If the admin panel moves or is restructured, the mobile billing screen will break.
