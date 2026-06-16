# Anu Fashions — UI Rebuild Design Spec

**Date:** 2026-06-09
**Status:** Approved

## Overview

Full rebuild of the `apps/web` React frontend to deliver a production-quality business management UI for Anu Fashions. The backend API and database schema are already complete; this spec covers the frontend only.

**Decisions made:**
- Visual style: Earthy Green & Terracotta (existing brand colours — `#7f8a44`, `#c85a30`)
- Add/Edit form presentation: Centred modal (pop-up with dimmed backdrop)
- Dashboard layout: Sections with trend arrows (↑↓ on KPI cards)
- Price ranges: User-defined bands + auto-assignment based on selling price

## 1. Design System

Build a shared component library before any page work. All components live in `apps/web/src/components/`.

### Colour Tokens (`tailwind.config.ts`)
Extend existing brand tokens:
- `brand-50` through `brand-900` — earthy green scale
- `terra-50` through `terra-700` — terracotta scale
- Use existing token values already in the codebase

### Core Components

| Component | Location | Purpose |
|---|---|---|
| `StatCard` | `components/ui/stat-card.tsx` | KPI card with label, value, trend arrow (↑↓), coloured left border |
| `Modal` | `components/ui/modal.tsx` | Centred overlay with backdrop blur, title, close button, scrollable body |
| `FormField` | `components/ui/form-field.tsx` | Label + input/select/textarea + Zod error message wrapper |
| `DataTable` | `components/ui/data-table.tsx` | Sortable columns, search input, pagination, empty state |
| `PageHeader` | `components/ui/page-header.tsx` | Page title, subtitle, right-side action buttons slot |
| `ImageUpload` | `components/ui/image-upload.tsx` | File picker with base64 preview thumbnail |
| `Toast` | `components/ui/toast.tsx` | Success/error notification, auto-dismiss |

### Patterns
- All forms use **React Hook Form + Zod** validation. Errors shown inline below each field.
- All modals use a global Zustand modal store (`store/modal.ts`) — `open(id)` / `close()`.
- All charts use **Recharts** (already installed).
- Toast notifications fire on every successful save or API error.

## 2. Master Data Pages

All three pages share the same layout pattern: `PageHeader` + `DataTable` with an "+ Add" button that opens a `Modal`.

### Categories (`/categories`)
Route added to `App.tsx`. Nav item added to `app-shell.tsx`.

**Table columns:** Name · Description · Status (Active/Inactive badge) · Item Count · Actions (Edit, Delete)

**Add/Edit modal fields:**
- Name (required, unique)
- Description (optional)
- Status toggle (Active / Inactive)

### Price Ranges (`/price-ranges`)
Route and nav item added.

**Table columns:** Name · Min Price · Max Price · Items in Range · Actions

**Add/Edit modal fields:**
- Name (required, e.g. "Budget", "Premium")
- Min price (₹, required)
- Max price (₹, required, must be > min)

**Auto-assignment:** When a price range is saved (created or updated), the API re-evaluates all products and updates their `priceRangeId` where `sellingPrice` falls within the band. Products can also have their price range manually overridden in the item form.

### Customers (`/customers`)
Replaces existing `MastersPage mode="customers"`. Same layout pattern as other master pages.

**Table columns:** Name · Phone · Address · Total Spend · Actions

**Add/Edit modal fields:** Name (required), Phone, Address (optional)

### Suppliers (`/suppliers`)
Replaces existing `MastersPage mode="suppliers"`.

**Table columns:** Name · Phone · Email · Address · Outstanding Payments · Actions

**Add/Edit modal fields:**
- Name (required)
- Phone, Email, Address (optional)
- Notes (optional textarea)

## 3. Products Page (`/products`)

### Filter Bar
- Text search: name, code, barcode
- Category filter (dropdown)
- Price range filter (dropdown)
- Stock status filter: All / In Stock / Low Stock / Out of Stock
- Supplier filter (dropdown)

### Table Columns
Code · Name · Category · Price Range · Buy Price · Sell Price · Margin ₹ · Margin % · Qty · Discount Limit · Stock Status · Actions (Edit, Delete)

### Summary Bar (above table)
Total items · Low stock count (amber badge) · Out of stock count (red badge) · Total inventory value

### Add / Edit Item Modal

**Required fields:**
- Title / Name
- Category (select dropdown — with inline "Add new" link)
- Purchase price (₹)
- Selling price (₹)
- Quantity

**Optional fields:**
- Supplier (select dropdown)
- Price range (auto-set from selling price; can be manually overridden)
- Discount limit % (max % discount allowed at POS — enforced in sales)
- MRP (₹)
- Colour, Size, Material (text inputs)
- Images (file upload with preview thumbnails; stored as base64 data URL in the existing `image_url` DB column — no separate file server needed)
- Notes (textarea)

**Live margin preview:** Inside the modal, as purchase price and selling price are typed, a live inline display shows:
- Margin: ₹ amount
- Profit: % percentage

## 4. Analytics Dashboard (`/`)

### KPI Cards (4-column grid on desktop, 2-column on mobile)
Each `StatCard` shows a coloured left border accent, label, value, and a trend line (% change vs previous month where calculable):

| Card | Accent Colour |
|---|---|
| Total Investment | brand (green) |
| Total Inventory Value | brand (green) |
| Total Revenue | terra (terracotta) |
| Total Profit | terra (terracotta) |
| Monthly Profit | brand (green) |
| Today's Sales | terra (terracotta) |
| Stock Remaining | slate |
| Net Profit (after expenses) | terra (terracotta) |

### Investment Recovery Progress
Prominent full-width card below KPIs. Gradient progress bar (green to light green), percentage label, and "₹X remaining to recover" text.

### Charts (2-column grid on desktop)
1. **Daily Sales Trend** — AreaChart, last 30 days, green fill
2. **Category-Wise Profit** — BarChart, terracotta bars
3. **Inventory Distribution** — PieChart, multi-colour by category
4. **Top Selling Products** — ranked list with quantity sold

### Additional Analytics Panels
5. **Margin Analysis by Price Range** — BarChart showing avg margin % per range
6. **Low Stock Alerts** — compact list of items with qty ≤ 5, links to edit

## 5. Sales Page (`/sales`) — Polish Pass

The existing POS layout is kept. Additions:
- Discount limit enforcement: when a discount is entered that exceeds the item's `discountLimit`, show a warning badge (does not block sale, just warns)
- Customer selector (optional, existing customer list)
- Cart shows margin per item (owner visibility)

## 6. Navigation Updates

Add to `app-shell.tsx` nav:
- Categories (`/categories`) — Tag icon
- Price Ranges (`/price-ranges`) — Layers icon

Remove the separate "Masters" route; Customers and Suppliers become their own routes.

## 7. Build Order

1. **Design tokens + component library** — StatCard, Modal, FormField, DataTable, PageHeader, ImageUpload, Toast
2. **Masters pages** — Categories, Price Ranges, Suppliers (all use same pattern)
3. **Products page** — Add/Edit modal with all fields + live margin preview, filterable table
4. **Dashboard rebuild** — KPI cards with trends, all charts, alerts panel, margin analysis
5. **Sales page polish** — discount limit warning, customer selector, per-item margin in cart

## 8. Out of Scope

- Backend API changes (schema and endpoints are already complete)
- PWA (`apps/pwa`) — separate concern
- Authentication flow changes
- Reports page — existing page kept as-is
- Expenses page — existing page kept as-is
