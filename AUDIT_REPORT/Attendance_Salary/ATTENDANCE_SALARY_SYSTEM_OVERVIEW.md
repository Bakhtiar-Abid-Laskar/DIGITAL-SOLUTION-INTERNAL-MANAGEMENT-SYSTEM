# SYSTEM OVERVIEW
## Architecture & Technology Stack

### Overall Architecture
- **Client Tier (Mobile)**: Expo React Native app. Handles daily staff operations (check-in/out).
- **Client Tier (Web)**: Next.js (React) admin panel. Handles payroll execution, salary configuration, and attendance overrides.
- **Backend Tier**: Supabase Platform.
  - **Database**: PostgreSQL with Row-Level Security.
  - **Auth**: Supabase Auth (JWT).
  - **Storage**: Supabase Storage (`attendance-selfies` bucket).
  - **Compute**: Deno-based Edge Functions.

### Module Hierarchy
```mermaid
graph TD
    A[RepairShop System] --> B[Attendance Module]
    A --> C[Salary & Payroll Module]
    B --> B1[Selfie & GPS Verification]
    B --> B2[Time Tracking]
    C --> C1[Rate Configuration]
    C --> C2[Advance Payments]
    C --> C3[Monthly Calculation Engine]
    C3 --> C4[Edge Function: calculate-monthly-salary]
```
