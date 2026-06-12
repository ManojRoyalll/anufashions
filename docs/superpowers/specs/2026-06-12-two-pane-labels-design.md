# Two-Pane Modal + Per-Item Labels — Design Spec
Date: 2026-06-12

## Problem
1. Side drawers close on outside tap → data loss when adding many stock items
2. Labels drawer shows all products at once — user wants per-item label editing
3. My Stock stats missing total pieces count

---

## Solution Overview
- New `TwoPane` component: centered modal, no backdrop close, two-column layout
- Replace Add Bill and Add Invoice drawers with TwoPane
- Replace global Labels drawer with per-item label button → single-item TwoPane
- Add Total Pieces stat card to My Stock

---

## Component: `TwoPane`

### Props
```ts
type TwoPaneProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
};
```

### Layout
- **Desktop/tablet ≥768px**: side-by-side, each pane scrolls independently
  - Left: 45% width, right: 55% width
  - Left has `overflow-y-auto`, right has `overflow-y-auto`
  - Both fill `max-h-[85vh]`
- **Mobile <768px**: stacked, left on top, right below, single container scroll
- Max width: `max-w-4xl` (896px)
- Centered: `fixed inset-0 flex items-center justify-center p-4`
- Backdrop: **no onClick** — intentional, prevents data loss
- Escape key: closes (keyboard users can still exit)
- Header: title + ✕ button (only way to close apart from explicit Cancel/Save)
- Divider line between panes on desktop

---

## Add Bill (buy-page.tsx)

### Left pane — Action
- Supplier selector (search + new)
- Invoice details accordion (date, invoice no, bill amount, transport, photo)
- Item entry rows (name, code, category, buy ₹, sell ₹, discount %, qty)
- + Add another item button
- Save button (sticky at bottom of left pane)

### Right pane — Display
- **Running totals** at top: Total Investment · Expected Revenue · Expected Profit
- **Items added so far** — one card per valid item showing:
  - Name, category
  - Buy price × qty = subtotal
  - Sell price, profit per piece
- Empty state: "No items yet — fill in the form on the left"
- Right pane updates live as user types in left pane

---

## Add Invoice (invoices-page.tsx)

### Left pane — Action
- Date, invoice no, supplier, total bill amount, bill photo
- Item rows (product select, qty, cost)
- + Add item button
- Save button

### Right pane — Display
- Invoice summary card (supplier, date, total)
- Items list with qty × cost = line total
- Running grand total

---

## Labels (label-printer.tsx)

### Change: per-item, not global
- Remove the "Labels" button from the PageHeader actions
- Add a small **Label** button to each row in the stock table (actions column)
- Clicking it opens a TwoPane for **that specific item only**

### Left pane — Layout Editor
- Label size selector + custom
- Edit Layout toggle
- When editing: QR + field sliders (sticky preview at top of left pane)
- When not editing: count selector (how many labels)
- Download PDF button (sticky at bottom)

### Right pane — Live Preview
- WYSIWYG canvas preview, updates on every layout change
- Shows label at a readable size
- "Tap Download PDF to save" hint

### State
- Layout editor state is per-item (keyed by product id + label size in localStorage)
- QR is generated once per product and cached

---

## My Stock — Pieces Stat Card

Add a fourth stat card between "Low Stock" and "Out of Stock":

```
Total Items | Total Pieces | Inventory Value | Low Stock | Out of Stock
```

`totalPieces = products.reduce((s, p) => s + p.quantity, 0)`

Shown as a plain number with label "Total Pieces".

---

## Files Changed

| File | Change |
|---|---|
| `src/components/ui/two-pane.tsx` | New component |
| `src/pages/buy-page.tsx` | Drawer → TwoPane, right pane shows live item summary |
| `src/pages/invoices-page.tsx` | Drawer → TwoPane, right pane shows invoice summary |
| `src/components/ui/label-printer.tsx` | Per-item label button + TwoPane layout |
| `src/pages/products-page.tsx` | Add Label button to table row, wire to LabelPrinter; add pieces stat card |

`drawer.tsx` unchanged — still used for read-only detail views (purchase history, invoice detail).

---

## Constraints
- No new dependencies
- Mobile must work: stacked layout, full-width panes
- Data must survive accidental taps on backdrop
- Escape key still closes (accessibility)
