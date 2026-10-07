# Digital Solution Internal Management System

<p align="center">
  <strong>Full-Stack Service Operations & Internal Management Platform</strong>
</p>

<p align="center">
  A multi-role business operations platform combining a web-based administrative portal, cross-platform mobile application, PostgreSQL/Supabase backend, serverless Edge Functions, automated notifications, inventory management, billing, payroll, attendance, and field-service workflows.
</p>

<p align="center">
  <a href="https://github.com/Bakhtiar-Abid-Laskar/DIGITAL-SOLUTION-INTERNAL-MANAGEMENT-SYSTEM">GitHub Repository</a>
</p>

---

## 📌 Overview

**Digital Solution Internal Management System** is a full-stack operations platform designed to centralize internal workflows that would otherwise be distributed across spreadsheets, paper records, messaging applications, and disconnected administrative tools.

The system combines:

* A **Next.js administrative web application**
* A **React Native / Expo mobile application**
* A shared **TypeScript package**
* **Supabase PostgreSQL**
* Supabase Authentication
* Row Level Security
* Supabase Storage
* Supabase Edge Functions
* Push notifications
* WhatsApp notifications
* Transactional email
* Google Drive archival
* Financial reporting
* Inventory management
* Job/service management
* Staff management
* Attendance and geofencing
* Payroll
* Point-of-sale workflows
* Customer management

The repository currently contains **57 commits** and is publicly accessible on GitHub. Its source tree includes the web application, mobile application, shared packages, Supabase backend, CI workflows, audit documentation, deployment documentation, testing utilities, and project specifications.

---

# 🎯 Project Goals

The platform is designed around several core engineering goals.

### Operational Centralization

Bring major operational workflows into one system instead of relying on disconnected tools.

### Multi-Role Access

Provide role-specific functionality for:

* Administrators
* Receptionists
* Technicians

### Cross-Platform Access

Provide:

* Browser-based administrative management
* Mobile workflows for staff operating in the field

### Real-Time Data

Use Supabase/PostgreSQL as the central source of truth for operational records.

### Secure Authorization

Enforce authorization through:

* Supabase Authentication
* JWT sessions
* PostgreSQL Row Level Security
* Role-aware application navigation
* Server-side privileged operations

### Automation

Automate:

* Notifications
* Invoice delivery
* Document archival
* Push notifications
* Operational workflows

---

# 🏗️ High-Level Architecture

```text
                         ┌──────────────────────┐
                         │       Users          │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    ▼                                ▼
          ┌──────────────────┐              ┌──────────────────┐
          │   Web Admin      │              │   Mobile App     │
          │   Next.js        │              │ React Native     │
          │   App Router     │              │ Expo             │
          └────────┬─────────┘              └────────┬─────────┘
                   │                                 │
                   └──────────────┬──────────────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │   Supabase Client   │
                       │ Authentication/API  │
                       └──────────┬──────────┘
                                  │
                         JWT + RLS Policies
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │ PostgreSQL / Supabase    │
                    │                          │
                    │ Users                    │
                    │ Customers                │
                    │ Jobs                     │
                    │ Inventory                │
                    │ Billing                  │
                    │ Payroll                  │
                    │ Attendance               │
                    │ Sales                    │
                    │ Expenses                 │
                    └───────────┬──────────────┘
                                │
                    ┌───────────┴───────────────┐
                    │                           │
                    ▼                           ▼
          ┌──────────────────┐       ┌────────────────────┐
          │ Supabase Storage │       │ Edge Functions     │
          │                  │       │                    │
          │ Images           │       │ Notifications      │
          │ Attachments      │       │ PDF generation     │
          │ Invoices         │       │ Payroll operations │
          └──────────────────┘       └─────────┬──────────┘
                                                │
                  ┌─────────────────────────────┼────────────────────┐
                  │                             │                    │
                  ▼                             ▼                    ▼
             Twilio                         Resend              Google Drive
             WhatsApp                       Email                Archival
```

The architecture and repository documentation identify the web admin as Next.js App Router, the mobile client as React Native/Expo, PostgreSQL on Supabase as the database layer, and Supabase Edge Functions as the serverless backend layer.

---

# 🧰 Technology Stack

| Layer            | Technology                     | Purpose                                               |
| ---------------- | ------------------------------ | ----------------------------------------------------- |
| Web Application  | Next.js 16                     | Administrative web portal                             |
| Web UI           | React 19                       | Component-based interface                             |
| Styling          | Tailwind CSS 4                 | Utility-first styling                                 |
| Web Language     | TypeScript                     | Type-safe application development                     |
| Mobile           | React Native 0.81              | Cross-platform mobile application                     |
| Mobile Framework | Expo SDK 54                    | Mobile development/build infrastructure               |
| Navigation       | React Navigation 7             | Role-specific mobile navigation                       |
| Database         | PostgreSQL                     | Relational data storage                               |
| Backend Platform | Supabase                       | Database, Auth, Storage and serverless infrastructure |
| Data Fetching    | TanStack React Query           | Query caching and server-state management             |
| Authentication   | Supabase Auth                  | Email/password authentication and sessions            |
| Authorization    | PostgreSQL RLS                 | Database-level access control                         |
| Charts           | Recharts                       | Dashboard analytics                                   |
| Maps             | Leaflet / React-Leaflet        | Geofence visualization                                |
| Notifications    | Expo Notifications             | Mobile push notifications                             |
| WhatsApp         | Twilio                         | Automated WhatsApp notifications                      |
| Email            | Resend                         | Transactional email                                   |
| Cloud Archive    | Google Drive API               | Document/media archival                               |
| Web Deployment   | Vercel                         | Next.js deployment                                    |
| Mobile Builds    | Expo EAS                       | Android/iOS builds                                    |
| Serverless       | Deno / Supabase Edge Functions | Backend automation                                    |

The repository's engineering documentation specifies Node 20+, npm Workspaces, Next.js App Router, React/Tailwind/PostCSS, React Native/Expo, TanStack Query, PostgreSQL/Supabase, Supabase Storage, and Deno-based Edge Functions.

---

# 🏢 System Modules

## 1. Administrative Dashboard

The web dashboard acts as the central administrative control layer.

It provides operational visibility into:

* Jobs
* Customers
* Staff
* Inventory
* Sales
* Expenses
* Attendance
* Payroll
* Payments
* Reports
* Service configuration
* System settings

The documented admin route structure includes dedicated modules for attendance, customers, expenditure, inventory, job types, jobs, materials, pending payments, reports, salary, sales, settings, and staff.

---

# 👥 Role-Based Access Control

The system supports three primary operational roles:

```text
ADMIN
  │
  ├── Full operational visibility
  ├── Staff management
  ├── Financial management
  ├── Inventory
  ├── Reports
  ├── Payroll
  └── Configuration

RECEPTIONIST
  │
  ├── Customer intake
  ├── Job creation
  ├── Job assignment
  ├── Billing
  └── Customer-facing workflows

TECHNICIAN
  │
  ├── Assigned jobs
  ├── Work updates
  ├── Materials
  ├── On-site visits
  ├── Completion workflow
  └── Attendance
```

The authorization model is implemented around Supabase Auth, a `users` profile record, role-aware application navigation, JWT sessions, and PostgreSQL RLS policies.

---

# 🔐 Authentication Architecture

Authentication follows a centralized Supabase Auth model.

```text
User
 │
 ▼
Login Screen
 │
 ▼
Supabase Auth
 │
 ▼
JWT Session
 │
 ▼
auth.uid()
 │
 ▼
users table
 │
 ├── role
 └── is_active
 │
 ▼
Role-specific navigation
 │
 ▼
PostgreSQL RLS
```

The documented authentication flow checks the authenticated user's role and active status before mounting the appropriate navigation stack. Subsequent database queries are evaluated through RLS policies.

---

# 🛡️ Authorization & Row Level Security

A major architectural principle of the system is that authorization should not depend solely on frontend checks.

Database access is protected through PostgreSQL Row Level Security.

Conceptually:

```text
Client
  │
  │ JWT
  ▼
Supabase
  │
  ▼
PostgreSQL
  │
  ▼
RLS Policy
  │
  ├── Admin
  ├── Receptionist
  └── Technician
  │
  ▼
Authorized Records
```

The project documentation specifically identifies role-aware RLS helpers such as:

```text
is_admin()
is_receptionist()
is_technician()
```

This provides a second layer of protection beyond client-side route handling.

---

# 🗄️ Database Architecture

The backend uses **PostgreSQL through Supabase**.

The repository documentation describes a migration-based database with UUID primary keys, timestamp management, relational constraints, functions, triggers, RLS policies, and storage integration.

### Core data domains include:

```text
Users
 │
 ├── Staff
 │
 ├── Attendance
 │
 └── Payroll

Customers
 │
 └── Jobs
       │
       ├── Assignment
       ├── Materials
       ├── Billing
       ├── Payments
       └── Completion

Inventory
 │
 ├── Products
 ├── Stock
 ├── Purchases
 └── Suppliers

Sales
 │
 └── Invoices

Expenses
 │
 └── Financial Reports
```

---

# 🔢 Server-Side Identifier Generation

Important business identifiers are generated by the database rather than the client.

The project documentation defines sequence-generated identifiers for:

```text
Job Codes
RS-YYYY-XXXX

Invoices
INV-YYYY-XXXX

Sales
SALE-YYYY-XXXX

Purchase Orders
PO-YYYY-XXXX
```

This prevents clients from independently generating identifiers and reduces the risk of collisions or inconsistent numbering.

---

# 🛠️ Job Management

The job-management subsystem is one of the central operational modules.

A typical lifecycle can be represented as:

```text
Customer Intake
      │
      ▼
Job Creation
      │
      ▼
Job Assignment
      │
      ▼
Technician Processing
      │
      ├── Material Allocation
      │
      ├── Work Updates
      │
      └── On-Site Workflow
      │
      ▼
Billing
      │
      ▼
Payment
      │
      ▼
Completion
```

The admin interface includes dedicated job listing, creation, assignment, customer information, billing, material allocation, and related components.

---

# 📦 Inventory Management

The inventory subsystem supports operational stock management.

Major workflows include:

* Product catalog
* Stock additions
* Stock adjustments
* Purchase intake
* Supplier management
* Material allocation
* Material returns
* Inventory reporting

The web application contains dedicated inventory, materials, supplier, catalog, and purchase-related components.

---

# 💳 Billing & Sales

The system separates operational billing and direct sales workflows.

Capabilities include:

* Repair/service billing
* Itemized invoices
* Payment recording
* Pending payments
* Point-of-sale sales
* Invoice generation
* Receipt generation
* Financial reporting

Shared utilities also include receipt and slip HTML generation and CSV export functionality.

---

# 💰 Payroll & Staff Management

The administrative application includes payroll functionality covering areas such as:

* Salary calculation
* Salary advances
* Bonuses
* Leave management
* Staff records
* Staff activation/deactivation
* Payroll reporting

The repository documentation identifies salary calculation, payroll panels, leave management, and staff administration as dedicated application modules.

---

# 📍 Attendance & Geofencing

The mobile application integrates device capabilities for attendance workflows.

The architecture includes:

* Camera access
* Selfie capture
* Location services
* Distance calculation
* Geofence verification
* Attendance records

The administrative web application also provides a map-based geofence configuration interface using Leaflet and React-Leaflet.

Conceptual workflow:

```text
Staff Member
     │
     ▼
Open Attendance
     │
     ▼
Capture Selfie
     │
     ▼
Acquire GPS
     │
     ▼
Check Geofence
     │
 ┌───┴────┐
 │        │
Valid    Invalid
 │        │
 ▼        ▼
Record   Reject
Attendance
```

---

# 📱 Mobile Application

The mobile application is built with:

* React Native
* Expo SDK 54
* React Navigation
* Supabase
* TanStack React Query
* Expo Camera
* Expo Location
* Expo Notifications
* Expo Secure Store

The repository contains role-specific navigation stacks for administrative, receptionist, and technician workflows.

---

# 📲 Mobile Architecture

```text
RepairShopApp/
│
├── Navigation
│   ├── RootNavigator
│   ├── AdminStack
│   ├── ReceptionistStack
│   └── TechnicianStack
│
├── Screens
│   ├── Admin
│   ├── Authentication
│   ├── Receptionist
│   ├── Technician
│   └── Shared
│
├── Components
│   ├── Billing
│   ├── Customers
│   ├── Jobs
│   ├── Inventory
│   ├── Materials
│   ├── Salary
│   ├── Sales
│   └── Profile
│
├── Context
├── Hooks
├── Services
├── Types
└── Utilities
```

The documented mobile codebase contains dedicated navigation, screen, component, context, hook, library, type, and utility layers.

---

# 🔄 State Management & Data Fetching

The mobile application uses **TanStack React Query** for server-state management, caching, and query lifecycle handling.

This provides a consistent model for:

* Fetching
* Caching
* Refetching
* Mutations
* Optimistic updates
* Server-state synchronization

The web application also includes TanStack React Query in its dependency stack.

---

# 📊 Analytics & Reporting

The administrative interface includes dashboard visualization using **Recharts**.

Reported areas include:

* Revenue
* Job status
* Technician performance
* Attendance
* Inventory
* Financial activity

The documented component structure includes revenue charts, job charts, and technician performance charts.

---

# 🗺️ Maps & Geospatial Features

The web application uses:

* Leaflet
* React-Leaflet
* OpenStreetMap

The primary use case is visual configuration and management of the attendance geofence.

This allows administrators to define and visualize geographic boundaries used by attendance workflows.

---

# 🔔 Notification Architecture

The platform supports multiple notification channels.

```text
                   ┌───────────────────┐
                   │ Operational Event │
                   └─────────┬─────────┘
                             │
                             ▼
                     Edge Function
                             │
             ┌───────────────┼────────────────┐
             ▼               ▼                ▼
         WhatsApp          Email             Push
          Twilio           Resend            Expo
```

Notification use cases include:

* Job creation
* Status changes
* Job assignments
* Leave approvals
* Material allocations
* Customer invoice communication

The repository documents Twilio, Resend, and Expo Push integrations.

---

# 📱 WhatsApp Integration

WhatsApp automation is implemented server-side using **Twilio**.

The documented Edge Functions handle automated messages such as:

* Job creation confirmations
* Ready-for-pickup notifications
* Job status notifications

A direct WhatsApp link can also be generated by clients as a manual communication fallback.

---

# 📧 Email Integration

Transactional email is handled through **Resend**.

The documented implementation supports:

* HTML email
* Customer invoice delivery
* PDF invoice attachments

The integration is handled through Supabase Edge Functions rather than exposing service credentials to client applications.

---

# ☁️ Google Drive Archival

The platform integrates with the Google Drive API for automated archival.

Potentially archived assets include:

* Attendance selfies
* Job inspection photographs
* Material proof receipts
* Generated invoice PDFs

The repository contains shared Drive upload functionality and a pending-upload processing workflow.

---

# 🗂️ Supabase Storage

Supabase Storage provides object storage for application files.

Documented storage use cases include:

* Attendance selfies
* Job attachments
* On-site verification media
* Invoice documents

This keeps operational files separate from relational database records while still allowing database references to those assets.

---

# ⚡ Supabase Edge Functions

The repository contains a serverless Edge Function layer implemented using Deno.

The documented architecture contains **21 Edge Functions** and shared server-side logic for areas such as authentication, notifications, Excel processing, and Google Drive integration.

Responsibilities include:

* Notifications
* Invoice processing
* PDF generation
* Payroll operations
* Webhooks
* Cloud archival
* External service integrations

---

# 🔐 Security Architecture

Security is designed around several layers.

## Client Layer

Client applications use public/anonymous Supabase credentials only.

## Authentication Layer

Supabase Auth manages:

* Identity
* Sessions
* JWT tokens
* Authentication state

## Database Layer

PostgreSQL RLS controls access to records.

## Serverless Layer

Privileged operations are isolated within Edge Functions.

## Secret Layer

Sensitive credentials remain server-side.

The project documentation explicitly states that service-role credentials must not be exposed to client applications.

---

# 🔑 Environment Variables

The documented environment configuration includes separate variables for web, mobile, and Edge Function environments.

### Web

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Mobile

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### Backend / Edge Functions

```text
SUPABASE_SERVICE_ROLE_KEY
APP_WEBHOOK_SECRET

TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_NUMBER

RESEND_API_KEY

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_DRIVE_FOLDER_ID
```

These variables and their intended environments are documented in the repository's environment-variable matrix.

> **Never commit real credentials to Git.**

---

# 📁 Repository Structure

The current repository follows a multi-workspace architecture:

```text
DIGITAL-SOLUTION-INTERNAL-MANAGEMENT-SYSTEM/
│
├── .agents/
│   └── skills/
│
├── .github/
│   └── workflows/
│
├── .vscode/
│
├── admin-panel/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   └── utils/
│   ├── scripts/
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── tsconfig.json
│   └── package.json
│
├── RepairShopApp/
│   ├── assets/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── navigation/
│   │   ├── screens/
│   │   ├── types/
│   │   └── utils/
│   ├── app.json
│   ├── eas.json
│   ├── metro.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── packages/
│   └── shared/
│
├── supabase/
│   ├── functions/
│   ├── migrations/
│   └── configuration
│
├── docs/
│
├── audit/
├── Audit reports/
├── PROJECT_ANALYSIS/
├── AUDIT_REPORT/
├── scripts/
│
├── package.json
├── package-lock.json
├── db_dump.sql
├── types.ts
├── app.json
├── eas.json
├── vercel.json
│
├── PROJECT_DOCUMENTATION.md
├── PROJECT_COMPLETE_DOCUMENTATION.md
├── APP_DOCUMENTATION.md
├── MASTER_AUDIT_REPORT.md
├── PERFORMANCE_AUDIT.md
├── NAVIGATION_AUDIT_REPORT.md
├── TEST_REPORT.md
└── README.md
```

The repository's own architectural documentation describes this as an npm-workspace-style monorepo containing the admin panel, mobile application, shared TypeScript package, Supabase backend, documentation, audits, scripts, and CI configuration.

---

# 🧩 Shared Package

The `packages/shared/` workspace provides common TypeScript functionality.

Its purpose is to avoid duplicating business logic across the web and mobile clients.

Documented responsibilities include:

* Shared types
* Billing calculations
* Phone normalization
* Common business utilities

This creates a cleaner boundary between client-specific UI and shared domain logic.

---

# 🌐 Admin Panel

The admin application is located in:

```text
admin-panel/
```

It is built with:

* Next.js 16
* React 19
* TypeScript
* Tailwind CSS 4
* Supabase JS
* TanStack Query
* Recharts
* Leaflet
* React-Leaflet

The package also includes ESLint, Jest, Playwright, TypeScript, and related development tooling.

---

# ▶️ Admin Development

Navigate to the admin application:

```bash
cd admin-panel
```

Install dependencies:

```bash
npm install
```

Start development:

```bash
npm run dev
```

The application can then be accessed through the local Next.js development server.

---

# 🏗️ Admin Production Build

Build the application:

```bash
npm run build
```

The repository's build script runs the Next.js production build followed by a bundle-budget validation script.

Start the production server:

```bash
npm start
```

Run linting:

```bash
npm run lint
```

Check bundle budget:

```bash
npm run check:budget
```

---

# 📱 Mobile Development

Navigate to the mobile application:

```bash
cd RepairShopApp
```

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm start
```

Run web:

```bash
npm run web
```

Run Android:

```bash
npm run android
```

Run iOS:

```bash
npm run ios
```

Run lint/type checks:

```bash
npm run lint
```

The mobile package defines these scripts directly in its `package.json`.

---

# 📦 Mobile Production Builds

The project uses **Expo Application Services (EAS)**.

The repository defines EAS configuration for different build/release profiles.

Example preview build:

```bash
eas build --platform android --profile preview
```

The documented deployment architecture supports:

* Development builds
* Preview APK
* Production Android builds
* Production iOS builds

---

# 🗃️ Database Development

Database changes are managed through Supabase migrations.

Typical workflow:

```bash
supabase db push
```

Migration files are maintained under:

```text
supabase/migrations/
```

The project's documentation describes a migration-driven PostgreSQL architecture with active schema migrations and database functions/triggers.

---

# ⚡ Edge Function Development

Supabase Edge Functions can be deployed using:

```bash
supabase functions deploy <function-name>
```

For example:

```bash
supabase functions deploy notify-on-job-created
```

The deployment architecture documented in the repository uses Supabase CLI for Edge Function deployment.

---

# 🚀 Deployment Architecture

The production architecture is divided into several deployment targets.

```text
┌─────────────────────────────┐
│       Next.js Admin         │
│          Vercel             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          Supabase           │
│                             │
│ PostgreSQL                  │
│ Authentication             │
│ Storage                     │
│ Edge Functions              │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      External Services      │
│                             │
│ Twilio                      │
│ Resend                      │
│ Google Drive                │
│ Expo Push                   │
└─────────────────────────────┘

┌─────────────────────────────┐
│     React Native / Expo     │
│          EAS Build          │
└─────────────────────────────┘
```

The documented production targets are Vercel for the Next.js admin portal, Expo EAS for mobile builds, and Supabase CLI for database migrations and Edge Functions.

---

# 🔄 CI/CD

The repository includes GitHub Actions configuration under:

```text
.github/workflows/
```

The documented workflow includes CI validation for development quality and build-related checks.

A recommended pipeline is:

```text
Developer
   │
   ▼
Feature Branch
   │
   ▼
Commit
   │
   ▼
GitHub
   │
   ▼
CI
   │
   ├── Lint
   ├── Type Check
   ├── Build
   └── Tests
   │
   ▼
Review
   │
   ▼
Merge
   │
   ▼
Deployment
```

---

# 🧪 Testing Strategy

Testing should cover several layers.

## Unit Testing

Use Jest for isolated logic such as:

* Billing calculations
* Utility functions
* Data transformations
* Validation
* Business rules

## End-to-End Testing

Playwright is included in the admin application's development tooling and can be used for browser-level workflows.

Potential E2E scenarios:

* Authentication
* Customer creation
* Job creation
* Job assignment
* Billing
* Inventory
* Staff workflows
* Reports

## Database Security Testing

The repository also contains RLS validation/testing utilities.

Critical authorization boundaries should be tested whenever database policies change.

---

# 🔍 Quality Assurance

Before production releases, verify:

### Authentication

* [ ] Login works
* [ ] Invalid credentials are rejected
* [ ] Inactive users are blocked
* [ ] Role-specific navigation works
* [ ] Logout invalidates the session

### Authorization

* [ ] Admin records are protected
* [ ] Receptionist permissions are restricted
* [ ] Technician permissions are restricted
* [ ] RLS policies are validated

### Operations

* [ ] Customer workflows
* [ ] Job creation
* [ ] Assignment
* [ ] Materials
* [ ] Inventory
* [ ] Billing
* [Payments
* [ ] Payroll
* [ ] Attendance

### Integrations

* [ ] WhatsApp
* [ ] Email
* [ ] Push notifications
* [ ] Google Drive
* [ ] Storage uploads

---

# 📊 Performance

Performance is treated as an architectural concern.

The admin application includes a bundle-budget check as part of its production build process.

Performance considerations include:

* Bundle size
* Code splitting
* Query caching
* Image compression
* Efficient database queries
* Pagination
* Optimistic UI updates
* Asset caching
* Mobile network efficiency
* Serverless execution time

---

# 🔒 Security Best Practices

## Never expose service-role credentials

The following must remain server-side:

```text
SUPABASE_SERVICE_ROLE_KEY
TWILIO_AUTH_TOKEN
RESEND_API_KEY
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
APP_WEBHOOK_SECRET
```

## Client applications

Only appropriate public/anonymous Supabase credentials should be available to client applications.

## Database

Use RLS as the authoritative database authorization layer.

## External webhooks

Webhook requests should be authenticated and validated.

## File uploads

Validate:

* MIME type
* File size
* Extension
* Storage path
* Ownership
* Authorization

---

# ⚠️ Known Technical Debt

The repository already contains detailed audit documentation, which is valuable for future maintenance.

The current audit documentation identifies several implementation gaps, including:

* An RPC naming mismatch related to material return.
* A legacy `billing` table query in the mobile admin overview.
* A reference to an archived low-stock RPC.
* TODO handlers in admin settings.
* Optional webhook signature validation behaviour.

These are documented findings rather than assumptions and should be treated as part of the project's current technical-debt backlog.

---

# 🧹 Recommended Remediation Priorities

## Priority 1 — Security

Review:

* Webhook signature validation
* Privileged Edge Function access
* Service-role credential handling
* Storage policies
* RLS policies

## Priority 2 — Data Consistency

Resolve:

* Legacy database references
* RPC naming mismatches
* Archived function calls
* Deprecated table references

## Priority 3 — UX

Improve:

* Loading states
* Error messages
* Offline behaviour
* Mobile responsiveness
* Empty states

## Priority 4 — Testing

Expand:

* E2E tests
* RLS tests
* Integration tests
* Mobile workflow testing

---

# 📚 Documentation

This repository contains unusually extensive engineering documentation.

Important documentation includes:

```text
PROJECT_DOCUMENTATION.md
PROJECT_COMPLETE_DOCUMENTATION.md
APP_DOCUMENTATION.md

MASTER_AUDIT_REPORT.md
PERFORMANCE_AUDIT.md
NAVIGATION_AUDIT_REPORT.md
NAVIGATION_REMEDIATION_REPORT.md
TEST_REPORT.md
VERIFICATION_REPORT.md
UI_DESIGN_AND_CODE_REPORT.md
SERIAL_TRACKING_AUDIT.md
```

The canonical project documentation covers architecture, database schema, application routes, mobile screens, shared components, authentication, environment variables, integrations, deployment, and known gaps.

---

# 🧭 Development Workflow

Recommended workflow:

```text
1. Understand requirement
        ↓
2. Review architecture
        ↓
3. Identify affected workspace
        ↓
4. Implement change
        ↓
5. Update shared types if required
        ↓
6. Update database migration if required
        ↓
7. Run lint/type checks
        ↓
8. Run relevant tests
        ↓
9. Test affected role workflows
        ↓
10. Review security implications
        ↓
11. Commit
        ↓
12. CI validation
        ↓
13. Deploy
```

---

# 📝 Commit Convention

Recommended commit prefixes:

```text
feat:       New feature
fix:        Bug fix
refactor:   Code restructuring
ui:         Interface changes
perf:       Performance improvement
security:   Security improvement
db:         Database changes
mobile:     Mobile-specific changes
web:        Web-specific changes
docs:       Documentation
test:       Testing changes
chore:      Maintenance
```

Examples:

```bash
git commit -m "feat: add technician material workflow"
```

```bash
git commit -m "fix: resolve invoice payment calculation"
```

```bash
git commit -m "security: strengthen webhook validation"
```

```bash
git commit -m "db: add inventory transaction migration"
```

---

# 📈 Scalability Strategy

The architecture provides several natural paths for future scaling.

## Application Scaling

The web and mobile clients are already separated into independent workspaces.

This allows:

* Independent release cycles
* Client-specific optimization
* Shared business logic
* Clear ownership boundaries

## Database Scaling

PostgreSQL provides:

* Relational integrity
* Transactions
* Indexing
* Constraints
* Functions
* RLS
* Database-side business logic

## Serverless Scaling

Edge Functions provide independently deployable backend functionality.

## Storage Scaling

Large media files are kept outside relational tables using object storage and archival integrations.

---

# 🗺️ Future Roadmap

Potential improvements include:

### Architecture

* Further separation of domain/business logic
* Stronger shared package boundaries
* Automated API contracts
* More comprehensive integration tests

### Security

* Mandatory webhook signature validation
* Expanded RLS testing
* Automated secret scanning
* Security-focused CI gates

### Mobile

* Improved offline support
* Background synchronization
* Enhanced push notification handling
* More robust field-service workflows

### Admin

* Advanced analytics
* Configurable dashboards
* More granular permissions
* Improved bulk operations

### Operations

* Automated reporting
* Advanced customer communication
* More notification channels
* Expanded document automation

---

# 🧱 Recommended Long-Term Architecture

```text
                         ┌─────────────────────┐
                         │      Clients        │
                         ├──────────┬──────────┤
                         │          │          │
                         ▼          ▼          ▼
                      Web Admin   Mobile    Future Client
                         │          │
                         └────┬─────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Shared Domain      │
                    │ Types / Utilities  │
                    └─────────┬──────────┘
                              │
                 ┌────────────┼─────────────┐
                 ▼            ▼             ▼
             Supabase      Edge APIs     Storage
             Database      Functions     Buckets
                 │            │             │
                 └────────────┼─────────────┘
                              ▼
                    External Integrations
                    ├── WhatsApp
                    ├── Email
                    ├── Push
                    └── Google Drive
```

---

# 📋 Production Checklist

## Application

* [ ] Production build succeeds
* [ ] TypeScript validation passes
* [ ] Lint passes
* [ ] Critical E2E workflows pass
* [ ] Mobile build verified

## Database

* [ ] Migrations verified
* [ ] RLS policies tested
* [ ] RPC functions verified
* [ ] Indexes reviewed
* [ ] Database backups configured

## Security

* [ ] No credentials committed
* [ ] Service-role key server-side only
* [ ] Webhook security reviewed
* [ ] Storage policies reviewed
* [ ] RLS tested

## Integrations

* [ ] WhatsApp tested
* [ ] Email tested
* [ ] Push notifications tested
* [ ] Google Drive tested
* [ ] PDF generation tested

## Deployment

* [ ] Vercel deployment verified
* [ ] Mobile EAS build verified
* [ ] Supabase migrations applied
* [ ] Edge Functions deployed
* [ ] Production environment variables configured

---

# 📊 Project Information

| Property          | Details                                       |
| ----------------- | --------------------------------------------- |
| Project           | Digital Solution Internal Management System   |
| Repository        | `DIGITAL-SOLUTION-INTERNAL-MANAGEMENT-SYSTEM` |
| Type              | Full-Stack Operations Management Platform     |
| Architecture      | Multi-workspace / multi-client                |
| Web               | Next.js + React + TypeScript                  |
| Mobile            | React Native + Expo                           |
| Backend           | Supabase                                      |
| Database          | PostgreSQL                                    |
| Authentication    | Supabase Auth                                 |
| Authorization     | PostgreSQL RLS                                |
| Serverless        | Supabase Edge Functions                       |
| Web Deployment    | Vercel                                        |
| Mobile Deployment | Expo EAS                                      |
| State Management  | TanStack React Query                          |
| Charts            | Recharts                                      |
| Maps              | Leaflet / React-Leaflet                       |
| Notifications     | Twilio / Resend / Expo                        |
| Storage           | Supabase Storage                              |
| Cloud Archive     | Google Drive                                  |
| Repository Status | Active Development                            |
| Maintainer        | Bakhtiar Abid Laskar                          |

The stack and deployment information above is based on the repository's current package manifests and engineering documentation.

---

# 👨‍💻 Developer

**Bakhtiar Abid Laskar**

Web and full-stack developer focused on building production-oriented applications, internal business systems, responsive interfaces, database-driven platforms, and cross-platform software.

Areas of development include:

* Full-stack web development
* React / Next.js
* React Native / Expo
* TypeScript
* PostgreSQL
* Supabase
* Authentication & authorization
* REST/API architecture
* Database design
* Business automation
* Responsive UI/UX
* Cloud deployment
* Application security
* Performance optimization

---

# ⭐ Engineering Highlights

This project demonstrates practical experience with:

* Multi-client architecture
* Full-stack TypeScript
* Next.js App Router
* React Native / Expo
* PostgreSQL
* Supabase
* Row Level Security
* JWT-based sessions
* Role-based authorization
* Database migrations
* Serverless Edge Functions
* File/object storage
* Inventory management
* Billing systems
* Payroll workflows
* Attendance systems
* Geofencing
* Push notifications
* WhatsApp automation
* Transactional email
* Google Drive API
* PDF generation
* Financial reporting
* Mobile hardware integration
* CI/CD
* Automated auditing
* Production deployment

---

# 📄 License

Unless a separate open-source license is explicitly provided in the repository, this project should be treated as proprietary software.

The source code, architecture, business logic, database schema, assets, and implementation should not be redistributed, copied, or commercially reused without appropriate authorization.

---

# 🔗 Repository

**GitHub Repository**

`https://github.com/Bakhtiar-Abid-Laskar/DIGITAL-SOLUTION-INTERNAL-MANAGEMENT-SYSTEM`

---

<p align="center">
  <strong>Built and maintained by Bakhtiar Abid Laskar</strong>
</p>

<p align="center">
  Full-Stack Engineering • Mobile Development • Cloud Architecture • Business Automation
</p>
