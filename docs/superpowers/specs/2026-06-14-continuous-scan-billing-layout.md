# Continuous Scan + Billing Layout Fix — Design Spec
Date: 2026-06-14

## Scan Screen

### Trigger
Tapping the scan (📷) button in sales-page opens a full-screen scan overlay (z-50, covers everything).

### Layout
- Top ~50% of screen: live camera viewfinder (existing QRScanner component)
- Below viewfinder: scanned items list (scrollable)
- Sticky bottom: "Add to Bill (N items)" button

### Behaviour
- Camera stays open continuously — no re-tap needed between scans
- Each successful scan: adds item to local scanList state, brief green toast
- Same item scanned again: increments quantity by 1
- Item not found: red toast, camera stays open
- Tap item row: removes it from scanList
- **Add to Bill**: replaces entire cart with scanList, closes scan screen
- **✕ Cancel**: discards scanList, closes screen, cart unchanged

### State
```ts
// Local to scan screen, not shared with main cart
const [scanList, setScanList] = useState<CartItem[]>([]);
```

### Component
New component: `ContinuousScanScreen` — rendered in sales-page when `showScanner=true`.
Receives: `products`, `onDone(items: CartItem[])`, `onCancel()`

---

## Billing Layout Fix

### Bill Summary Card
Positioned just above the sticky Generate Bill bar. Shows:
- Item count
- Subtotal (only if discount > 0)
- Discount with % (only if > 0)
- Divider
- **TOTAL** — large, bold, dominant
- Payment method badge (inline)

### Sticky Bottom Bar
- Just: amount on left, one green Generate Bill button on right
- Total repeated here so it's visible even when scrolled

### What's removed/simplified
- Separate payment method section stays, but its selection is also reflected in the summary card so customer/mom can see confirmed payment at a glance
- No separate total card that previously got lost among equal-weight sections

---

## Files
- `src/pages/sales-page.tsx` — main changes
- `src/components/ui/qr-scanner.tsx` — no changes needed (ContinuousScanScreen uses it internally)
- New component inline in sales-page or extracted to `src/components/ui/continuous-scan.tsx`
