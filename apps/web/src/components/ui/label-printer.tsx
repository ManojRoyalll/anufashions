import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Settings2, Download, FileText, LayoutTemplate, RotateCcw, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TwoPane } from "@/components/ui/two-pane";
import { Modal } from "@/components/ui/modal";
import { inr } from "@/lib/utils";

type Product = {
  id: string; code: string; name: string;
  sellingPrice: number; quantity: number; category?: { name: string };
};

type LabelSize = { w: number; h: number; label: string };

const LABEL_PRESETS: LabelSize[] = [
  { label: "100×75mm (Josh — Large)",    w: 100, h: 75  },
  { label: "100×50mm (Josh — Standard)", w: 100, h: 50  },
  { label: "100×150mm (Josh — XL)",      w: 100, h: 150 },
  { label: "75×50mm",                    w: 75,  h: 50  },
  { label: "62×38mm",                    w: 62,  h: 38  },
  { label: "50×30mm",                    w: 50,  h: 30  },
];

const DEFAULT_SIZE = LABEL_PRESETS[5]; // 50×30 (Sezink Josh default roll)

// ── LAYOUT TYPE ───────────────────────────────────────────────────────────────
type FieldCfg = { visible: boolean; x: number; y: number; fontSize: number; bold: boolean };
type QrCfg    = { visible: boolean; x: number; y: number; size: number };

type LabelLayout = {
  qr:       QrCfg;
  shopName: FieldCfg;
  itemName: FieldCfg;
  itemCode: FieldCfg;
};

// wdfx-derived defaults for 50×30mm — scale proportionally for other sizes
function defaultLayout(size: LabelSize): LabelLayout {
  const sX = size.w / 50;
  const sY = size.h / 30;
  const sF = Math.min(sX, sY);
  const x  = (mm: number) => Math.round(mm * sX * 10) / 10;
  const y  = (mm: number) => Math.round(mm * sY * 10) / 10;
  const f  = (mm: number) => Math.round(mm * sF * 10) / 10;
  return {
    qr:       { visible: true, x: x(0.788),  y: y(1.905), size: f(17.842) },
    shopName: { visible: true, x: x(22.685), y: y(4.532), fontSize: f(3.999), bold: false },
    itemName: { visible: true, x: x(22.455), y: y(8.464), fontSize: f(3.999), bold: false },
    itemCode: { visible: true, x: x(21.820), y: y(12.117), fontSize: f(5.644), bold: true  },
  };
}

function lsKey(size: LabelSize) { return `label-layout-${size.w}x${size.h}`; }

function loadLayout(size: LabelSize): LabelLayout {
  try {
    const raw = localStorage.getItem(lsKey(size));
    if (raw) return JSON.parse(raw) as LabelLayout;
  } catch { /* ignore */ }
  return defaultLayout(size);
}

function saveLayout(size: LabelSize, layout: LabelLayout) {
  try { localStorage.setItem(lsKey(size), JSON.stringify(layout)); } catch { /* ignore */ }
}

// ── CANVAS RENDERER ───────────────────────────────────────────────────────────
function displayCode(code: string) { return code || "ANU-000"; }
function safeName(name: string)    { return name.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim().replace(/\s+/g, "-") || "label"; }

async function renderLabelCanvas(
  product: Product,
  qrDataUrl: string,
  size: LabelSize,
  layout: LabelLayout,
): Promise<HTMLCanvasElement> {
  const DPI = 300;
  const MM  = DPI / 25.4;

  const W = Math.round(size.w * MM);
  const H = Math.round(size.h * MM);
  const px = (mm: number) => Math.round(mm * MM);

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000";

  // QR
  if (layout.qr.visible && qrDataUrl) {
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise<void>((res) => { qrImg.onload = () => res(); });
    const s = px(layout.qr.size);
    ctx.drawImage(qrImg, px(layout.qr.x), px(layout.qr.y), s, s);
  }

  // Helper: wrap into lines fitting maxPx width
  const wrap = (text: string, font: string, maxPx: number): string[] => {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxPx) return [text];
    const words = text.split(/\s+/);
    const lines: string[] = []; let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(t).width > maxPx && cur) { lines.push(cur); cur = w; }
      else { cur = t; }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const drawField = (cfg: FieldCfg, text: string) => {
    if (!cfg.visible) return;
    const fpx  = px(cfg.fontSize);
    const font = `${cfg.bold ? "bold " : ""}${fpx}px Arial`;
    const maxW = W - px(cfg.x) - px(1.5);
    const lineH = Math.round(fpx * 1.35);
    let y = px(cfg.y);
    for (const line of wrap(text, font, maxW)) {
      ctx.font = font;
      ctx.fillText(line, px(cfg.x), y);
      y += lineH;
    }
  };

  // Special rendering for item code: split ANU and MP parts onto separate lines
  const drawCode = (cfg: FieldCfg, code: string) => {
    if (!cfg.visible) return;
    const fpx   = px(cfg.fontSize);
    const font  = `${cfg.bold ? "bold " : ""}${fpx}px Arial`;
    const lineH = Math.round(fpx * 1.45);
    // Split on ' ' or '-' between ANU and MP sections
    const parts = code.split(/-(?=MP)/).filter(Boolean);
    let y = px(cfg.y);
    ctx.font = font;
    for (const part of parts) {
      ctx.fillText(part, px(cfg.x), y);
      y += lineH;
    }
  };

  drawField(layout.shopName, "Anu Fashions");
  drawField(layout.itemName, product.name);
  drawCode(layout.itemCode, displayCode(product.code));

  return canvas;
}

// ── PDF BUILDER ───────────────────────────────────────────────────────────────
async function generateLabelPDF(
  items: { product: Product; count: number; qr: string }[],
  size: LabelSize,
  layout: LabelLayout,
): Promise<Blob> {
  const MM_TO_PT = 2.8346;
  const pageW = size.w * MM_TO_PT;
  const pageH = size.h * MM_TO_PT;

  const pages: Array<{ canvas: HTMLCanvasElement; jpeg: Uint8Array }> = [];
  for (const { product, count, qr } of items) {
    for (let i = 0; i < count; i++) {
      const canvas = await renderLabelCanvas(product, qr, size, layout);
      const b64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
      pages.push({ canvas, jpeg: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) });
    }
  }
  if (pages.length === 0) return new Blob([], { type: "application/pdf" });

  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const write = (s: string)      => { const b = enc.encode(s); parts.push(b); pos += b.length; };
  const writeB = (b: Uint8Array) => { parts.push(b); pos += b.length; };

  write("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  const N = pages.length;
  const pageBase = 3, contentBase = pageBase + N, imageBase = contentBase + N;

  offsets[1] = pos; write(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  offsets[2] = pos;
  write(`2 0 obj\n<< /Type /Pages /Kids [${Array.from({length:N},(_,i)=>`${pageBase+i} 0 R`).join(" ")}] /Count ${N} >>\nendobj\n`);

  for (let i = 0; i < N; i++) {
    const { canvas, jpeg } = pages[i];
    offsets[pageBase + i] = pos;
    write(`${pageBase+i} 0 obj\n<< /Type /Page /Parent 2 0 R\n/MediaBox [0 0 ${pageW.toFixed(3)} ${pageH.toFixed(3)}]\n/Contents ${contentBase+i} 0 R\n/Resources << /XObject << /Im1 ${imageBase+i} 0 R >> >>\n>>\nendobj\n`);

    const stream = `q ${pageW.toFixed(3)} 0 0 ${pageH.toFixed(3)} 0 0 cm /Im1 Do Q`;
    offsets[contentBase + i] = pos;
    write(`${contentBase+i} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);

    offsets[imageBase + i] = pos;
    write(`${imageBase+i} 0 obj\n<< /Type /XObject /Subtype /Image\n/Width ${canvas.width} /Height ${canvas.height}\n/ColorSpace /DeviceRGB /BitsPerComponent 8\n/Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    writeB(jpeg);
    write(`\nendstream\nendobj\n`);
  }

  const xrefPos = pos;
  const total = imageBase + N;
  write(`xref\n0 ${total+1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= total; i++) write(`${String(offsets[i]??0).padStart(10,"0")} 00000 n \n`);
  write(`trailer\n<< /Size ${total+1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  const out = new Uint8Array(parts.reduce((s,p) => s+p.length, 0));
  let off = 0; for (const p of parts) { out.set(p, off); off += p.length; }
  return new Blob([out], { type: "application/pdf" });
}

// ── CANVAS PREVIEW (WYSIWYG) ─────────────────────────────────────────────────
function CanvasPreview({ product, qr, size, layout }: { product: Product; qr: string; size: LabelSize; layout: LabelLayout }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!qr) return;
    renderLabelCanvas(product, qr, size, layout).then((c) => setSrc(c.toDataURL("image/png")));
  }, [product, qr, size, layout]);
  const maxW = Math.min(size.w * 3.5, 360);
  const maxH = Math.round(maxW * (size.h / size.w));
  return src
    ? <img src={src} style={{ width: maxW, height: maxH, borderRadius: 6, border: "1px solid #ddd", display:"block" }} alt="preview" />
    : <div style={{ width: maxW, height: maxH, background: "#f5f5f0", borderRadius: 6 }} className="animate-pulse" />;
}

// ── SLIDER CONTROL ────────────────────────────────────────────────────────────
// Touch-friendly: slider + − value + buttons. No keyboard input needed.
function SliderControl({
  label, value, min, max, step = 0.5, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)) / step) * step;
  const dec = () => onChange(clamp(value - step));
  const inc = () => onChange(clamp(value + step));
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-brand-700">{label}</span>
        <span className="text-[11px] font-bold text-brand-900 tabular-nums">{value.toFixed(1)} mm</span>
      </div>
      {/* Slider */}
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-brand-100" />
        <div className="absolute h-1.5 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="relative w-full h-1.5 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-700
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-brand-700 [&::-moz-range-thumb]:border-0"
        />
      </div>
      {/* − value + row */}
      <div className="flex items-center gap-2">
        <button onClick={dec} className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-lg font-bold flex items-center justify-center hover:bg-brand-100 active:bg-brand-200 touch-manipulation select-none">−</button>
        <div className="flex-1 text-center text-sm font-bold text-brand-900 bg-brand-50 rounded-xl py-2">{value.toFixed(1)}</div>
        <button onClick={inc} className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-lg font-bold flex items-center justify-center hover:bg-brand-100 active:bg-brand-200 touch-manipulation select-none">+</button>
      </div>
    </div>
  );
}

// ── FIELD ROW ─────────────────────────────────────────────────────────────────
function FieldRow({
  label, cfg, onChange, showBold = false,
  xMax, yMax,
}: {
  label: string;
  cfg: FieldCfg;
  onChange: (c: Partial<FieldCfg>) => void;
  showBold?: boolean;
  xMax: number; yMax: number;
}) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-brand-800">{label}</span>
        <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
          <input type="checkbox" checked={cfg.visible} onChange={(e) => onChange({ visible: e.target.checked })} className="w-4 h-4 accent-brand-700" />
          Show
        </label>
      </div>
      {cfg.visible && (
        <div className="space-y-3">
          <SliderControl label="X position" value={cfg.x} min={0} max={xMax} onChange={(v) => onChange({ x: v })} />
          <SliderControl label="Y position" value={cfg.y} min={0} max={yMax} onChange={(v) => onChange({ y: v })} />
          <SliderControl label="Font size" value={cfg.fontSize} min={1} max={20} onChange={(v) => onChange({ fontSize: v })} />
          {showBold && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={cfg.bold} onChange={(e) => onChange({ bold: e.target.checked })} className="w-4 h-4 accent-brand-700" />
              Bold text
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// ── QR ROW ────────────────────────────────────────────────────────────────────
function QrRow({ cfg, onChange, xMax, yMax }: { cfg: QrCfg; onChange: (c: Partial<QrCfg>) => void; xMax: number; yMax: number }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-brand-800">QR Code</span>
        <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
          <input type="checkbox" checked={cfg.visible} onChange={(e) => onChange({ visible: e.target.checked })} className="w-4 h-4 accent-brand-700" />
          Show
        </label>
      </div>
      {cfg.visible && (
        <div className="space-y-3">
          <SliderControl label="X position" value={cfg.x} min={0} max={xMax} onChange={(v) => onChange({ x: v })} />
          <SliderControl label="Y position" value={cfg.y} min={0} max={yMax} onChange={(v) => onChange({ y: v })} />
          <SliderControl label="Size" value={cfg.size} min={5} max={Math.min(xMax, yMax)} onChange={(v) => onChange({ size: v })} />
        </div>
      )}
    </div>
  );
}

// ── PER-ITEM LABEL PRINTER ────────────────────────────────────────────────────
// One button per stock row. Opens a TwoPane: left = layout editor, right = preview + download.
export function LabelPrinterItem({ product }: { product: Product }) {
  const [open, setOpen]             = useState(false);
  const [editLayout, setEditLayout] = useState(false);
  const [count, setCount]           = useState(product.quantity || 1);
  const [labelSize, setLabelSize]   = useState<LabelSize>(DEFAULT_SIZE);
  const [customW, setCustomW]       = useState(String(DEFAULT_SIZE.w));
  const [customH, setCustomH]       = useState(String(DEFAULT_SIZE.h));
  const [showCustom, setShowCustom] = useState(false);
  const [layout, setLayout]         = useState<LabelLayout>(() => loadLayout(DEFAULT_SIZE));
  const [qr, setQr]                 = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => { saveLayout(labelSize, layout); }, [layout, labelSize]);

  const changeSize = useCallback((s: LabelSize) => {
    setLabelSize(s); setCustomW(String(s.w)); setCustomH(String(s.h));
    setLayout(loadLayout(s));
  }, []);

  const patchField = useCallback((field: keyof Omit<LabelLayout,"qr">, patch: Partial<FieldCfg>) =>
    setLayout((prev) => ({ ...prev, [field]: { ...prev[field], ...patch } })), []);
  const patchQr = useCallback((patch: Partial<QrCfg>) =>
    setLayout((prev) => ({ ...prev, qr: { ...prev.qr, ...patch } })), []);
  const resetLayout = () => { const d = defaultLayout(labelSize); setLayout(d); saveLayout(labelSize, d); };

  const openPane = async () => {
    // Pre-generate QR when opening
    const data = `${displayCode(product.code)} | ${product.name} | ${inr(product.sellingPrice)}`;
    const url = await QRCode.toDataURL(data, { width: 200, margin: 1, color: { dark: "#000", light: "#fff" } });
    setQr(url);
    setCount(product.quantity || 1);
    setOpen(true);
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const blob = await generateLabelPDF([{ product, count, qr }], labelSize, layout);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `${safeName(product.name)}-labels.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally { setPdfLoading(false); }
  };

  const leftPane = (
    <div className="space-y-4">
      {/* Size selector */}
      <div className="bg-brand-50 rounded-xl px-3 py-2.5 space-y-2">
        <p className="text-xs font-bold text-brand-700 uppercase tracking-wide">Label Size — Sezink Josh</p>
        <div className="flex flex-wrap gap-1.5">
          {LABEL_PRESETS.map((p) => (
            <button key={p.label} onClick={() => changeSize(p)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition leading-tight ${
                labelSize.w === p.w && labelSize.h === p.h
                  ? "bg-brand-700 text-white" : "bg-white text-brand-700 border border-brand-200 hover:border-brand-400"
              }`}>{p.label}</button>
          ))}
        </div>
        <button onClick={() => setShowCustom((v) => !v)} className="text-xs text-brand-600 flex items-center gap-1">
          <Settings2 className="h-3 w-3" /> Custom size
        </button>
        {showCustom && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-brand-100">
            <span className="text-xs text-slate-500">W mm:</span>
            <input type="number" value={customW} onChange={(e) => setCustomW(e.target.value)} className="w-14 rounded-lg border border-brand-200 px-2 py-1 text-sm text-center" />
            <span className="text-xs text-slate-500">H mm:</span>
            <input type="number" value={customH} onChange={(e) => setCustomH(e.target.value)} className="w-14 rounded-lg border border-brand-200 px-2 py-1 text-sm text-center" />
            <button onClick={() => { const w=Number(customW),h=Number(customH); if(w>0&&h>0) changeSize({w,h,label:`${w}×${h}mm`}); }}
              className="rounded-lg bg-brand-700 text-white px-3 py-1 text-xs font-semibold">Apply</button>
          </div>
        )}
        <p className="text-xs text-slate-500">Selected: <span className="font-semibold text-brand-700">{labelSize.w}×{labelSize.h}mm</span></p>
      </div>

      {/* Count */}
      <div className="bg-brand-50 rounded-xl px-3 py-3 space-y-1.5">
        <p className="text-xs font-bold text-brand-700 uppercase tracking-wide">Number of Labels</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setCount(c => Math.max(0, c - 1))} className="w-9 h-9 rounded-xl bg-white border border-brand-200 text-brand-700 text-lg font-bold flex items-center justify-center hover:bg-brand-100">−</button>
          <input type="number" value={count} min={0} max={product.quantity}
            onChange={(e) => setCount(Math.min(Number(e.target.value), product.quantity))}
            className="flex-1 text-center text-base font-bold rounded-xl border border-brand-200 py-2 focus:border-brand-500 focus:outline-none" />
          <button onClick={() => setCount(c => Math.min(c + 1, product.quantity))} className="w-9 h-9 rounded-xl bg-white border border-brand-200 text-brand-700 text-lg font-bold flex items-center justify-center hover:bg-brand-100">+</button>
          <span className="text-xs text-slate-400 shrink-0">/ {product.quantity}</span>
        </div>
      </div>

      {/* Layout editor toggle */}
      <button onClick={() => setEditLayout((v) => !v)}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition ${
          editLayout ? "bg-brand-700 text-white border-brand-700" : "bg-white text-brand-700 border-brand-200 hover:bg-brand-50"
        }`}>
        <LayoutTemplate className="h-3.5 w-3.5" />
        {editLayout ? "✓ Editing Layout — click to close" : "Edit Layout / లేఅవుట్ సవరించు"}
      </button>

      {editLayout && (
        <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3">
          <div className="space-y-2">
            <QrRow cfg={layout.qr} onChange={patchQr} xMax={labelSize.w} yMax={labelSize.h} />
            <FieldRow label="Shop Name" cfg={layout.shopName} onChange={(p) => patchField("shopName", p)} showBold xMax={labelSize.w} yMax={labelSize.h} />
            <FieldRow label="Item Name" cfg={layout.itemName} onChange={(p) => patchField("itemName", p)} showBold xMax={labelSize.w} yMax={labelSize.h} />
            <FieldRow label="Item Code" cfg={layout.itemCode} onChange={(p) => patchField("itemCode", p)} showBold xMax={labelSize.w} yMax={labelSize.h} />
          </div>
          <button onClick={resetLayout} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-terra-600 border border-terra-200 rounded-xl hover:bg-terra-50 transition">
            <RotateCcw className="h-3 w-3" /> Reset to default
          </button>
        </div>
      )}

      {/* Download button */}
      <Button className="w-full py-3" onClick={downloadPDF} disabled={pdfLoading || count === 0}>
        <Download className="mr-2 h-4 w-4" />
        {pdfLoading ? "Building PDF…" : `Download ${count} Label${count !== 1 ? "s" : ""} as PDF`}
      </Button>
    </div>
  );

  const rightPane = (
    <div className="space-y-3">
      {/* Sticky preview */}
      <div className="sticky top-0 z-10 bg-brand-50/95 backdrop-blur-sm rounded-xl pb-2 pt-1">
        <p className="text-xs font-bold text-brand-700 uppercase tracking-wide mb-2 px-1">Live Preview</p>
        {qr ? (
          <div className="flex justify-center">
            <CanvasPreview product={product} qr={qr} size={labelSize} layout={layout} />
          </div>
        ) : (
          <div className="h-32 bg-brand-100 rounded-xl animate-pulse" />
        )}
        <p className="text-[10px] text-slate-400 text-center mt-1">Updates as you adjust layout ↓</p>
      </div>

      {/* Item info */}
      <div className="bg-white rounded-xl p-4 space-y-1 shadow-sm">
        <p className="font-bold text-brand-900">{product.name}</p>
        <p className="text-xs text-slate-500">{displayCode(product.code)} · {product.category?.name ?? "—"}</p>
        <p className="text-xs text-slate-500">{inr(product.sellingPrice)} · Stock: {product.quantity}</p>
      </div>

      <p className="text-xs text-slate-400 text-center">Tap Download PDF to save {count} label{count !== 1 ? "s" : ""}</p>
    </div>
  );

  return (
    <>
      <button
        onClick={openPane}
        title="Label"
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition"
      >
        <Tag className="h-3 w-3" />
        Label
      </button>

      <TwoPane
        open={open}
        onClose={() => { setOpen(false); setEditLayout(false); }}
        title={`Label — ${product.name}`}
        leftLabel="Layout & Count"
        rightLabel="Preview"
        leftPane={leftPane}
        rightPane={rightPane}
      />
    </>
  );
}

// Keep old export for any legacy usage (no-op, just redirects)
export function LabelPrinter({ products }: { products: Product[] }) {
  return null;
}
