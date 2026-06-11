# Label Layout Editor — Design Spec
Date: 2026-06-11

## Overview
Replace the Excel download option in the Labels drawer with a per-label-size layout editor. Users configure X/Y/size for each field (QR, shop name, item name, code) via a side-panel control grid. The live canvas preview updates instantly. PDF download uses the saved layout. Layout persists in `localStorage` keyed by label size.

---

## Scope

**In scope:**
- Remove all Excel/XLSX code and buttons
- Add "Edit Layout" toggle inside the Labels drawer
- Layout editor: number inputs (mm) for X, Y, font size per field
- Show/hide toggle per field
- Bold toggle for item code
- Live canvas preview that re-renders on every change
- Reset to defaults button (restores wdfx-derived coordinates)
- `localStorage` persistence keyed by `label-layout-{w}x{h}` (e.g. `label-layout-50x30`)
- Switching label size loads that size's saved layout or defaults

**Out of scope:**
- Drag-and-drop repositioning (option B was not chosen)
- Saving named templates
- Price field (excluded by user)
- Category field (not in wdfx template)

---

## Data Model

```ts
type FieldConfig = {
  visible: boolean;
  x: number;   // mm from left
  y: number;   // mm from top
  fontSize: number; // mm
  bold?: boolean;
};

type LabelLayout = {
  qr:       { visible: boolean; x: number; y: number; size: number };
  shopName: FieldConfig;
  itemName: FieldConfig;
  itemCode: FieldConfig; // bold always true
};
```

### Default layout (from wdfx 50×30mm template)
```ts
const DEFAULT_LAYOUT: LabelLayout = {
  qr:       { visible: true,  x: 0.788, y: 1.905, size: 17.842 },
  shopName: { visible: true,  x: 22.685, y: 4.532, fontSize: 3.999 },
  itemName: { visible: true,  x: 22.455, y: 8.464, fontSize: 3.999 },
  itemCode: { visible: true,  x: 21.820, y: 12.117, fontSize: 5.644, bold: true },
};
```

Defaults for other label sizes scale all coordinates proportionally from the 50×30 baseline.

---

## localStorage Persistence

- Key: `label-layout-${w}x${h}` (e.g. `label-layout-50x30`)
- Written: on every input change (debounced 300ms)
- Read: when label size changes or drawer opens
- Format: JSON-serialised `LabelLayout`
- Fallback: if parse fails or key absent, use scaled defaults

---

## UI — Labels Drawer

### Normal mode (no change except Excel removed)
```
[Size selector row]
[Item list — count controls + PDF button + Copy + Preview + Print]
[Footer: Download All PDF]
```

### Layout editor mode (toggled by "Edit Layout" button)
```
[Size selector row]
[Edit Layout ✓ button — active state]

┌─ Live Preview (left ~55%) ──────────────────────┐
│  Canvas rendered at screen scale, all fields     │
│  Re-renders on every input change                │
└──────────────────────────────────────────────────┘

┌─ Field Controls (right ~45%) ───────────────────┐
│  QR Code       [show] x[__] y[__] size[__]       │
│  Shop Name     [show] x[__] y[__] fs[__]         │
│  Item Name     [show] x[__] y[__] fs[__]         │
│  Item Code     [show] x[__] y[__] fs[__] [bold]  │
│                                                   │
│  [Reset to Default]                               │
└──────────────────────────────────────────────────┘
```

On mobile (narrow drawer): preview above, controls below, full width each.

---

## renderLabelCanvas changes

`renderLabelCanvas` receives an additional `layout: LabelLayout` parameter.
It replaces all hard-coded coordinates and font sizes with values from the layout object.
Fields with `visible: false` are simply skipped.

---

## Files to change

| File | Change |
|---|---|
| `label-printer.tsx` | Remove XLSX imports/functions, add `LabelLayout` type, `DEFAULT_LAYOUT` constant, `useLayoutEditor` hook (localStorage R/W), layout editor UI panel, wire `renderLabelCanvas` to layout |
| `package.json` | Remove `xlsx` dependency |

No new files needed — the editor lives entirely inside `label-printer.tsx`.

---

## Error handling
- `localStorage` read wrapped in try/catch; falls back to defaults silently
- Number inputs clamped: x/y min 0, max label dimension; fontSize min 1mm, max 20mm
- QR size min 5mm, max label height

---

## Testing
- Open Labels drawer → Edit Layout → change QR size → confirm preview updates
- Change label size → confirm layout switches (defaults for new size)
- Reload page → confirm layout persists for each size
- Reset → confirm wdfx defaults restored
- Download PDF → confirm PDF uses edited layout
