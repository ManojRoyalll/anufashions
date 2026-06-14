# Sell Page Two-Pane + Single Scan — Design Spec
Date: 2026-06-14

## Layout

### Mobile (< 768px)
Single column, unchanged from current. Sticky bottom bar with total + Bill button.

### Tablet/Desktop (≥ 768px)
Two-column grid: `grid-cols-[55%_45%]`

**Left column (55%)** — scrollable:
- Search input + scan button + Bill button
- Product search results (when searching)
- Cart items
- Discount chips

**Right column (45%)** — fixed height, no scroll, sticky:
- Bill summary: item list with prices, subtotal, discount, TOTAL (large)
- Payment selector (Cash/UPI/Card)
- Customer search + name/phone inputs
- Generate Bill button (full width, prominent)

No sticky bottom bar on tablet/desktop — all action is in the right pane.

## Scanner
Revert to single-scan mode: one tap → camera opens → scans one item → closes → item in cart.
Remove `continuous` prop usage from the scan button.
The separate continuous scan screen (multi-scan session) stays accessible — keep it as the existing behaviour when the scan button is tapped. Actually: simplify — just use `handleQRScan` which closes after one scan. Remove the continuous scan screen entirely to reduce complexity.

## Bill Summary (right pane)
- Each cart item shown as a row: name · qty · line total
- Subtotal line only when discount > 0
- Discount line (amber) only when discount > 0  
- TOTAL in 3xl bold
- Payment selector
- Customer input
- Generate Bill button

## Responsive breakpoint
`md` = 768px (Tailwind default). Tablets in portrait ≥ 768px get the two-pane layout.

## Files
- `src/pages/sales-page.tsx` — full rewrite of layout section
