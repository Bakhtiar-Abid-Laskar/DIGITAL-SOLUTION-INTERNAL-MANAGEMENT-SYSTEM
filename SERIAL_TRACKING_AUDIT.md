# SERIAL_TRACKING_AUDIT.md
## Technical Audit: Serial-Number-Tracked Inventory & Multi-Item Purchases
**System Scope:** `admin-panel` (Next.js/React/Tailwind), `RepairShopApp` (Expo React Native SDK 54), and `Supabase` (PostgreSQL/RLS/RPC).  
**Date:** September 2026

---

## Executive Summary
This audit investigates the current state of inventory purchases, product catalog linking, sales invoicing, job materials logging, barcode scanning, and serial number handling across the web admin panel and mobile app. It establishes the baseline for designing Phase 1 (Data Model & Migrations) and highlights two critical architectural decision points for confirmation before code implementation.

---

## 1. How Inventory Purchases Are Currently Modeled
### Current Architecture:
- **Table**: `public.purchases` (Migration: `20260821300000_inventory_purchase_intake_module.sql`).
- **Granularity**: **1 purchase record = 1 product line**.
- **Schema**:
  - Primary Key: `id` (UUID)
  - Code: `purchase_code` (e.g. `PO-2026-0001`, sequence-generated)
  - Foreign Keys: `supplier_id` (`suppliers.id`), `product_id` (`products.id`), `inventory_id` (`inventory.id`), `logged_by` (`users.id`)
  - Intake Data: `purchase_date`, `supplier_invoice_number`, `invoice_image_url`, `quantity`, `purchase_rate`, `selling_rate`, `subtotal`, `tax_amount`, `total_amount`, `notes`
- **Intake RPC**: `log_inventory_purchase(...)` takes single-product arguments (`p_product_id`, `p_quantity`, `p_purchase_rate`, etc.), finds/creates the product and inventory record, updates stock (`quantity` & `stock_quantity`), creates an `'IN'` transaction in `inventory_transactions`, and logs to audit tables.
- **Limitation**: If a supplier invoice contains 5 products, staff must submit the modal 5 separate times, generating 5 separate PO codes (`PO-2026-0001` through `PO-2026-0005`). No individual serial numbers are captured or tracked.

### What Must Change:
To support multi-item purchases and unit tracking:
1. **Purchase Order Header vs. Line Items**:
   - `purchases`: Acts as the Purchase Order Header (`purchase_code`, `supplier_id`, `purchase_date`, `supplier_invoice_number`, `invoice_image_url`, `subtotal`, `tax_amount`, `total_amount`, `notes`, `logged_by`).
   - `purchase_items`: Represents each product line item on that purchase order (`purchase_id`, `product_id`, `inventory_id`, `quantity`, `purchase_rate`, `selling_rate`, `tax_percent`, `tax_mode`, `subtotal`, `tax_amount`, `total_amount`, `is_serial_tracked`).
2. **Tracked Unit Serials (`inventory_unit_serials`)**:
   - Individual units tracked per serial number: `serial_number`, `product_id`, `inventory_id`, `purchase_id`, `purchase_item_id`, `status` (`available`, `reserved`, `sold`, `returned`, `damaged`), `sale_item_id`, `job_material_id`.

---

## 2. Supplier Entity Evaluation
- **Status**: **Fully modeled reusable entity.**
- **Table**: `public.suppliers`
- **Fields**: `id`, `name`, `phone`, `phone_clean` (generated stored column stripping non-digits), `email`, `gstin`, `address`, `is_active`, `created_by`, `created_at`, `updated_at`.
- **Existing Helpers**:
  - `find_or_create_supplier(...)` RPC: Matches existing suppliers by explicit ID, clean phone, or trimmed case-insensitive name before creating a new row.
  - `search_suppliers(p_query, p_limit)` RPC: Fast typeahead search.
- **Frontend Components**:
  - Web: `admin-panel/src/components/suppliers/SupplierTypeahead.tsx`
  - Mobile: `RepairShopApp/src/screens/admin/PurchaseIntakeScreen.tsx`
- **Conclusion**: Supplier information is already clean and reusable. No schema changes are needed for suppliers.

---

## 3. Current Sales vs. Job Billing Serial Number Storage
### In Sales (`invoices` / `invoice_items`):
- **Database Column**: `public.invoice_items.serial_number` (`TEXT`, nullable). (Also present on legacy `sale_items.serial_number`).
- **Sales Web UI** (`admin-panel/src/app/(admin)/sales/new/page.tsx`):
  - Line 775: Renders a free-text `<Input placeholder="S/N (opt)" value={item.serial_number} />`.
  - Anyone can type any arbitrary text.
  - Zero validation against existing inventory.
  - Zero guarantee against duplicate sales.
- **Sales Mobile UI** (`RepairShopApp/src/components/sales/SaleItemsList.tsx`):
  - Line 106: Free-text `TextInput` for `serial_number`.

### In Job Billing:
- **Database Column**: `invoice_items` contains `serial_number`, and `jobs.serial_number` stores the customer's device serial number (e.g. MacBook S/N).
- **Job Billing UI** (`JobBillingCard.tsx` on web, `BillingScreen.tsx` on mobile):
  - Line items currently have **no serial number input field at all**.
  - The UI only presents Qty, Price, Tax, and Line Total.
  - While `AdminItemizedLine` has `serial_number?: string | null` in TypeScript, no input component exists to capture or select serials for parts billed to the job.

---

## 4. Materials Logged vs. Itemized Billing on Job Details
### Finding: They are **two genuinely different lists/tables**:
1. **"Materials Logged" (`public.job_materials`)**:
   - Internal operational ledger of parts checked out by technicians for the physical repair.
   - Fields: `id`, `job_id`, `material_name`, `quantity`, `unit_cost`, `total_cost`, `technician_id`, `checkout_status`, `usage_confirmed_at`, `product_id`, `inventory_id`.
   - Managed in `JobMaterialsCard.tsx` (web) and `UpdateWorkScreen.tsx` / `AllottedMaterialsScreen.tsx` (mobile).
2. **"Itemized Billing" (`public.invoice_items` under `public.invoices`)**:
   - Customer-facing financial document with selling prices, tax breakdown (CGST/SGST/IGST), and grand totals.
   - Managed in `JobBillingCard.tsx` (web) and `BillingScreen.tsx` / `ItemizedBillTable.tsx` (mobile).
   - When billing is first opened for a job, default line items are seeded from `job_materials` + labor charges. Once saved, `invoice_items` is the permanent financial record.

### Implication for Phase 4:
Because these are two distinct tables, we must decide whether serial tracking applies to **Itemized Billing only** or to **both Materials Logged and Itemized Billing** (see Decision Point 1).

---

## 5. Catalog Product Linked Autocomplete
- **RPC**: `public.search_products_catalog(p_query, p_limit)`
- **Behavior**:
  - Searches `products.name`, `products.sku`, and `products.hsn_sac` with priority weighting (exact match > prefix match > substring match).
  - Joins `public.inventory` to provide current stock, purchase rate, selling rate, tax rates (`cgst_rate`, `sgst_rate`, `igst_rate`), and location.
- **Reusable Components**:
  - Web: `admin-panel/src/components/inventory/ProductTypeahead.tsx`
  - Mobile: `RepairShopApp/src/components/inventory/ProductTypeaheadMobile.tsx`
- **Integration Pattern**:
  - In `sales/new/page.tsx`, picking a product sets `product_id` and `inventory_id`, locks the product name, pre-fills HSN and tax rates, and renders the green `Catalog Product Linked` badge.
  - **Verdict**: This component and RPC are well-designed and should be directly reused for multi-product purchase entry and serial lookups.

---

## 6. Barcode Scanning Architecture & Hardware Scanners
### A. Mobile App (Expo React Native, SDK 54):
- **Native Camera Scanning**:
  - `expo-camera` (`~17.0.10`) is already installed in `RepairShopApp/package.json` and used for selfies.
  - In Expo SDK 54, `CameraView` features built-in high-performance barcode scanning:
    ```tsx
    <CameraView
      facing="back"
      barcodeScannerSettings={{
        barcodeTypes: ['code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
      }}
      onBarcodeScanned={({ data }) => onScanSuccess(data)}
    />
    ```
  - Zero extra native dependencies needed.

### B. Web App (`admin-panel`, Next.js 16):
- **Camera Scanning**:
  - Use HTML5 native `BarcodeDetector` API where supported (Chrome, Edge, Safari 17+), with an on-demand dynamic import of `@zxing/browser` or `@ericblade/quagga2` as a fallback.
  - Must be dynamically imported via `next/dynamic` so it does not increase initial bundle size (protecting Phase 6 bundle budget).

### C. Hardware Barcode Scanners (USB & Bluetooth HID):
- **How Hardware Scanners Work**:
  - A handheld or desktop barcode scanner operates as an **HID Keyboard Device**.
  - It inputs the decoded string into the focused element within 10–30ms, followed by an `Enter` (or `Tab`) key.
- **Universal Capture Hook (`useHardwareBarcodeScanner`)**:
  - Listen for global `keydown` events.
  - Measure elapsed time between consecutive keystrokes: if average interval `< 35ms` and length `>= 4` ending in `Enter`, classify as a hardware barcode scan.
  - Route the captured barcode to the active entry handler (e.g. append to purchase serials or select from dropdown).
  - Works transparently across Web and Mobile (Android tablets/terminals with USB/Bluetooth scanners).

---

## 7. Audit of All Screens Interacting with Stock & Serials
| Surface / Screen | Component Path | Interaction with Stock / Serials |
|---|---|---|
| **Inventory List (Web)** | `admin-panel/src/app/(admin)/inventory/page.tsx` | Reads `inventory.quantity`, `stock_quantity`, low-stock thresholds. |
| **Inventory List (Mobile)** | `RepairShopApp/src/screens/shared/InventoryScreen.tsx` | Reads cached inventory stock. |
| **Purchase Intake (Web)** | `admin-panel/src/components/inventory/PurchaseIntakeModal.tsx` | Creates single-item purchase; increments stock via `log_inventory_purchase`. |
| **Purchase Intake (Mobile)** | `RepairShopApp/src/screens/admin/PurchaseIntakeScreen.tsx` | Mobile equivalent of single-item purchase intake. |
| **Purchase History (Web)** | `admin-panel/src/components/inventory/PurchaseHistoryTab.tsx` | Displays list of past purchases and codes. |
| **Purchase Detail (Web/Mobile)** | `PurchaseDetailModal.tsx` / `PurchaseDetailModalMobile.tsx` | Displays single purchase details (currently displays 1 product). |
| **Counter Sales (Web)** | `admin-panel/src/app/(admin)/sales/new/page.tsx` | Free-text S/N input; decrements inventory stock upon invoice creation. |
| **Counter Sales (Mobile)** | `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx` | Free-text S/N input; calls `create_invoice_v2` / `create_counter_sale_invoice_v3`. |
| **Sale Detail (Web/Mobile)** | `sales/[id]/page.tsx` / `SaleDetailScreen.tsx` | Displays line items and free-text `serial_number`. |
| **Job Details - Billing (Web)** | `admin-panel/src/components/jobs/detail/JobBillingCard.tsx` | Edits/saves itemized invoice lines. Currently no serial input. |
| **Job Details - Billing (Mobile)**| `RepairShopApp/src/screens/receptionist/BillingScreen.tsx` | Reviews/saves itemized lines. Currently no serial input. |
| **Job Materials (Web)** | `admin-panel/src/components/jobs/detail/JobMaterialsCard.tsx` | Logs parts used on job (`job_materials`). No serials. |
| **Job Materials (Mobile)** | `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx` | Technicians log parts used. No serials. |

---

## Required Decisions Before Phase 2 Implementation

### Decision Point 1: Phase 4 Scope ("Materials Logged" vs. "Itemized Billing")
- **Context**: The audit confirmed that "Materials Logged" (`job_materials`) and "Itemized Billing" (`invoice_items`) are two separate tables.
- **Options**:
  - **Option A (Itemized Billing Only)**: Serial selection is added exclusively to the customer-facing Itemized Billing screen (matching Sales). Technicians continue to log parts by quantity in `job_materials`, and the receptionist/admin selects the specific serialized unit when preparing the invoice.
  - **Option B (Both Materials Logged & Itemized Billing)**: Serial selection is added to `job_materials` (when a technician claims a part on the repair bench) AND to `invoice_items` (when the job is billed). The serial selected in `job_materials` automatically carries forward to `invoice_items`.
- **Recommendation**: **Option A** is the cleanest and mirrors the exact prompt requirement ("The same dropdown-based serial selection gets added to Job Billing"). If technicians also need to scan serials on the bench, Option B can be chosen.

---

### Decision Point 2: Phase 7 Backfill Strategy (Pre-Existing Stock)
- **Context**: Units purchased prior to this feature have no tracked serial records in the database.
- **Options**:
  - **Option A (Recommended - Hybrid Non-Blocking)**: Pre-existing stock remains untracked. On Sales and Job Billing, products with untracked stock can still be sold without forcing serial selection (or showing free-text). We provide an optional "Add Serials" / "Track Existing Stock" modal in the Inventory table so staff can retroactively assign serials to on-hand inventory when convenient.
  - **Option B (Strict Mandatory Backfill)**: Lock sales on all serialized items until staff manually audits and enters serial numbers for every unit currently on hand.
- **Recommendation**: **Option A** prevents stopping daily sales operations while allowing shop staff to progressively serialize existing inventory.
