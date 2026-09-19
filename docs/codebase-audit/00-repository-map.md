# Phase 0: Repository Map & Configuration Inventory

**Project Name:** RepairShop  
**Audit Date:** September 2026  
**Auditor:** Antigravity AI  
**Scope:** Full Project (Web Admin, Mobile App, Supabase Backend, Shared Packages, Build & Agent Tooling)

---

## 1. System Topology & Monorepo Architecture

The repository uses a hybrid monorepo structure consisting of an npm-workspace-managed web and library tier, coupled with a co-located standalone Expo React Native mobile application and Supabase database infrastructure:

```
d:\Digital Solution\  (Repository Root)
├── admin-panel/        # Web Application (Next.js 16 + React 19 + TypeScript + Tailwind v4)
├── packages/           # Shared Code Tier (npm workspace package @repairshop/shared)
│   └── shared/         # Shared domain logic, types, utilities, formats, and templates
├── RepairShopApp/      # Mobile Application (Expo SDK 54 + React Native 0.81 + TypeScript)
│   └── src/lib/shared/ # Mirrored shared package (required for Metro bundler resolution)
├── supabase/           # Backend Tier (PostgreSQL migrations, Deno Edge Functions, tests)
├── docs/               # Architecture, audit, deployment, and operational documentation
├── scripts/            # Repository maintenance, audit extraction, and smoke testing scripts
└── .agents/            # Antigravity agent skills and workflows
```

### Workspace Configuration Analysis

1. **Root Workspace (`package.json`):**
   - Configured with `workspaces: ["admin-panel", "packages/*"]`.
   - Pins React 19 resolution (`19.1.4`) across the web workspace to avoid peer dependency conflicts with Next.js 16.
   - Houses developer tooling including `supabase` CLI (`^2.109.1`).

2. **Mobile Standalone App (`RepairShopApp/package.json`):**
   - Not included in the root `workspaces` array. Operates as an independent project with its own lockfile and `node_modules` to prevent React Native / Metro bundler version conflicts with web Next.js/React dependencies.
   - Resolves `@repairshop/shared` via path aliases in `RepairShopApp/tsconfig.json` mapped to an internal mirror (`./src/lib/shared/`).

3. **Shared Package (`packages/shared`):**
   - Published internally as `@repairshop/shared@1.0.0`.
   - Used directly by `admin-panel` via file dependency (`"file:../packages/shared"`).

---

## 2. Directory Tree & Annotation (1st & 2nd Level)

```text
d:\Digital Solution/
├── .agents/                               # Antigravity agent customizations and local skills
│   └── skills/                            # Directory containing Antigravity operational skills
│       └── repairshop-master/             # Master development cheatsheet and phase roadmap
├── .github/                               # GitHub repository workflows and automation
├── .vscode/                               # VS Code workspace editor configuration
├── admin-panel/                           # Next.js Web Admin Panel
│   ├── .expo/                             # Local artifact directory from web preview exports
│   ├── public/                            # Static assets (favicons, branded logos, print icons)
│   ├── scripts/                           # Next.js bundle budget and build analysis scripts
│   └── src/                               # Application source code
│       ├── app/                           # App Router routes (admin dashboards, pages, API routes)
│       ├── components/                    # Web React components (common, jobs, salary, staff, etc.)
│       ├── constants/                     # Static configuration values, lookup maps, UI limits
│       ├── context/                       # React contexts (AuthContext, ToastContext)
│       ├── hooks/                         # Custom React hooks for data fetching and UI state
│       ├── lib/                           # Core utilities (Supabase client, print clients)
│       ├── providers/                     # Application providers (React Query, Theme, Auth)
│       ├── styles/                        # CSS modules and global Tailwind CSS styling
│       ├── types/                         # TypeScript interfaces and types for web domain models
│       └── utils/                         # Helper functions (currency, formatting, CSV export, HTML slips)
├── audit/                                 # Legacy audit artifacts and snapshots
├── Audit reports/                         # Historical manual audit reports (July 2026)
├── AUDIT_REPORT/                          # Domain-specific audit reports (Attendance & Salary)
├── coverage/                              # Jest test coverage reports
│   └── lcov-report/                       # HTML-rendered Jest test coverage metrics
├── docs/                                  # Official project documentation and specifications
│   └── codebase-audit/                    # Active comprehensive codebase audit documentation set
├── packages/                              # Monorepo packages root
│   └── shared/                            # Shared domain logic and types (@repairshop/shared)
│       └── src/                           # Shared source files (billing, date, phone, jobCardTemplate)
├── PROJECT_ANALYSIS/                      # Historical architectural and component hierarchy docs
├── ref/                                   # Reference materials, upgrade specs, and external schemas
├── RepairShopApp/                         # Mobile App (Expo / React Native)
│   ├── .claude/                           # Legacy AI assistance config files
│   ├── .expo/                             # Expo build cache and state
│   ├── .maestro/                          # Maestro mobile E2E UI testing flows
│   ├── android/                           # Generated native Android project files (bare/prebuild)
│   ├── assets/                            # Static mobile media (icons, splash screens, adaptive icons)
│   ├── dist/                              # Expo web export compilation outputs
│   └── src/                               # Mobile application source code
│       ├── components/                    # Mobile components (common, jobs, salary, attendance, etc.)
│       ├── context/                       # Mobile contexts (AuthContext, ToastContext)
│       ├── hooks/                         # Mobile React hooks (useNetworkStatus, insets, storage)
│       ├── lib/                           # Mobile libraries (Supabase, jobCardService, sync)
│       ├── navigation/                    # React Navigation navigators (Stacks, Tabs, RootNavigator)
│       ├── screens/                       # Role-specific screens (admin, receptionist, technician, shared)
│       ├── scripts/                       # Mobile dev helper scripts
│       ├── types/                         # Mobile TypeScript definitions
│       └── utils/                         # Mobile formatting, permission, and hardware helpers
├── scripts/                               # Root automation, migration verification, and smoke tests
├── supabase/                              # Supabase Backend Configuration & Code
│   ├── .temp/                             # Local CLI cache and temporary runtime artifacts
│   ├── functions/                         # Supabase Edge Functions (Deno TypeScript runtime)
│   ├── migrations/                        # PostgreSQL migration history (source of truth)
│   │   └── _archive/                      # Historical/squashed migration archive
│   └── tests/                             # Database SQL pgTAP and security tests
└── Updates/                               # Changelog and UI update notes
```

---

## 3. Comprehensive Configuration Inventory

| File Path | Tool / System | Primary Purpose | Key Directives / Controlled Settings |
|---|---|---|---|
| **Root Level** | | | |
| [`package.json`](file:///d:/Digital%20Solution/package.json) | npm Workspaces | Root monorepo definition and global devDependencies | `workspaces: ["admin-panel", "packages/*"]`, pins `react: 19.1.4`, defines `supabase: ^2.109.1`. |
| [`package-lock.json`](file:///d:/Digital%20Solution/package-lock.json) | npm | Dependency lockfile for root workspace | Locks versions for admin-panel, shared package, and root tooling. |
| [`vercel.json`](file:///d:/Digital%20Solution/vercel.json) | Vercel Deployment | Production web deployment settings | Sets root directory to `admin-panel`. |
| [`.gitignore`](file:///d:/Digital%20Solution/.gitignore) | Git | Repository ignore patterns | Ignores `.env*`, `node_modules`, `.next`, `dist`, build artifacts, and OS temp files. |
| [`.easignore`](file:///d:/Digital%20Solution/.easignore) | EAS Build | Mobile cloud build ignore rules | Excludes web `admin-panel`, docs, and local build artifacts from mobile EAS packaging. |
| [`app.json`](file:///d:/Digital%20Solution/app.json) | Expo / EAS (Root) | Root EAS stub config | Minimal stub specifying `eas.projectId: "7e33115f-5b88-4cf1-9b16-8fdbde6e562b"` and package `com.bakhtiarabid02.repairshopworkspace`. |
| [`eas.json`](file:///d:/Digital%20Solution/eas.json) | Expo EAS (Root) | Root EAS build profiles | Development, preview, and production build configurations. |
| [`GEMINI.md`](file:///d:/Digital%20Solution/GEMINI.md) | Antigravity AI | Global rules, standards, architecture constraints | Project name "RepairShop", prefix "RS", server-side job code rule, RLS security, role boundaries. |
| [`SKILL.md`](file:///d:/Digital%20Solution/SKILL.md) | Antigravity AI | Phase-by-phase implementation instructions | Database schema source of truth, sequence generators, formula specs. |
| **Web Admin (`admin-panel`)** | | | |
| [`admin-panel/package.json`](file:///d:/Digital%20Solution/admin-panel/package.json) | npm / Next.js | Web app package manifest | Next.js 16.2.9, React 19.1.0, TailwindCSS v4, Recharts, Leaflet, ExcelJS, `@repairshop/shared`. |
| [`admin-panel/tsconfig.json`](file:///d:/Digital%20Solution/admin-panel/tsconfig.json) | TypeScript | Web TypeScript compiler options | Strict mode, Next.js bundler module resolution, path aliases `@/*` and `@repairshop/shared`. |
| [`admin-panel/next.config.ts`](file:///d:/Digital%20Solution/admin-panel/next.config.ts) | Next.js | Next.js runtime & bundler configuration | Output file tracing root, Turbopack root, allowed dev origins, remote image host patterns (Supabase, Drive). |
| [`admin-panel/.env.local`](file:///d:/Digital%20Solution/admin-panel/.env.local) | Environment | Local web environment secrets | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| **Mobile App (`RepairShopApp`)** | | | |
| [`RepairShopApp/package.json`](file:///d:/Digital%20Solution/RepairShopApp/package.json) | npm / Expo | Mobile app package manifest | Expo SDK 54, React Native 0.81.6, Navigation v7, Camera, Location, Print, Notifications. |
| [`RepairShopApp/tsconfig.json`](file:///d:/Digital%20Solution/RepairShopApp/tsconfig.json) | TypeScript | Mobile TypeScript compiler options | Extends `expo/tsconfig.base.json`, maps `@repairshop/shared` to `./src/lib/shared/index.ts`. |
| [`RepairShopApp/app.json`](file:///d:/Digital%20Solution/RepairShopApp/app.json) | Expo Config | Native application definition | Android package `com.repairshop.app`, iOS bundle id, hardware permissions (Camera, Location, Notifications). |
| [`RepairShopApp/eas.json`](file:///d:/Digital%20Solution/RepairShopApp/eas.json) | Expo EAS | Mobile build profiles | `development`, `preview` (APK), `production` (AAB Android / iOS). |
| [`RepairShopApp/babel.config.js`](file:///d:/Digital%20Solution/RepairShopApp/babel.config.js) | Babel | JavaScript compiler config | `babel-preset-expo`, `react-native-reanimated/plugin`. |
| **Shared Packages (`packages/shared`)** | | | |
| [`packages/shared/package.json`](file:///d:/Digital%20Solution/packages/shared/package.json) | npm | Shared library manifest | `@repairshop/shared@1.0.0`, exports domain logic and types. |
| [`packages/shared/tsconfig.json`](file:///d:/Digital%20Solution/packages/shared/tsconfig.json) | TypeScript | Shared TypeScript configuration | CommonJS/ESNext module compilation, strict typing. |
| **Backend & Cloud (`supabase`)** | | | |
| [`supabase/config.toml`](file:///d:/Digital%20Solution/supabase/config.toml) | Supabase CLI | Local Supabase emulator config | Ports, auth provider settings, storage buckets, database configurations. |

---

## 4. Environment Variables Specification

### Web Client (`admin-panel/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`: Public HTTPS endpoint of the Supabase project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Safe anonymous JWT key for RLS-enforced client queries.

### Mobile Client (`RepairShopApp/.env`)
- `EXPO_PUBLIC_SUPABASE_URL`: Public HTTPS endpoint for Expo runtime.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Public anonymous key.

### Supabase Edge Functions Secrets (Server-Side Only)
- `SUPABASE_URL`: Internal API URL.
- `SUPABASE_ANON_KEY`: Anonymous client key.
- `SUPABASE_SERVICE_ROLE_KEY`: Privileged admin key (NEVER exposed to web or mobile clients).
- `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_WHATSAPP_FROM`: WhatsApp notifications.
- `RESEND_API_KEY`: Email dispatch service.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`: Google Drive backup/archival integration.
