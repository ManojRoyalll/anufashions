# Telugu + Simplified UI Redesign — Spec

**Date:** 2026-06-09
**Status:** Approved

## Overview

Simplify the Anu Fashions app for a non-technical home saree business user (owner's mother). Add bilingual support (English / Telugu) with a one-tap toggle. Make "Sell" the home page. Simplify all labels, page names, and the add-stock flow.

No backend changes required — this is a pure frontend change.

---

## 1. Language System

### Translation Store
- A single file `src/lib/i18n.ts` exports two translation objects: `en` and `te`.
- A Zustand store `src/store/lang.ts` holds `lang: "en" | "te"` and a `toggle()` function.
- Language preference is persisted to `localStorage` so it survives page reloads.
- A custom hook `useLang()` returns the active translation object — every component calls this to get labels.

### EN/తె Toggle
- Lives in the top header bar (inside `app-shell.tsx`) next to the app name.
- A pill button: active language highlighted in brand-700 green, inactive in plain text.
- Switching is instant — no page reload needed.

### Translation Coverage
Every visible string in the app is translated. Numbers, prices (₹), and dates are not translated.

**Full word list (English → తెలుగు):**

| English | Telugu |
|---|---|
| Sell | అమ్మకం |
| Dashboard | సారాంశం |
| My Stock | నా సరుకు |
| Bought Stock | కొన్న సరుకు |
| Suppliers | సరఫరాదారులు |
| Types | రకాలు |
| Price Groups | ధర గుంపులు |
| Reports | నివేదికలు |
| Buy Price | కొన్న ధర |
| Sell Price | అమ్మే ధర |
| Profit | లాభం |
| Quantity / Pieces | పీసులు |
| Discount | తగ్గింపు |
| Max Discount | గరిష్ట తగ్గింపు |
| Supplier | సరఫరాదారు |
| Total | మొత్తం |
| Stock | సరుకు |
| Today | ఈ రోజు |
| This Week | ఈ వారం |
| This Month | ఈ నెల |
| Generate Bill | బిల్లు తయారు చేయి |
| Add to Bill | బిల్లుకు చేర్చు |
| Save | సేవ్ చేయి |
| Cancel | రద్దు చేయి |
| Delete | తొలగించు |
| Edit | మార్చు |
| Add | చేర్చు |
| Search | వెతుకు |
| Name | పేరు |
| Photo | ఫోటో |
| Payment | చెల్లింపు |
| Cash | నగదు |
| UPI | యూపీఐ |
| Card | కార్డు |
| Low Stock | తక్కువ సరుకు |
| Out of Stock | సరుకు లేదు |
| In Stock | సరుకు ఉంది |
| Description | వివరణ |
| Notes | గమనికలు |
| Welcome | స్వాగతం |
| Logout | నిష్క్రమించు |
| Loading... | లోడవుతోంది... |
| No records found | రికార్డులు లేవు |
| Today's Sales | ఈ రోజు అమ్మకాలు |
| Sale saved | అమ్మకం సేవ్ అయింది |
| Item added | వస్తువు చేర్చబడింది |
| Error saving | సేవ్ చేయడంలో లోపం |
| Min Price | కనిష్ట ధర |
| Max Price | గరిష్ట ధర |
| Items | వస్తువులు |
| Active | చురుకుగా ఉంది |
| Inactive | నిష్క్రియంగా ఉంది |

---

## 2. Navigation Rename + Reorder

The sidebar nav is reordered with "Sell" first and renamed for simplicity:

| Route | Old Label | New Simple English | New Telugu |
|---|---|---|---|
| `/` | Sales POS | Sell | అమ్మకం |
| `/dashboard` | Dashboard | Dashboard | సారాంశం |
| `/products` | Products | My Stock | నా సరుకు |
| `/purchases` | Purchases | Bought Stock | కొన్న సరుకు |
| `/suppliers` | Suppliers | Suppliers | సరఫరాదారులు |
| `/categories` | Categories | Types | రకాలు |
| `/price-ranges` | Price Ranges | Price Groups | ధర గుంపులు |
| `/reports` | Reports | Reports | నివేదికలు |

Removed from main nav (still accessible but not shown): Customers, Expenses.

Nav labels show both languages simultaneously as small bilingual chips when in either language mode — e.g. "Sell / అమ్మకం". This helps the owner learn both.

---

## 3. App Router Change

`App.tsx` route order: `/` maps to `SalesPage` (the Sell page), not `DashboardPage`. Dashboard moves to `/dashboard`.

---

## 4. Sell Page Redesign (`/`)

The page has two clear sections stacked vertically:

### Top Section: Make a Sale (unchanged logic, simplified labels)
- Search box: "Search saree by name..." / "సారీ పేరు వెతుకు..."
- Product list: shows name, selling price, stock count, max discount %
- Cart: shows each item with quantity control and per-item margin (visible to owner)
- Customer selector: "Walk-in / వచ్చిన కస్టమర్" as default
- Discount (₹) and GST (₹) inputs with plain labels
- Payment method: Cash / UPI / Card
- Bill total summary
- Big prominent "Generate Bill / బిల్లు తయారు చేయి" button (full width, brand green)

### Bottom Section: Sales History
- Title: "Today's Sales / ఈ రోజు అమ్మకాలు"
- Filter tabs: **Today** | **This Week** | **This Month**
  - Default: Today
- Each sale row shows: time, items sold (count), total amount, payment method
- Total sales count + total amount for selected period at the bottom of the list
- This list loads from the existing `/sales` API with date filter params

---

## 5. My Stock Page — Simplified Add Form (`/products`)

The "Add Item / సరుకు చేర్చు" modal is reorganised with friendlier labels and supplier-first ordering:

**Field order and labels:**

1. **Supplier** / సరఫరాదారు — select dropdown (required)
2. **Saree Name** / సారీ పేరు — text input (required)
3. **Type** / రకం — category dropdown (required)
4. **Buy Price ₹** / కొన్న ధర — number input (required)
5. **Sell Price ₹** / అమ్మే ధర — number input (required)
6. **→ Live Profit** / లాభం — auto-calculated, shown in green below sell price
7. **Max Discount %** / గరిష్ట తగ్గింపు — number 0–100
8. **Pieces** / పీసులు — quantity number input (required)
9. **Photo** / ఫోటో — image upload (optional)
10. **Notes** / గమనికలు — textarea (optional)

Product Code and MRP are moved to a collapsible "More Details / మరిన్ని వివరాలు" section — hidden by default to reduce clutter.

---

## 6. All Other Pages — Label Updates Only

Categories (`/categories`), Price Ranges (`/price-ranges`), Suppliers (`/suppliers`), Purchases (`/purchases`), Dashboard (`/dashboard`), Reports (`/reports`) — no layout changes, only label text updated to use the translation system.

---

## 7. Implementation Approach

**Single translation file:** `src/lib/i18n.ts` — one `const translations` object with `en` and `te` keys. No external i18n library needed (keeps it simple and fast).

**`useLang()` hook:** `src/hooks/use-lang.ts` — returns `t` (the active translation object) and `lang` (current language). Every component destructures what it needs: `const { t } = useLang()` then uses `t.sell`, `t.buyPrice`, etc.

**Build order:**
1. `i18n.ts` translation file + `lang.ts` Zustand store + `use-lang.ts` hook
2. Update `app-shell.tsx` — add EN/తె toggle, rename nav items, reorder nav, move Sell to first
3. Update `App.tsx` — swap `/` to SalesPage, `/dashboard` to DashboardPage
4. Redesign `sales-page.tsx` — add sales history section with date filter tabs
5. Simplify `products-page.tsx` — reorder modal fields, add "More Details" collapse, rename labels
6. Update all other pages — apply `useLang()` labels

---

## 8. Out of Scope

- Backend API changes
- SMS/WhatsApp bill sending
- Offline mode
- Customer-facing receipt printing
