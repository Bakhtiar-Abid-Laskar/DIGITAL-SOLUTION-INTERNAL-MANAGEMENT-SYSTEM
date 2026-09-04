# Phase 1: Full Codebase Inventory (Executive Summary)

**Project Name:** RepairShop Service Management System  
**Scope:** Mobile App (`RepairShopApp`), Web Admin (`admin-panel`), Shared Package (`@repairshop/shared`), Database & Edge Functions (`supabase`)  

---

## Codebase Structure & Component Breakdown

```
RepairShop Workspace
├── Mobile App (Expo SDK 54 / React Native)
│   ├── 30+ Screens (Auth, Receptionist, Technician, Admin, Shared)
│   ├── Role-based Navigators (Root, Admin, Receptionist, Technician)
│   └── Native Modules (Camera, Location, Notifications, Print, Storage)
│
├── Web Admin Panel (Next.js 16 App Router)
│   ├── 19 Pages / Administrative Dashboards
│   ├── Leaflet GPS Mapping, Recharts Analytics, POS Invoicing
│   └── Real-time Supabase Subscriptions
│
├── Shared Business Core (@repairshop/shared)
│   ├── Billing Math & Formula Engine
│   ├── Phone Number Normalization (+91 Indian WhatsApp formatter)
│   ├── Date & Currency Formatting Utilities
│   └── Unified TypeScript Interfaces
│
└── Backend Infrastructure (Supabase)
    ├── 38 PostgreSQL Tables with Row Level Security (RLS)
    ├── 14 Deno Serverless Edge Functions
    ├── Automated Triggers (Stock Management, Incentive Accrual)
    ├── 5 Private Storage Buckets
    └── pg_cron Scheduled Maintenance & Backup Workers
```

---

## Detailed Inventory Index

| Section | Detail Report | Summary Count |
|---|---|---|
| **1. Screens, Views & Pages** | [`01a-screens-and-views.md`](file:///c:/Users/bakht/Desktop/Digital%20Solution/audit/01a-screens-and-views.md) | **31 Mobile Screens**, **19 Web Admin Pages** |
| **2. APIs, RPCs & Triggers** | [`01b-api-and-endpoints.md`](file:///c:/Users/bakht/Desktop/Digital%20Solution/audit/01b-api-and-endpoints.md) | **14 Edge Functions**, **13 Client RPCs**, **8 Database Triggers** |
| **3. Database Schema & Storage** | [`01c-database-schema.md`](file:///c:/Users/bakht/Desktop/Digital%20Solution/audit/01c-database-schema.md) | **38 Tables**, **2 Views**, **2 Sequences**, **5 Storage Buckets** |
| **4. Auth & Permissions** | [`01d-auth-and-permissions.md`](file:///c:/Users/bakht/Desktop/Digital%20Solution/audit/01d-auth-and-permissions.md) | **3 Primary Roles**, **Complete RLS Policy Matrix**, **Token Lifecycle** |

---

## External Integrations Inventory

1. **Google Drive API (v3):**
   - Service account authenticated via RSA-signed JWTs (`googleAuth.ts`).
   - Auto-organizes files into hierarchical folders: `Invoices/YYYY/Month/`, `Attendance Selfies/YYYY/Month/StaffName/`, `Data Export/YYYY/Month/`.
2. **Expo Push Notification Service:**
   - Dispatches instant alerts to technician devices on job assignment and admin/receptionist devices on status progression.
3. **Resend Email API:**
   - Transactional branded HTML invoice delivery with rate-limiting (1 email/60s per job).
4. **WhatsApp Web Links:**
   - Dynamic deep-links pre-filling customer notifications (`+91` normalized numbers) for ready-for-pickup notices.
5. **pg_cron & pg_net:**
   - Database-level cron triggering monthly multi-sheet backup exports and retrying failed uploads.
