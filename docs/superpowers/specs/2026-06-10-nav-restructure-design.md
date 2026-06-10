# App Restructure — Navigation Consolidation Spec

**Date:** 2026-06-10
**Status:** Approved

## Overview

Consolidate the Anu Fashions app from 10+ nav items to 6 clean sections. Pure frontend restructure — no backend changes required except adding `imageUrl` to the purchases/invoices API call (already supported via the products `imageUrl` pattern).

---

## 1. New Navigation (6 items)

| Route | Label (EN) | Label (TE) | Icon |
|---|---|---|---|
| `/` | Sell | అమ్మకం | ShoppingCart |
| `/stock` | My Stock | నా సరుకు | Box |
| `/invoices` | Bills & Invoices | బిల్లులు | Receipt |
| `/suppliers` | Suppliers | సరఫరాదారులు | Truck |
| `/categories` | Categories | రకాలు | Tag |
| `/overview` | Overview | సారాంశం | LayoutDashboard |

**Removed from nav** (routes still exist but not shown): `/dashboard`, `/products`, `/purchases`, `/add-stock`, `/price-ranges`, `/customers`, `/expenses`, `/reports`

---

## 2. My Stock Page (`/stock`)

Single page with two tabs: **Add New** and **View All**.

### "Add New" tab
Exact same flow as existing `add-stock-page.tsx`:
- Step 1: Pick supplier
- Step 2: Add category groups (each with category name + chip selector from existing categories)
- Step 3: Items per category (Title, Buy Price, Sell Price, Max Discount, Quantity)
- Submit saves all items to stock

### "View All" tab
Exact same content as existing `products-page.tsx`:
- Filter bar (category, stock status)
- DataTable with all columns
- Edit/Delete per row opens existing modal

**Implementation:** New file `stock-page.tsx` with a `tab` state (`"add" | "view"`). Imports and renders `AddStockPage` content and `ProductsPage` content based on active tab. The existing `add-stock-page.tsx` and `products-page.tsx` are kept as-is and their JSX is inlined into the tabs.

---

## 3. Bills & Invoices Page (`/invoices`)

Replaces the old `purchases-page.tsx` entirely. New file `invoices-page.tsx`.

### Add Invoice form (top of page)
Fields:
1. **Date** — date input, defaults to today
2. **Supplier** — dropdown from existing suppliers
3. **Invoice No** — text input (optional)
4. **Total Bill Amount (₹)** — number input
5. **Bill Photo** — ImageUpload component (base64, stored as `invoiceNo` field or a notes field — see note below)
6. **Items** — multi-row: each row has Product (dropdown from existing stock), Quantity, Cost Price. "Add row" button.

**Note on photo storage:** The existing Purchase model has `invoiceNo: String`. We store the photo as a separate field. Since no schema change is allowed, store the base64 image in a `notes` field on the purchase — but the Purchase model has no `notes` field. Instead, we prefix the `invoiceNo` with a JSON blob approach. **Simpler alternative (chosen):** The bill photo is stored client-side only as a preview — it is shown in the history list from component state after save, but is not persisted to the DB. A `TODO` comment marks it for future S3/file storage.

**What IS persisted:** date, supplierId, invoiceNo, totalAmount, items (productId, quantity, costPrice) — all already supported by the existing `/purchases` API.

### Invoice History list (below form)
Each row shows:
- Date
- Supplier name
- Invoice No
- Total amount
- Number of items
- Actions: none (view only)

The history pulls from `GET /purchases` which already returns `{ purchaseDate, supplier, invoiceNo, totalAmount, items }`.

**Fix existing form bug:** The current `purchases-page.tsx` has unlabelled fields. `invoices-page.tsx` adds proper `<label>` / `FormField` wrappers on every input.

---

## 4. Suppliers Page — Column Fix

Remove `outstandingPayments` column from the DataTable.
Add `productsSupplied` column (label: "Items Supplied").

Form already fixed in previous commit.

---

## 5. Overview Page (`/overview`)

Single page combining Dashboard + Reports. New file `overview-page.tsx`.

### Top section: Key Numbers
8 StatCards (same as current dashboard-page.tsx):
Total Investment, Inventory Value, Total Revenue, Total Profit, This Month Profit, Today's Sales, Stock Left, Net Profit

### Middle section: Investment Recovery
Progress bar (same as dashboard)

### Charts section
4 charts (same as dashboard): Daily Sales Trend, Category Profit, Inventory Distribution, Top Selling Products

### Stock Alerts
Same as dashboard alerts panel

### Bottom section: Download Reports
3 buttons (same as reports-page.tsx): Sales CSV, Inventory Excel, Summary PDF

---

## 6. App.tsx Route Changes

- `/` → SalesPage (unchanged)
- `/stock` → StockPage (new)
- `/invoices` → InvoicesPage (new)
- `/suppliers` → SuppliersPage (fixed, unchanged file)
- `/categories` → CategoriesPage (unchanged)
- `/overview` → OverviewPage (new)
- Keep old routes working: `/products`, `/dashboard`, `/purchases`, `/add-stock`, `/reports` all still render their pages (no 404s)

---

## 7. i18n additions

Add to `src/lib/i18n.ts`:
- `en.myStockTab` = "My Stock" / `te` = "నా సరుకు"
- `en.addNew` = "Add New" / `te` = "కొత్తది చేర్చు"
- `en.viewAll` = "View All" / `te` = "అన్నీ చూడు"
- `en.invoices` = "Bills & Invoices" / `te` = "బిల్లులు & ఇన్వాయిసులు"
- `en.invoiceNo` already exists
- `en.totalBill` = "Total Bill (₹)" / `te` = "మొత్తం బిల్లు (₹)"
- `en.billPhoto` = "Bill Photo" / `te` = "బిల్లు ఫోటో"
- `en.overview` = "Overview" / `te` = "సారాంశం"
- `en.downloadReports` = "Download Reports" / `te` = "నివేదికలు డౌన్లోడ్"
- `en.itemsSupplied` = "Items Supplied" / `te` = "సరఫరా వస్తువులు"

---

## 8. Files Changed

| Action | File |
|---|---|
| Create | `apps/web/src/pages/stock-page.tsx` |
| Create | `apps/web/src/pages/invoices-page.tsx` |
| Create | `apps/web/src/pages/overview-page.tsx` |
| Modify | `apps/web/src/App.tsx` |
| Modify | `apps/web/src/components/layout/app-shell.tsx` |
| Modify | `apps/web/src/pages/suppliers-page.tsx` (column fix) |
| Modify | `apps/web/src/lib/i18n.ts` (new keys) |

---

## 9. Out of Scope

- Bill photo persistence to server (requires file storage infra)
- Price Ranges page removed from nav only (not deleted)
- Expenses page removed from nav only (not deleted)
