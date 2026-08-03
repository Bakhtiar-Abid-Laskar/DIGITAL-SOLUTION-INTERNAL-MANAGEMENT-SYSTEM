# EXECUTIVE SUMMARY
## Attendance & Salary Module - Forensic Audit

### Technical Overview
The Attendance and Salary module for RepairShop is a robust, role-based system built on a React Native (Expo) mobile client for staff interactions and a Next.js web application for administrative oversight. It relies heavily on Supabase for its backend, utilizing PostgreSQL for relational data, Supabase Storage for selfie verification, and Edge Functions for secure, server-side salary calculations.

### Core Workflows
1. **Attendance**: Staff check in and out using the mobile app. The process requires camera permissions (for selfie verification) and high-accuracy GPS location. The data is upserted into the `attendance` table.
2. **Salary Generation**: Administrators use the web panel to generate salaries. This process relies on a secure Supabase Edge Function (`calculate-monthly-salary`) which aggregates attendance records, applies base rates, deducts leaves/early exits, adds overtime, factors in advance payments from the `payments` table, and writes final records to the `salary` table.

### Security Posture
The module enforces strict Row-Level Security (RLS). Technicians and Receptionists can only read/write their own attendance records and have zero access to the `salary` or `staff_rates` tables. All financial calculations run server-side to prevent client tampering.
