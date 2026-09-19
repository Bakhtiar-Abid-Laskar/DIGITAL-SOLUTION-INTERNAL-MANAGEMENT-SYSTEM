# Module 03: Inventory, Purchase Intake & Materials Management

**Module:** Product Catalog, Stock Tracking, Multi-Item Purchase Orders, Serial Tracking, Material Allotments & Reconciliation  
**Surfaces Covered:** Web Admin Panel (`admin-panel`), Mobile App (`RepairShopApp`), Shared Tier (`packages/shared`), Database & Edge Functions (`supabase`)  
**Status:** Audit Complete — Read-and-Document Only

---

## 1. Module Overview & Lifecycle Map

The **Inventory & Materials** module manages workshop supply chains, parts consumption during repairs, and retail sales. It integrates supplier directories, multi-line purchase intake with barcode/serial scanning, automatic inventory quantity synchronization, technician job part allotments, and return reconciliation upon job completion.

```text
[Supplier / Purchase Intake]
       │
       ▼
[Purchase Order Wizard] ────► Step 1: Supplier Info (Typeahead / Create New)
       │                 ────► Step 2: Line Items (Product catalog lookup, tax modes, rates)
       │                 ────► Serial Number Scanner (Hardware Scanner or Camera Viewfinder)
       ▼
[Atomic Submission] ────────► RPC: [public.log_multi_item_purchase]
                                     │
                                     ├── Inserts into [public.purchases] (Code: PO-YYYY-XXXX)
                                     ├── Inserts lines into [public.purchase_items]
                                     ├── Upserts into [public.inventory] (Stock increment)
                                     └── Inserts unit serials into [public.inventory_unit_serials]
                                         (Status: 'available')
       │
       ▼
[Material Allotment to Job]
       │
       ├── Admin / Tech selects parts for Job ──► Inserts into [public.job_materials]
       │                                       ──► Inserts into [public.material_allotments]
       │                                       ──► Trigger [process_inventory_stock_change] (Deducts stock)
       │                                       ──► Webhook Trigger: [Edge Function: notify-on-material-event]
       │                                           (Push alert to assigned technician)
       ▼
[Repair Execution & Usage]
       │
       ├── Parts Used ───────────► recorded in job_materials.used_qty
       └── Unused Parts Returned ─► recorded in job_materials.remaining_qty
       ▼
[Completion Reconciliation] ─► RPC: [public.complete_job_materials]
                                     │
                                     ├── Restores remaining_qty back to [public.inventory]
                                     ├── Updates [public.material_allotments] (status = 'returned')
                                     └── Sets jobs.status = 'Completed'
```

---

## 2. Web Admin Panel (`admin-panel`)

### `admin-panel/src/app/(admin)/inventory/page.tsx`
- **Purpose:** Primary administrative inventory dashboard with dual tabs for Stock Overview and Purchase Order History. Features pagination, search filtering across SKU/name, low-stock highlighting, stock addition modal, and purchase intake wizards.
- **Key Exports:**
  - `default function InventoryPage()`: Main page component.
- **Inputs & Outputs:**
  - Props: None.
  - Output: Tabbed interface (`inventory` / `purchases`). Stock table displays Item Name, SKU, Category, Current Quantity, Purchase Rate, Selling Rate, Margin %, Stock Status badge, and row action menus (Edit, Add Stock, Backfill Serials, Delete).
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (`PageHeader`, `Tabs`, `SearchFilterBar`, `Card`, `Button`, `DataTableSkeleton`, `EmptyState`, `ConfirmationModal`, `Pagination`), `@/components/inventory/*` (`InventoryFormModal`, `PurchaseIntakeModal`, `AddStockModal`, `StockSerialBackfillModal`, `PurchaseHistoryTab`), `@/utils/formatDate`.
  - External: `@repairshop/shared` (`InventoryWithProduct`, `useDebounceValue`, `formatCurrency`), `lucide-react`, `next/navigation`, `next/dynamic`.
  - Database: Queries `inventory` (joined with `products!inner(*)` where `is_active = true`), orders by `products.name`.
- **Side Effects:**
  - Soft-deletes products by updating `products.is_active = false`.
  - Manages modal visibility states for purchase intake, stock adjustment, and serial backfilling.
- **Callers:**
  - Next.js App Router route: `/inventory`.
- **Observations / Debt:**
  - Search query joins across relational tables using Supabase `.or('name.ilike.%...,sku.ilike.%...', { referencedTable: 'products' })`.

---

### `admin-panel/src/components/inventory/PurchaseIntakeModal.tsx`
- **Purpose:** Two-step purchase order modal supporting multi-item inventory receipts, GST tax computation (inclusive vs exclusive), supplier autocompletion, invoice image uploads, and serial number capture via hardware scanners or webcam barcoding.
- **Key Exports:**
  - `default function PurchaseIntakeModal({ onClose, onSuccess }: PurchaseIntakeModalProps)`: Multi-line PO modal.
  - `interface PurchaseLineItemState`: Data structure representing a line item with serial numbers.
- **Inputs & Outputs:**
  - Props: `onClose: () => void`, `onSuccess: () => void`.
  - Output: Stepper modal (Step 1: Supplier & Invoice metadata, Step 2: Dynamic line items with product typeahead, tax mode, quantity, unit rates, and serials list).
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (`Button`, `Input`, `Select`, `CameraBarcodeScannerModal`), `@/components/suppliers/SupplierTypeahead`, `@/components/inventory/ProductTypeahead`, `@/hooks/useHardwareBarcodeScanner`.
  - External: `@repairshop/shared` (`Supplier`, `getImageThumbnailUrl`, `formatCurrency`, `MultiItemPurchaseLinePayload`), `lucide-react`.
  - Database: Calls RPC `public.log_multi_item_purchase` with JSONB items payload.
- **Side Effects:**
  - Intercepts hardware USB barcode scanner keystrokes via `useHardwareBarcodeScanner`.
  - Uploads supplier invoice images to Supabase Storage bucket `invoices` or accepts Google Drive URLs.
  - Generates sequence-driven purchase orders and provisions serial records atomically.
- **Callers:**
  - Triggered via "+ Log Purchase" on `InventoryPage.tsx`.
- **Observations / Debt:**
  - Atomic RPC Design: Utilizes `log_multi_item_purchase` RPC to create supplier, purchase order, line items, and stock increments within a single database transaction, preventing partial data writes if browser closes.

---

### `admin-panel/src/app/(admin)/materials/page.tsx`
- **Purpose:** Workshop materials tracking dashboard monitoring all parts allotted to repair jobs and individual technicians. Displays allotment lifecycle states (`allotted`, `used`, `returned`), cost valuation, and technician return reminders.
- **Key Exports:**
  - `default function MaterialsPage()`: Materials dashboard component.
  - `interface AllottedMaterialRow`: Unified row schema merging `material_allotments` and `job_materials`.
- **Inputs & Outputs:**
  - Props: None.
  - Output: Statistics summary cards (Total Allotted Value, Active Allotments Count, Returned Count, Overdue Count), technician filter dropdown, search bar, and data table.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (`PageHeader`, `StatCard`, `SearchFilterBar`, `DataTable`, `Button`, `Select`, `Badge`), `@/utils/materialsCsv` (`exportMaterialsToCSV`), `@/utils/formatDate`.
  - External: `@repairshop/shared` (`formatCurrency`), `lucide-react`, `next/navigation`.
  - Database: Queries `material_allotments` (joined with `users`, `inventory`, `jobs`, `customers`).
- **Side Effects:**
  - Dispatches return reminders to technicians by calling Edge Function `notify-on-material-event` with `{ action: 'remind_return', allotment_id }`.
  - Exports material movement audit logs to CSV.
- **Callers:**
  - Next.js App Router route: `/materials`.
- **Observations / Debt:**
  - Dual Material Sources: Table synthesizes data from both `material_allotments` and `job_materials` due to historical migration overlaps, requiring complex joining logic.

---

### `admin-panel/src/components/inventory/StockSerialBackfillModal.tsx`
- **Purpose:** Administrative utility modal enabling staff to backfill missing serial numbers for items previously created without serial tracking or under legacy bulk purchases.
- **Key Exports:**
  - `default function StockSerialBackfillModal(...)`: Backfill coordinator.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (`Button`, `Input`).
  - Database: Queries `inventory_unit_serials`, inserts new available serial records.
- **Callers:**
  - Invoked from `InventoryPage.tsx` row action menu.

---

## 3. Mobile Application (`RepairShopApp`)

### `RepairShopApp/src/screens/shared/InventoryScreen.tsx`
- **Purpose:** Mobile inventory catalog and stock lookup screen available to Admins and Receptionists. Provides stock level filtering (`All`, `Low Stock`, `Out of Stock`), infinite scrolling pagination, quick product editing, and purchase history navigation.
- **Key Exports:**
  - `default function InventoryScreen()`: Screen component.
- **Inputs & Outputs:**
  - Props: None (React Navigation).
  - Output: Search bar, status tabs with live badge counters, paginated product list with stock badges, and floating action button to add stock or intake purchases (Admin only).
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/tokens`, `@/components/common/*` (`AppHeader`, `EmptyState`, `SkeletonList`), `@/components/inventory/*` (`InventoryRow`, `InventoryFormSheet`, `PurchaseDetailModalMobile`).
  - External: `@repairshop/shared` (`PurchaseWithDetails`, `formatCurrency`, `formatDate`), `lucide-react-native`.
  - Database: Queries `inventory` joined with `products!inner(*)`.
- **Side Effects:**
  - Realtime subscription: Subscribes to Supabase Realtime channel `inventory-admin-*` on table `inventory`.
- **Callers:**
  - Shared Tab Navigator: Admin and Receptionist bottom navigation tabs.
- **Observations / Debt:**
  - Column Divergence: Tab count query in line 87 selects `quantity_cached`, while other screens query `quantity` or `stock_quantity`, relying on the database trigger `sync_inventory_quantity_cached` to maintain parity.

---

### `RepairShopApp/src/screens/admin/PurchaseIntakeScreen.tsx`
- **Purpose:** Comprehensive standalone mobile screen for logging purchase orders on the workshop floor. Features native camera photo intake for supplier paper invoices, supplier autocompletion, catalog item search, and line item creation.
- **Key Exports:**
  - `default function PurchaseIntakeScreen()`: Full-screen mobile intake workflow.
- **Inputs & Outputs:**
  - Props: None (Admin stack navigation).
  - Output: Stepper form (Supplier details -> Product line items -> Image receipt capture -> Submit).
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/context/ToastContext`, `@/tokens`, `@/utils/compressImage`, `@/utils/supabaseStorage`, `@/components/common/AppHeader`.
  - External: `expo-image-picker`, `expo-image`, `@repairshop/shared` (`Supplier`, `formatCurrency`), `lucide-react-native`.
  - Database: Calls RPC `public.log_multi_item_purchase` or legacy `public.intake_purchase`.
- **Side Effects:**
  - Camera/Gallery: Requests camera roll permissions, opens native image picker, compresses photo, and uploads to storage bucket `invoices`.
- **Callers:**
  - Admin Navigation: Launched from Admin Dashboard or `InventoryScreen.tsx` header button.
- **Observations / Debt:**
  - File Size: Single file contains 1,448 lines of code handling multi-step state, camera integration, and product catalogs. Would benefit from component decomposition into modular sub-cards.

---

### `RepairShopApp/src/screens/technician/AllottedMaterialsScreen.tsx`
- **Purpose:** Technician-facing screen listing materials and spare parts allotted to the logged-in technician for active repair jobs. Enables technicians to view allocated quantities, part numbers, and verify stock in hand.
- **Key Exports:**
  - `default function AllottedMaterialsScreen()`: Screen component.
- **Inputs & Outputs:**
  - Props: Route params `{ jobId?: string; mode?: 'scoped' | 'all' }`.
  - Output: List of assigned parts grouped by job code, with item names, allotted dates, quantities, and return statuses.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/tokens`, `@/components/common/*` (`AppHeader`, `EmptyState`, `LoadingState`).
  - Database: Queries `material_allotments` filtered by `technician_id = auth.uid()`.
- **Callers:**
  - Technician Tab Navigation & Push Notification deep links (`data.screen = 'AllottedMaterialsScreen'`).
- **Observations / Debt:**
  - Role Isolation Enforced: Technicians can only view rows where `technician_id = auth.uid()` via strict Supabase RLS policies.

---

## 4. Shared Utilities & Domain Tier (`packages/shared`)

### `packages/shared/src/types.ts`
- **Purpose:** Domain models and interfaces for the inventory and materials ecosystem.
- **Key Exports:**
  - `export interface Product`: Master catalog model with GST rates, HSN codes, and pricing.
  - `export interface InventoryItem`: Physical workshop stock record with quantity and threshold values.
  - `export interface InventoryWithProduct`: Composite join type of inventory and product master.
  - `export interface MultiItemPurchaseLinePayload`: Contract for RPC `log_multi_item_purchase`.
  - `export interface SerialItem`: Serial tracking structure with status lifecycle.

---

## 5. Database Schema, RPCs & Edge Functions (`supabase`)

### Database Tables (`public`)

| Table Name | Key Columns & Types | Referenced By | Permitted Operations |
|---|---|---|---|
| `public.products` | `id` (uuid, PK), `name` (text), `sku` (text, UNIQUE), `unit` (text), `hsn_sac` (text), `tax_mode` (text), `cgst_rate` (numeric), `sgst_rate` (numeric), `igst_rate` (numeric), `purchase_rate` (numeric), `selling_rate` (numeric), `is_active` (boolean). | `InventoryPage.tsx`, `PurchaseIntakeModal.tsx`, `CreateJobPage.tsx`, `SalesListScreen.tsx`. | SELECT, INSERT, UPDATE, DELETE |
| `public.inventory` | `id` (uuid, PK), `product_id` (uuid, FK products), `quantity` (numeric), `quantity_cached` (numeric), `stock_quantity` (numeric), `low_stock_threshold` (numeric), `minimum_stock_level` (numeric), `location` (text), `updated_at` (timestamptz). | `InventoryPage.tsx`, `InventoryScreen.tsx`, `job_materials` triggers. | SELECT, INSERT, UPDATE |
| `public.inventory_unit_serials` | `id` (uuid, PK), `product_id` (uuid, FK), `serial_number` (text, UNIQUE), `status` (text: 'available'/'allocated'/'sold'/'returned'/'defective'), `purchase_item_id` (uuid, FK), `invoice_item_id` (uuid, FK). | `PurchaseIntakeModal.tsx`, `StockSerialBackfillModal.tsx`, `SerialSelectionDropdown.tsx`. | SELECT, INSERT, UPDATE |
| `public.suppliers` | `id` (uuid, PK), `name` (text), `phone` (text), `phone_clean` (text, generated), `email` (text), `gstin` (text), `address` (text), `is_active` (boolean). | `SupplierTypeahead.tsx`, `PurchaseIntakeModal.tsx`, `PurchaseIntakeScreen.tsx`. | SELECT, INSERT, UPDATE |
| `public.purchases` | `id` (uuid, PK), `purchase_code` (text, UNIQUE, seq PO-YYYY-XXXX), `supplier_id` (uuid, FK), `purchase_date` (date), `supplier_invoice_number` (text), `invoice_image_url` (text), `total_amount` (numeric), `status` (text). | `PurchaseHistoryTab.tsx`, `PurchaseDetailModal.tsx`. | SELECT, INSERT, UPDATE |
| `public.purchase_items` | `id` (uuid, PK), `purchase_id` (uuid, FK), `product_id` (uuid, FK), `quantity` (numeric), `purchase_rate` (numeric), `selling_rate` (numeric), `tax_percent` (numeric), `total_amount` (numeric). | `PurchaseDetailModal.tsx`, `log_multi_item_purchase`. | SELECT, INSERT |
| `public.material_allotments` | `id` (uuid, PK), `job_id` (uuid, FK), `technician_id` (uuid, FK), `product_id` (uuid, FK), `inventory_id` (uuid, FK), `quantity` (numeric), `status` (text: 'allotted'/'used'/'returned'). | `MaterialsPage.tsx`, `AllottedMaterialsScreen.tsx`, `notify-on-material-event`. | SELECT, INSERT, UPDATE |

---

### Stored Database Functions (RPCs)

1. `public.log_multi_item_purchase(p_supplier_id, p_supplier_name, ..., p_items jsonb)`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`.
   - **Logic:** Manages supplier creation/lookup, creates purchase record with code `PO-YYYY-XXXX`, iterates over items to insert `purchase_items`, updates `inventory` stock quantities, and provisions serial numbers in `inventory_unit_serials`.
   - **Callers:** Web `PurchaseIntakeModal.tsx:357`, Mobile `PurchaseIntakeScreen.tsx`.

2. `public.search_available_serials(p_product_id uuid, p_query text, p_limit int)`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`.
   - **Returns:** Table of available serial numbers.
   - **Logic:** Queries `inventory_unit_serials` where `product_id = p_product_id` and `status = 'available'`.
   - **Callers:** `SerialSelectionDropdown.tsx`, `SerialSelectionModalMobile.tsx`.

3. `public.complete_job_materials(p_job_id, p_materials jsonb, p_work_notes, p_technician_id)`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`.
   - **Logic:** Updates `job_materials.used_qty` and `remaining_qty`, restores remaining stock to `inventory`, updates allotment statuses, and marks job completed.
   - **Callers:** Web `MaterialReconciliationModal.tsx`, Mobile `UpdateWorkScreen.tsx`.

---

### Supabase Edge Functions

1. `supabase/functions/notify-on-inventory-change/index.ts`
   - **Trigger:** Database webhook on `UPDATE` to table `inventory`.
   - **Purpose:** Evaluates whether `new.quantity <= new.low_stock_threshold`. If true, fetches product title and dispatches Expo Push Notifications to all active administrators (`Low Stock Alert: [Product] is running low (Qty: X)`).
   - **Authentication:** Webhook signature verification (`APP_WEBHOOK_SECRET`) or service role key.

2. `supabase/functions/notify-on-material-event/index.ts`
   - **Trigger:** Webhook on `INSERT` to `material_allotments` or direct administrative invocation (`action = 'remind_return'`).
   - **Purpose:** Sends immediate push notifications to assigned technicians when parts are allotted to them, or reminds them to return unused parts when a job is marked completed.
   - **Authentication:** Webhook signature or Bearer token.

---

## 6. Module Findings & Technical Debt Log (Inventory & Materials)

| ID | File / Location | Severity | Category | Description |
|---|---|---|---|---|
| **F-INV-01** | `supabase/migrations/20260904120000_fix_inventory_stock_quantity_and_invoice_rpcs.sql:21-40` | **HIGH** | Schema Triplication | `public.inventory` contains three redundant quantity columns: `quantity`, `quantity_cached`, and `stock_quantity`. A database trigger (`sync_inventory_quantity_cached`) fires on every write to synchronize them. Web queries `quantity`, mobile queries `quantity_cached`, and billing RPCs query `stock_quantity`. |
| **F-INV-02** | `supabase/functions/notify-on-material-event/index.ts:44` vs `material_allotments` schema | **MEDIUM** | Relation Alias Ambiguity | Edge function queries `technician:users!material_allotments_technician_id_fkey` and `inventory:inventory(item_name)`. Baseline schema deprecated `inventory.item_name` in favor of `products.name`, which can cause null item names in push notifications if `inventory.item_name` is null. |
| **F-INV-03** | `RepairShopApp/src/screens/admin/PurchaseIntakeScreen.tsx` | **LOW** | Code Maintainability | Screen contains 1,448 lines of code in a single monolithic file, mixing supplier autocomplete, line item calculations, native camera photo capture, and Supabase storage upload logic. |
| **F-INV-04** | `admin-panel/src/components/inventory/StockSerialBackfillModal.tsx:50` | **MEDIUM** | Concurrency Vulnerability | Serial backfill inserts serials with status `'available'` without atomic locking against concurrent purchase order intakes for the same product, creating a minor risk of duplicate serial insertion. |
| **F-INV-05** | `supabase/migrations/20260820100000_allocated_materials_lifecycle.sql:84-86` | **MEDIUM** | Fallback Fragility | Stock deduction trigger falls back to matching by string name: `WHERE lower(item_name) = lower(display_name)` if `inventory_id` is null. If two products have similar or overlapping names, stock may be deducted from the wrong inventory row. |
| **F-INV-06** | `admin-panel/src/app/(admin)/materials/page.tsx:48` | **LOW** | Dual Source Complexity | Web materials dashboard has to manually normalize data from both `material_allotments` and `job_materials`, maintaining two separate query paths in client memory. |
