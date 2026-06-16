# Sales Analytics — Sub-project A Spec

**Date:** 2026-06-10
**Status:** Approved
**Part of:** Full Analytics Roadmap (A of 3 — Sales, Investment, Supplier Intelligence)

## Overview

Add a "Sales Analytics" section to the Overview page with four interactive charts (category, supplier, item, price-range), controlled by a single date filter. A new backend endpoint `GET /analytics/sales?period=month|year|all` powers all charts.

No schema changes needed — all data exists in `Sale`, `SaleItem`, `Product`, `Category`, `Supplier`, `PriceRange`.

---

## 1. Backend: `GET /analytics/sales`

**File:** `apps/api/src/routes/analytics.ts` — add a new route to the existing `analyticsRouter`.

**Query param:** `period` — `"month"` (default) | `"year"` | `"all"`

**Date filtering logic:**
- `month`: sales where `saleDate >= first day of current month`
- `year`: sales where `saleDate >= Jan 1 of current year`
- `all`: no date filter

**Response shape:**
```json
{
  "categoryWise": [
    { "name": "Silk Sarees", "revenue": 45000, "quantity": 12, "profit": 8200 }
  ],
  "supplierWise": [
    { "name": "Franzil", "revenue": 38000, "quantity": 9, "profit": 6100 }
  ],
  "topItems": [
    { "name": "Kanjivaram Gold Border Saree", "revenue": 14997, "quantity": 3, "profit": 5397 }
  ],
  "priceRangeWise": [
    { "name": "Premium", "revenue": 52000, "quantity": 14, "profit": 9800 }
  ],
  "monthlySalesTrend": [
    { "month": "2026-05", "revenue": 12000, "count": 8 }
  ]
}
```

**Computation:**
- Load all `Sale` records in period, include `items → product → category, supplier, priceRange`
- `categoryWise`: group `SaleItem.lineTotal` and `SaleItem.quantity` by `product.category.name`. Profit = `lineTotal - purchasePrice * quantity`
- `supplierWise`: group by `product.supplier.name` (skip items with no supplier)
- `topItems`: group by `product.name`, sort by `quantity` desc, take top 15
- `priceRangeWise`: group by `product.priceRange.name` (bucket items with no range as "Unclassified")
- `monthlySalesTrend`: same as existing `monthlyRevenueTrend` but includes `count` (number of sales)

Sort all arrays by `revenue` desc before returning.

---

## 2. Frontend: Analytics Section in Overview Page

**File:** `apps/web/src/pages/overview-page.tsx`

### Placement
Insert new section between the **Investment Recovery** card and the **Download Reports** card.

### Date Filter Bar
Three pill buttons in a row:
```
[ This Month ]  [ This Year ]  [ All Time ]
```
- Default selected: This Month
- Tapping a button calls `GET /analytics/sales?period=<value>` and updates all four charts
- Active button: `bg-brand-700 text-white`, inactive: `bg-white border border-brand-200 text-brand-700`

### Chart 1 — Category-wise Sales
`BarChart` (Recharts). Grouped bars: Revenue (brand green) and Quantity (terra red) side by side.
- X-axis: category names
- Y-axis left: ₹ revenue (formatted with `inr()`)
- Y-axis right: quantity (units)
- Tooltip shows: category name, revenue, quantity sold, profit
- Title: "Sales by Category / రకాల వారీగా అమ్మకాలు"

### Chart 2 — Supplier-wise Sales
`BarChart`. Single bar per supplier showing revenue.
- X-axis: supplier names
- Y-axis: ₹ revenue
- Bar color: terra (`#c85a30`)
- Tooltip shows: supplier, revenue, quantity, profit
- Title: "Sales by Supplier / సరఫరాదారు వారీగా"

### Chart 3 — Top Items Sold
`BarChart` horizontal (layout="vertical"). Top 10 items.
- Y-axis: item names (truncated to 20 chars)
- X-axis: quantity sold
- Each bar shows quantity + revenue in tooltip
- Title: "Top Selling Items / అత్యధికంగా అమ్మిన వస్తువులు"

### Chart 4 — Price Range-wise Sales
`PieChart` (donut). Revenue by price range.
- Use existing `PIE_COLORS`
- Center text: "Revenue"
- Legend below
- Title: "Sales by Price Range / ధర గ్రూప్ వారీగా"

### Loading state
Show a single spinner/skeleton while `salesAnalytics` is null. Each chart card gets a minimum height of `h-72` so layout doesn't shift.

### Empty state
If a chart's data array is empty, show: "No sales data for this period" centered in the chart area.

---

## 3. New TypeScript type

Add to `apps/web/src/types/index.ts`:

```ts
export interface SalesAnalytics {
  categoryWise: { name: string; revenue: number; quantity: number; profit: number }[];
  supplierWise: { name: string; revenue: number; quantity: number; profit: number }[];
  topItems: { name: string; revenue: number; quantity: number; profit: number }[];
  priceRangeWise: { name: string; revenue: number; quantity: number; profit: number }[];
  monthlySalesTrend: { month: string; revenue: number; count: number }[];
}
```

---

## 4. Files Changed

| Action | File |
|---|---|
| Modify | `apps/api/src/routes/analytics.ts` — add `/sales` route |
| Modify | `apps/web/src/pages/overview-page.tsx` — add analytics section |
| Modify | `apps/web/src/types/index.ts` — add `SalesAnalytics` type |

No changes to `App.tsx`, `app-shell.tsx`, or any other files.

---

## 5. Out of Scope

- Custom date range picker (month/year/all is sufficient)
- Exporting analytics charts as images
- Sub-projects B (Investment) and C (Supplier Intelligence) — separate specs
