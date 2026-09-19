# Module 04: Billing, Invoicing & Counter Sales Management

**Module:** Itemized Billing Engine, Counter Sales, GST Computation, Partial Payment Ledger, Thermal/PDF Printing & Document Dispatch  
**Surfaces Covered:** Web Admin Panel (`admin-panel`), Mobile App (`RepairShopApp`), Shared Tier (`packages/shared`), Database & Edge Functions (`supabase`)  
**Status:** Audit Complete — Read-and-Document Only

---

## 1. Module Overview & Lifecycle Map

The **Billing, Invoicing & Sales** module is the revenue capture system of RepairShop. It handles two distinct commercial intake channels: repair job checkout (reconciling labor charges with parts used) and direct over-the-counter retail sales. It enforces Indian GST tax calculations (Intra-state CGST+SGST vs Inter-state IGST), supports forward and reverse calculation from target grand totals, records payments with partial balance tracking, generates thermal receipts and A4/A5 PDF invoices, and archives billing documents to Google Drive.

```text
[Commercial Channel 1: Job Handover]         [Commercial Channel 2: Counter Sale]
        │                                                     │
        ▼                                                     ▼
[BillingScreen / JobBillingCard]              [NewSaleScreen / CreateSalePage]
        │                                                     │
        ├── Reconciles Parts from job_materials               ├── Selects Products from inventory
        └── Adds Labour Charge from job_types                 └── Scans/Picks Serial Numbers
                                │                             │
                                └──────────────┬──────────────┘
                                               ▼
                              [Itemized Billing Calculator]
                                               │
                                               ├── Forward Calc: (Rate * Qty) + Tax - Discount
                                               └── Reverse Calc: Grand Total -> Taxable Base + GST
                                               ▼
                              [RPC: public.create_invoice_v2]
                                               │ (Atomic Transaction)
                                               ├── Inserts [public.invoices] (Code: INV-YYYY-XXXX)
                                               ├── Inserts [public.invoice_items]
                                               ├── Claims Serials in [public.inventory_unit_serials]
                                               └── Deducts Stock in [public.inventory]
                                               ▼
                              [Payment Settlement / Ledger]
                                               │
                                               ├── RPC: [public.record_payment]
                                               │    ├── Full Payment: status = 'paid', sets paid_at
                                               │    ├── Partial: status = 'partial', balance tracked
                                               │    └── Logs into [public.customer_ledgers]
                                               ▼
                              [Document Generation & Dispatch]
                                               │
                                               ├── Direct Print: [lib/invoiceClient] / Expo Print
                                               ├── WhatsApp Link: Opens prefilled pickup message
                                               ├── Edge Function: [generate-invoice] (SVG/Drive HTML)
                                               └── Edge Function: [send-invoice-email] (Resend API)
```

---

## 2. Web Admin Panel (`admin-panel`)

### `admin-panel/src/app/(admin)/sales/page.tsx`
- **Purpose:** Primary sales dashboard for administrators to view, search, filter, and export all generated customer invoices (both Job-linked and Direct Counter Sales).
- **Key Exports:**
  - `default function SalesPage()`: Sales ledger overview page.
- **Inputs & Outputs:**
  - Props: None (App Router Page).
  - Output: Tabbed invoice list with filter bar (Status: `All`, `Draft`, `Paid`, `Cancelled`), payment method dropdown, date range selectors, debounced search across invoice code, customer name, and item serials.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/types/sales` (`Invoice`), `@/utils/salesCsv` (`exportSalesToCSV`), `@/components/common/*` (`ActiveFiltersBar`, `PageHeader`, `Card`, `Button`, `Input`, `Select`, `Badge`, `DataTableSkeleton`, `EmptyState`, `Pagination`, `Tabs`), `@/utils/formatDate`.
  - External: `@repairshop/shared` (`useDebounceValue`, `formatCurrency`), `lucide-react`, `next/navigation`.
  - Database: Queries `invoices` joined with `users(name)` and queries `invoice_items` for serial number matches.
- **Side Effects:**
  - Client-side CSV export via `exportSalesToCSV`.
  - URL synchronization for filter states.
- **Callers:**
  - Next.js route: `/sales`.
- **Observations / Debt:**
  - Serial Search Two-Step Query: When searching by serial number, it first queries `invoice_items` to gather matched `invoice_id` values, then applies `.in('id', matchedSaleIds)` to `invoices`. Works well for small sets but can scale poorly if search matches hundreds of items.

---

### `admin-panel/src/app/(admin)/sales/new/page.tsx`
- **Purpose:** Full administrative checkout and invoice creation interface for retail counter sales. Supports line items with real-time tax derivation, serial number assignment, customer lookup/creation, forward/reverse pricing, and print dispatch.
- **Key Exports:**
  - `default function CreateSalePage()`: Screen controller.
  - `type InvoiceLineForm`: Line item state.
- **Inputs & Outputs:**
  - Props: None.
  - Output: Multi-card billing workstation (Customer Details Card, Itemized Bill Card with forward/reverse calculation toggles, Payment & Notes Card, Print Progress Modal).
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (`PageHeader`, `Card`, `Input`, `Select`, `Button`, `Textarea`, `PrintProgressModal`), `@/components/customers/CustomerTypeahead`, `@/components/inventory/SerialSelectionDropdown`, `@/lib/invoiceClient` (`openInvoicePrint`), `@/utils/formatDate`.
  - External: `@repairshop/shared` (`formatCurrency`, `Customer`, `forwardCalcLine`, `reverseCalcLineFromTotal`, `recalcBill`, `reverseCalcBillFromGrandTotal`, `roundMoney`, `LineItem`), `lucide-react`.
  - Database: Calls RPC `public.create_invoice_v2` and RPC `public.preview_invoice_v2`. Queries `customers`, `inventory`, `products`.
- **Side Effects:**
  - Provisions invoices atomically via stored procedure.
  - Claims inventory unit serials.
  - Opens direct browser print dialog via hidden iframe (`openInvoicePrint`).
- **Callers:**
  - Next.js route: `/sales/new`.
- **Observations / Debt:**
  - Dual Math Engine: Utilizes `@repairshop/shared` for instant client-side math feedback, then confirms calculations with database RPC `preview_invoice_v2` or `create_invoice_v2` before persisting, guaranteeing exact currency rounding.

---

### `admin-panel/src/app/(admin)/pending-payments/page.tsx`
- **Purpose:** Central accounts receivable dashboard grouping outstanding customer balances across both jobs and counter sales. Enables payment recording, WhatsApp balance reminders, and customer ledger inspection.
- **Key Exports:**
  - `default function PendingPaymentsPage()`: Dashboard component.
- **Inputs & Outputs:**
  - Props: None.
  - Output: Aggregate summary cards (Total Outstanding Receivable, Customers with Balance, Partially Paid Count), grouped customer accordion cards listing unpaid invoices, and payment recording modal.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (`PageHeader`, `StatCard`, `SearchFilterBar`, `Button`, `Badge`, `Modal`, `Input`, `Select`, `Textarea`, `EmptyState`, `Skeleton`), `@/utils/formatDate`.
  - External: `@tanstack/react-query`, `@repairshop/shared` (`formatCurrency`, `useDebounceValue`), `lucide-react`.
  - Database: Calls RPC `public.get_pending_invoices` (filtered via database partial index). Calls RPC `public.record_payment`.
- **Side Effects:**
  - Triggers WhatsApp balance reminders via `https://wa.me/...`.
  - Records payments via stored procedure, updating invoice status and ledger entries.
- **Callers:**
  - Next.js route: `/pending-payments`.
- **Observations / Debt:**
  - Optimized Engine Query: Backed by `get_pending_invoices()` RPC and partial index `idx_invoices_pending_balance ((grand_total - amount_paid))`, eliminating slow client-side filtering.

---

## 3. Mobile Application (`RepairShopApp`)

### `RepairShopApp/src/screens/receptionist/BillingScreen.tsx`
- **Purpose:** Receptionist mobile screen for generating invoices for completed repair jobs. Pulls parts from `job_materials`, fetches labor charge from `job_types`, allows discount application, derives GST, and records initial payment.
- **Key Exports:**
  - `default function BillingScreen()`: Mobile job billing workflow.
- **Inputs & Outputs:**
  - Props: Route parameter `{ jobId: string }`.
  - Output: Step 1: Review Job & Parts Summary; Step 2: Itemized Bill Table with quantity, rate, tax percent, discount, payment method, and PDF generator trigger.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (`AppHeader`, `AppPressable`, `Button`, `SkeletonList`, `ErrorState`), `@/components/billing/*` (`ItemizedBillTable`, `ItemizedBillTotals`, `PaymentRecordingBox`), `@/context/ToastContext`, `@/context/PdfProgressContext`, `@/tokens`.
  - External: `@repairshop/shared` (`formatCurrency`, `createWhatsAppUrl`, `calculateBillingTotals`, `reverseCalcBillFromGrandTotal`), `lucide-react-native`.
  - Database: Queries `jobs`, `job_materials`, `invoices`, `job_types`. Calls RPC `create_invoice_v2` and `record_payment`.
- **Side Effects:**
  - Generates on-device PDF via Expo Print (`PdfProgressContext`).
  - Launches native WhatsApp client with pickup and bill summary text.
- **Callers:**
  - Receptionist Navigation: Opened from `JobDetailScreen.tsx` when status is `Completed`.
- **Observations / Debt:**
  - Strict Receptionist Scoping: Receptionist can create and view billing for jobs, but cannot view staff salary or overall shop financial reports.

---

### `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx`
- **Purpose:** Receptionist counter sale intake screen on mobile. Enables walk-in customer checkout for retail items (chargers, cables, screens, accessories) with camera barcode scanning and instant thermal printing.
- **Key Exports:**
  - `default function NewSaleScreen()`: Mobile counter sale screen.
- **Inputs & Outputs:**
  - Props: None (Receptionist Stack).
  - Output: Stepper form (Customer Intake -> Product Selection & Quantity -> Payment & Print).
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/context/ToastContext`, `@/context/PdfProgressContext`, `@/context/AppConfigContext`, `@/tokens`, `@/components/common/*` (`AppHeader`, `Button`, `AppPressable`), `@/components/sales/*` (`SaleCustomerForm`, `SaleItemsList`, `SaleSuccessCard`), `@/components/billing/*` (`ItemizedBillTable`, `ItemizedBillTotals`).
  - External: `@repairshop/shared` (`createWhatsAppUrl`, `formatCurrency`, `calculateBillingTotals`, `reverseCalcBillFromGrandTotal`), `lucide-react-native`.
  - Database: Calls RPC `public.create_invoice_v2`.
- **Callers:**
  - Receptionist Stack: Bottom tab or Quick Action bar.

---

### `RepairShopApp/src/screens/shared/PendingPaymentsScreen.tsx`
- **Purpose:** Shared mobile accounts receivable screen (accessible by Admins and Receptionists) for tracking customer dues and collecting outstanding balances in the field or at the front desk.
- **Key Exports:**
  - `default function PendingPaymentsScreen()`: Screen component.
- **Inputs & Outputs:**
  - Props: None.
  - Output: List of customers with unpaid balances, expandable to view underlying job or counter sale invoices, with payment recording drawer.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/ToastContext`, `@/tokens`, `@/components/common/*` (`AppHeader`, `EmptyState`, `SkeletonList`, `BottomSheet`).
  - External: `@repairshop/shared` (`formatCurrency`, `createWhatsAppUrl`, `formatDate`), `lucide-react-native`.
  - Database: Calls RPC `public.get_pending_invoices` and `public.record_payment`.

---

## 4. Shared Document & Pricing Engine (`packages/shared`)

### `packages/shared/src/billing.ts`
- **Purpose:** Core financial and mathematical calculation engine. Guarantees 100% calculation parity between Web, Mobile, and Edge Functions.
- **Key Exports:**
  - `export function calculateGrandTotal(partsTotal, labourCharge, taxPercent, discount): number`: Implements the canonical formula:
    `grand_total = (parts_total + labour_charge) * (1 + tax_percent / 100) - discount`
  - `export function forwardCalcLine(quantity, rate, taxPercent, taxMode)`: Computes taxable amount, tax amount, and line total from given rate.
  - `export function reverseCalcLineFromTotal(quantity, total, taxPercent, taxMode)`: Computes base rate and taxable amount backward from a tax-inclusive customer price.
  - `export function reverseCalcBillFromGrandTotal(items, targetGrandTotal, taxPercent, discount)`: Prorates line item prices backward from a rounded target total.
  - `export function roundMoney(value: number): number`: Rounds currency values strictly to 2 decimal places using `Math.round(v * 100) / 100`.
  - `export function derivePaymentStatus(amountPaid, grandTotal)`: Returns `'paid'` (if paid >= total), `'partial'` (if paid > 0), or `'draft'`.
- **Observations / Debt:**
  - Rigorously Unit-Tested: Covered by 45+ test assertions in `packages/shared/src/billing.test.ts`.

---

## 5. Database Schema, RPCs & Edge Functions (`supabase`)

### Database Tables (`public`)

| Table Name | Key Columns & Types | Referenced By | Permitted Operations |
|---|---|---|---|
| `public.invoices` | `id` (uuid, PK), `invoice_code` (text, UNIQUE, seq INV-YYYY-XXXX), `job_id` (uuid, FK jobs, nullable), `customer_id` (uuid, FK customers), `customer_name` (text), `customer_contact` (text), `customer_email` (text), `customer_gstin` (text), `tax_regime` (text: 'intra_state'/'inter_state'/'legacy'), `subtotal` (numeric), `tax_amount` (numeric), `total_cgst` (numeric), `total_sgst` (numeric), `total_igst` (numeric), `discount` (numeric), `round_off` (numeric), `grand_total` (numeric), `amount_paid` (numeric), `payment_method` (text), `status` (text: 'draft'/'paid'/'partial'/'cancelled'), `paid_at` (timestamptz), `created_by` (uuid, FK users). | `SalesPage.tsx`, `BillingScreen.tsx`, `PendingPaymentsPage.tsx`, `record_payment`. | SELECT, INSERT, UPDATE |
| `public.invoice_items` | `id` (uuid, PK), `invoice_id` (uuid, FK invoices, cascade), `product_id` (uuid, FK products), `item_name` (text), `quantity` (numeric), `selling_rate` (numeric), `taxable_amount` (numeric), `tax_percent` (numeric), `cgst_rate` (numeric), `cgst_amount` (numeric), `sgst_rate` (numeric), `sgst_amount` (numeric), `igst_rate` (numeric), `igst_amount` (numeric), `line_total` (numeric), `serial_number` (text). | `CreateSalePage.tsx`, `BillingScreen.tsx`, `generate-invoice`. | SELECT, INSERT, UPDATE, DELETE |
| `public.customer_ledgers` | `id` (uuid, PK), `customer_id` (uuid, FK), `transaction_type` (text: 'invoice'/'payment'/'credit_note'), `reference_id` (uuid), `reference_code` (text), `debit` (numeric), `credit` (numeric), `running_balance` (numeric), `created_at` (timestamptz). | `CustomerLedgerModal.tsx`, `record_payment`. | SELECT, INSERT |

---

### Stored Database Functions (RPCs)

1. `public.create_invoice_v2(p_customer_name, p_customer_contact, ..., p_items jsonb)`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`.
   - **Returns:** `jsonb` (`{ success: true, invoice_id, invoice_code, grand_total }`).
   - **Logic:** Atomic procedure that verifies caller authorization, inserts invoice record, inserts itemized rows, links serials via `claim_invoice_serials`, updates inventory stock quantities, logs ledger debit entry, and commits transaction.
   - **Callers:** Web `CreateSalePage.tsx:415`, Mobile `BillingScreen.tsx:430`, `NewSaleScreen.tsx:320`.

2. `public.record_payment(p_invoice_id uuid, p_amount numeric, p_payment_method text, p_notes text)`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`.
   - **Logic:** Enforces role boundary (Admin & Receptionist only), locks target invoice row (`FOR UPDATE`), bounds-checks payment amount (`0 <= amount <= grand_total`), updates `amount_paid` and `status` (`'paid'` vs `'partial'`), sets `paid_at`, and appends credit entry into customer ledger.
   - **Callers:** Web `PendingPaymentsPage.tsx:340`, Mobile `BillingScreen.tsx`, `PendingPaymentsScreen.tsx`.

3. `public.get_pending_invoices(p_search text, p_limit int, p_offset int)`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`, `STABLE`.
   - **Returns:** Table of unsettled invoices with computed balance (`grand_total - amount_paid`).
   - **Callers:** Web `PendingPaymentsPage.tsx`, Mobile `PendingPaymentsScreen.tsx`.

---

### Supabase Edge Functions

1. `supabase/functions/generate-invoice/index.ts`
   - **Trigger:** Authenticated HTTP POST request from Web or Mobile clients.
   - **Purpose:** Renders dynamic SVG-in-HTML invoice documents using the master visual layout template, embeds line items, tax breakdowns, and payment QR codes, and uploads the generated document to Google Drive under `Invoices/{YYYY}/{Month}/`.
   - **Authentication:** Valid Supabase Auth JWT.
   - **Returns:** `{ html: string, driveLink: string | null }`.

2. `supabase/functions/send-invoice-email/index.ts`
   - **Trigger:** Client invocation via Web Admin or Mobile Receptionist dashboard.
   - **Purpose:** Sends branded invoice PDF/HTML to the customer's email via Resend API (`RESEND_API_KEY`). Enforces rate-limiting (maximum 1 email per job per 60 seconds) and logs send event to `public.notifications`.

---

## 6. Module Findings & Technical Debt Log (Billing & Sales)

| ID | File / Location | Severity | Category | Description |
|---|---|---|---|---|
| **F-BIL-01** | `admin-panel/src/components/jobs/detail/JobBillingCard.tsx:229-245` | **HIGH** | Stored Procedure Bypass | While invoice creation strictly uses `create_invoice_v2`, invoice edits in `JobBillingCard.tsx` execute direct client-side `UPDATE` on `public.invoices` and raw `DELETE`/`INSERT` on `public.invoice_items`. This bypasses stock restoration and serial releasing triggers. |
| **F-BIL-02** | `supabase/functions/generate-invoice/index.ts:3` | **MEDIUM** | Branding Artifact | The invoice rendering Edge Function is documented as using `digitalsolution_bill_templete.svg` rather than standard project branding `RepairShop`. |
| **F-BIL-03** | `packages/shared/src/jobCardTemplate.ts:75-83` | **LOW** | Hardcoded Defaults | Invoice print headers and default GST terms contain static placeholder business details rather than reading dynamically from the database company settings table. |
| **F-BIL-04** | `admin-panel/src/app/(admin)/sales/page.tsx:84-89` | **MEDIUM** | Query Scalability | Filtering invoices by item serial number performs an unbounded search on `invoice_items`, passing array of matched UUIDs into `invoices.in()`. If thousands of items match a common character sequence, query performance degrades. |
| **F-BIL-05** | `RepairShopApp/src/screens/receptionist/BillingScreen.tsx:94-96` | **LOW** | Defensive Fallback | Tax rate detection in mobile billing falls back to `18%` if both `tax_percent` and `cgst/sgst` rates are null, which could produce unexpected tax calculations for tax-exempt services. |
