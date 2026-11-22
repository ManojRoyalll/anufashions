import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inr, generateItemCode } from "@/lib/utils";

type Product = {
  id: string; code: string; name: string;
  sellingPrice: number; quantity: number; category?: { name: string };
};

type LabelSize = { w: number; h: number; label: string };

const DEFAULT_SIZE: LabelSize = { label: "Josh Standard (100×50mm)", w: 100, h: 50 };

// ── LAYOUT TYPE ───────────────────────────────────────────────────────────────
type FieldCfg = { visible: boolean; x: number; y: number; fontSize: number; bold: boolean };
type QrCfg    = { visible: boolean; x: number; y: number; size: number };

type LabelLayout = {
  qr:       QrCfg;
  shopName: FieldCfg;
  itemName: FieldCfg;
  itemCode: FieldCfg;
};

function defaultLayout(size: LabelSize): LabelLayout {
  const REF_W = 100, REF_H = 50;
  const sX = size.w / REF_W;
  const sY = size.h / REF_H;
  const sF = Math.min(sX, sY);
  const x = (mm: number) => Math.round(mm * sX * 10) / 10;
  const y = (mm: number) => Math.round(mm * sY * 10) / 10;
  const f = (mm: number) => Math.round(mm * sF * 10) / 10;
  return {
    shopName: { visible: true, x: x(5.5),  y: y(4.5),  fontSize: f(5.5),  bold: false },
    qr:       { visible: true, x: x(5.5),  y: y(13.5), size: f(30.0) },
    itemName: { visible: true, x: x(40.0), y: y(13.0), fontSize: f(5.5),  bold: false },
    itemCode: { visible: true, x: x(41.0), y: y(24.0), fontSize: f(7.0),  bold: true  },
  };
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

  if (layout.qr.visible && qrDataUrl) {
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise<void>((res) => { qrImg.onload = () => res(); });
    const s = px(layout.qr.size);
    ctx.drawImage(qrImg, px(layout.qr.x), px(layout.qr.y), s, s);
  }

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

  const drawCode = (cfg: FieldCfg, code: string) => {
    if (!cfg.visible) return;
    const fpx   = px(cfg.fontSize);
    const font  = `${cfg.bold ? "bold " : ""}${fpx}px Arial`;
    const lineH = Math.round(fpx * 1.45);
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

// ── GENERIC PDF BUILDER ─────────────────────────────────────────────────────
function buildPdf(pages: Array<{ canvas: HTMLCanvasElement; jpeg: Uint8Array }>, size: LabelSize): Blob {
  const MM_TO_PT = 2.8346;
  const pageW = size.w * MM_TO_PT;
  const pageH = size.h * MM_TO_PT;

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

function canvasToJpeg(canvas: HTMLCanvasElement): Uint8Array {
  const b64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = filename; a.click();
  URL.revokeObjectURL(url);
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
      <div className="flex items-center gap-2">
        <button onClick={dec} className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-lg font-bold flex items-center justify-center hover:bg-brand-100 active:bg-brand-200 touch-manipulation select-none">−</button>
        <div className="flex-1 text-center text-sm font-bold text-brand-900 bg-brand-50 rounded-xl py-2">{value.toFixed(1)}</div>
        <button onClick={inc} className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-lg font-bold flex items-center justify-center hover:bg-brand-100 active:bg-brand-200 touch-manipulation select-none">+</button>
      </div>
    </div>
  );
}

// ── SIZE PICKER (shared) ──────────────────────────────────────────────────────
function SizePicker({ size, onChange }: { size: LabelSize; onChange: (s: LabelSize) => void }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customW, setCustomW] = useState(String(size.w));
  const [customH, setCustomH] = useState(String(size.h));
  const isDefault = size.w === DEFAULT_SIZE.w && size.h === DEFAULT_SIZE.h;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => { setShowCustom(false); onChange(DEFAULT_SIZE); }}
        className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${
          isDefault && !showCustom ? "bg-brand-600 text-white border-brand-600" : "bg-white text-brand-700 border-brand-200"
        }`}
      >
        Josh Standard (100×50mm)
      </button>
      <button
        onClick={() => setShowCustom(v => !v)}
        className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${
          showCustom ? "bg-brand-600 text-white border-brand-600" : "bg-white text-brand-700 border-brand-200"
        }`}
      >
        Custom Size
      </button>
      {showCustom && (
        <div className="flex items-center gap-2 w-full mt-1">
          <span className="text-xs text-slate-500">W mm:</span>
          <input type="number" value={customW} onChange={e => setCustomW(e.target.value)} className="w-16 rounded-xl border border-brand-200 px-2 py-1.5 text-sm text-center" />
          <span className="text-xs text-slate-500">H mm:</span>
          <input type="number" value={customH} onChange={e => setCustomH(e.target.value)} className="w-16 rounded-xl border border-brand-200 px-2 py-1.5 text-sm text-center" />
          <button
            onClick={() => { const w=Number(customW),h=Number(customH); if(w>0&&h>0) onChange({w,h,label:`${w}×${h}mm`}); }}
            className="rounded-xl bg-brand-600 text-white px-3 py-1.5 text-xs font-semibold"
          >Apply</button>
        </div>
      )}
    </div>
  );
}

function CountControl({ count, setCount }: { count: number; setCount: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3">
      <span className="text-sm font-semibold text-slate-700 shrink-0">Labels:</span>
      <button onClick={() => setCount(Math.max(1, count - 1))} className="w-10 h-10 rounded-xl bg-white border-2 border-brand-200 text-brand-700 text-xl font-bold flex items-center justify-center hover:bg-brand-50 touch-manipulation">−</button>
      <input type="number" value={count} min={1} onChange={e => setCount(Math.max(1, Number(e.target.value)))} className="flex-1 text-center text-xl font-black rounded-xl border-2 border-brand-200 py-2 focus:border-brand-500 focus:outline-none" />
      <button onClick={() => setCount(count + 1)} className="w-10 h-10 rounded-xl bg-white border-2 border-brand-200 text-brand-700 text-xl font-bold flex items-center justify-center hover:bg-brand-50 touch-manipulation">+</button>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-brand-700 mb-1">{label}</p>
      <input
        type={type} autoComplete="off" placeholder={placeholder}
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
      />
    </div>
  );
}

// ── PRICE LABEL CREATOR ───────────────────────────────────────────────────────
// Label built from buy price + sell price → generates ANU/MP item code + QR.
export function PriceLabelCreator() {
  const [name, setName]         = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [labelSize, setLabelSize] = useState<LabelSize>(DEFAULT_SIZE);
  const [count, setCount]       = useState(1);
  const [layout, setLayout]     = useState<LabelLayout>(() => defaultLayout(DEFAULT_SIZE));
  const [qr, setQr]             = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"qr"|"shop"|"name"|"code">("qr");

  const buy  = Number(buyPrice);
  const sell = Number(sellPrice);
  const disc = Number(discount) || 0;
  const ready = Boolean(name.trim()) && buy > 0 && sell > 0;

  const code = useMemo(() => {
    if (buy <= 0 || sell <= 0) return "";
    return generateItemCode(buy, sell, disc);
  }, [buy, sell, disc]);

  const product: Product = useMemo(() => ({
    id: "price", code, name: name.trim() || "Item", sellingPrice: sell || 0, quantity: count,
  }), [code, name, sell, count]);

  useEffect(() => {
    if (!code) { setQr(""); return; }
    let cancelled = false;
    QRCode.toDataURL(code, { width: 200, margin: 0, errorCorrectionLevel: "L", color: { dark: "#000", light: "#fff" } })
      .then((url) => { if (!cancelled) setQr(url); });
    return () => { cancelled = true; };
  }, [code]);

  const patchField = (field: keyof Omit<LabelLayout,"qr">, patch: Partial<FieldCfg>) =>
    setLayout(prev => ({ ...prev, [field]: { ...prev[field], ...patch } }));
  const patchQr = (patch: Partial<QrCfg>) =>
    setLayout(prev => ({ ...prev, qr: { ...prev.qr, ...patch } }));
  const changeSize = (s: LabelSize) => { setLabelSize(s); setLayout(defaultLayout(s)); };

  const downloadPDF = async () => {
    if (!ready) return;
    setPdfLoading(true);
    try {
      const pages: Array<{ canvas: HTMLCanvasElement; jpeg: Uint8Array }> = [];
      for (let i = 0; i < count; i++) {
        const canvas = await renderLabelCanvas(product, qr, labelSize, layout);
        pages.push({ canvas, jpeg: canvasToJpeg(canvas) });
      }
      downloadBlob(buildPdf(pages, labelSize), `${safeName(product.name)}-labels.pdf`);
    } finally { setPdfLoading(false); }
  };

  const TABS = [
    { key: "qr"   as const, label: "QR Code" },
    { key: "shop" as const, label: "Shop Name" },
    { key: "name" as const, label: "Item Name" },
    { key: "code" as const, label: "Item Code" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Item Name *" value={name} onChange={setName} placeholder="e.g. SILVER PATTU" />
        <TextInput label="Max Discount % (optional)" value={discount} onChange={setDiscount} placeholder="0" type="number" />
        <TextInput label="Purchase Price (₹) *" value={buyPrice} onChange={setBuyPrice} placeholder="0" type="number" />
        <TextInput label="Sell Price (₹) *" value={sellPrice} onChange={setSellPrice} placeholder="0" type="number" />
      </div>

      {code && (
        <div className="text-center text-sm font-mono font-bold text-brand-700 bg-brand-50 rounded-xl py-2">
          {code}
        </div>
      )}

      {/* Live preview */}
      <div className="flex justify-center bg-slate-50 rounded-2xl p-4 border border-slate-200">
        {ready && qr ? (
          <CanvasPreview product={product} qr={qr} size={labelSize} layout={layout} />
        ) : (
          <div className="py-10 text-center text-sm text-slate-400">Enter name, purchase price and sell price to see the label</div>
        )}
      </div>

      <SizePicker size={labelSize} onChange={changeSize} />
      <CountControl count={count} setCount={setCount} />

      <Button className="w-full py-4 text-lg font-bold rounded-2xl" onClick={downloadPDF} disabled={pdfLoading || !ready}>
        <Download className="mr-2 h-5 w-5" />
        {pdfLoading ? "Building PDF…" : `Download ${count} Label${count !== 1 ? "s" : ""} as PDF`}
      </Button>

      {/* Layout editor */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-xs font-semibold transition ${
                activeTab === tab.key ? "bg-white text-brand-700 border-b-2 border-brand-600" : "text-slate-500 hover:text-slate-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-3">
          {activeTab === "qr" && (
            <>
              <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">Show QR Code</span><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={layout.qr.visible} onChange={e => patchQr({ visible: e.target.checked })} className="w-4 h-4 accent-brand-600" /><span className="text-sm text-slate-500">Visible</span></label></div>
              {layout.qr.visible && <>
                <SliderControl label="X position" value={layout.qr.x} min={0} max={labelSize.w} onChange={v => patchQr({ x: v })} />
                <SliderControl label="Y position" value={layout.qr.y} min={0} max={labelSize.h} onChange={v => patchQr({ y: v })} />
                <SliderControl label="Size" value={layout.qr.size} min={5} max={Math.min(labelSize.w, labelSize.h)} onChange={v => patchQr({ size: v })} />
              </>}
            </>
          )}
          {activeTab === "shop" && (
            <>
              <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">Shop Name</span><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={layout.shopName.visible} onChange={e => patchField("shopName", { visible: e.target.checked })} className="w-4 h-4 accent-brand-600" /><span className="text-sm text-slate-500">Visible</span></label></div>
              {layout.shopName.visible && <>
                <SliderControl label="X position" value={layout.shopName.x} min={0} max={labelSize.w} onChange={v => patchField("shopName", { x: v })} />
                <SliderControl label="Y position" value={layout.shopName.y} min={0} max={labelSize.h} onChange={v => patchField("shopName", { y: v })} />
                <SliderControl label="Font size" value={layout.shopName.fontSize} min={1} max={20} onChange={v => patchField("shopName", { fontSize: v })} />
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={layout.shopName.bold} onChange={e => patchField("shopName", { bold: e.target.checked })} className="w-4 h-4 accent-brand-600" /><span className="text-sm text-slate-600">Bold</span></label>
              </>}
            </>
          )}
          {activeTab === "name" && (
            <>
              <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">Item Name</span><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={layout.itemName.visible} onChange={e => patchField("itemName", { visible: e.target.checked })} className="w-4 h-4 accent-brand-600" /><span className="text-sm text-slate-500">Visible</span></label></div>
              {layout.itemName.visible && <>
                <SliderControl label="X position" value={layout.itemName.x} min={0} max={labelSize.w} onChange={v => patchField("itemName", { x: v })} />
                <SliderControl label="Y position" value={layout.itemName.y} min={0} max={labelSize.h} onChange={v => patchField("itemName", { y: v })} />
                <SliderControl label="Font size" value={layout.itemName.fontSize} min={1} max={20} onChange={v => patchField("itemName", { fontSize: v })} />
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={layout.itemName.bold} onChange={e => patchField("itemName", { bold: e.target.checked })} className="w-4 h-4 accent-brand-600" /><span className="text-sm text-slate-600">Bold</span></label>
              </>}
            </>
          )}
          {activeTab === "code" && (
            <>
              <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">Item Code</span><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={layout.itemCode.visible} onChange={e => patchField("itemCode", { visible: e.target.checked })} className="w-4 h-4 accent-brand-600" /><span className="text-sm text-slate-500">Visible</span></label></div>
              {layout.itemCode.visible && <>
                <SliderControl label="X position" value={layout.itemCode.x} min={0} max={labelSize.w} onChange={v => patchField("itemCode", { x: v })} />
                <SliderControl label="Y position" value={layout.itemCode.y} min={0} max={labelSize.h} onChange={v => patchField("itemCode", { y: v })} />
                <SliderControl label="Font size" value={layout.itemCode.fontSize} min={1} max={20} onChange={v => patchField("itemCode", { fontSize: v })} />
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={layout.itemCode.bold} onChange={e => patchField("itemCode", { bold: e.target.checked })} className="w-4 h-4 accent-brand-600" /><span className="text-sm text-slate-600">Bold</span></label>
              </>}
            </>
          )}
          <button onClick={() => setLayout(defaultLayout(labelSize))} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-400 hover:text-brand-600 border border-slate-200 rounded-xl transition mt-1">
            <RotateCcw className="h-3 w-3" /> Reset to default layout
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CUSTOM LABEL CREATOR ──────────────────────────────────────────────────────
// Label shows: QR | Anu Fashions / saree name / ₹price (no item code).
async function renderCustomCanvas(
  name: string,
  sellPrice: number,
  size: LabelSize,
): Promise<HTMLCanvasElement> {
  const DPI = 300;
  const MM  = DPI / 25.4;
  const PT  = DPI / 72;
  const W   = Math.round(size.w * MM);
  const H   = Math.round(size.h * MM);

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000";

  const pad = 2.5 * MM;

  const qrData = `${name} | ${inr(sellPrice)}`;
  const qrDataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1, color: { dark: "#000", light: "#fff" } });
  const qrSide = Math.round((H - 2 * pad) * 0.95);
  const qrImg = new Image();
  qrImg.src = qrDataUrl;
  await new Promise<void>((res) => { qrImg.onload = () => res(); });
  ctx.drawImage(qrImg, pad, pad + (H - 2 * pad - qrSide) / 2, qrSide, qrSide);

  const textX   = pad + qrSide + 2.5 * MM;
  const textMaxW = W - textX - pad;
  const sc = size.h / 30;

  const wrap = (text: string, font: string, maxW: number): string[] => {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxW) return [text];
    const words = text.split(/\s+/);
    const lines: string[] = []; let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
      else { cur = t; }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const shopPx  = Math.round(7   * sc * PT);
  const namePx  = Math.round(9   * sc * PT);
  const pricePx = Math.round(14  * sc * PT);
  const lineH   = Math.round(namePx * 1.3);

  let y = pad;

  ctx.font = `${shopPx}px Arial`;
  ctx.fillText("Anu Fashions", textX, y);
  y += Math.round(shopPx * 1.4);

  ctx.font = `bold ${namePx}px Arial`;
  for (const line of wrap(name, `bold ${namePx}px Arial`, textMaxW)) {
    ctx.fillText(line, textX, y);
    y += lineH;
  }
  y += Math.round(2 * sc * MM);

  ctx.font = `bold ${pricePx}px Arial`;
  ctx.fillText(inr(sellPrice), textX, y);

  return canvas;
}

export function CustomLabelCreator() {
  const [name, setName]             = useState("");
  const [sellPrice, setSellPrice]   = useState("");
  const [count, setCount]           = useState(1);
  const [labelSize, setLabelSize]   = useState<LabelSize>(DEFAULT_SIZE);
  const [previewSrc, setPreviewSrc] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  const n = name.trim();
  const p = Number(sellPrice);
  const ready = Boolean(n) && p > 0;

  useEffect(() => {
    if (!ready) { setPreviewSrc(""); return; }
    let cancelled = false;
    renderCustomCanvas(n, p, labelSize).then((c) => {
      if (!cancelled) setPreviewSrc(c.toDataURL("image/png"));
    });
    return () => { cancelled = true; };
  }, [n, p, ready, labelSize]);

  const downloadPDF = async () => {
    if (!ready) return;
    setPdfLoading(true);
    try {
      const pages: Array<{ canvas: HTMLCanvasElement; jpeg: Uint8Array }> = [];
      for (let i = 0; i < count; i++) {
        const canvas = await renderCustomCanvas(n, p, labelSize);
        pages.push({ canvas, jpeg: canvasToJpeg(canvas) });
      }
      downloadBlob(buildPdf(pages, labelSize), `custom-label-${safeName(n)}.pdf`);
    } finally { setPdfLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Saree / Item Name *" value={name} onChange={setName} placeholder="e.g. SILVER PATTU" />
        <TextInput label="Selling Price (₹) *" value={sellPrice} onChange={setSellPrice} placeholder="0" type="number" />
      </div>

      <div className="flex justify-center bg-slate-50 rounded-2xl p-4 border border-slate-200">
        {previewSrc ? (
          <img
            src={previewSrc}
            style={{
              width: Math.min(labelSize.w * 3.5, 360),
              height: Math.round(Math.min(labelSize.w * 3.5, 360) * (labelSize.h / labelSize.w)),
              borderRadius: 6, border: "1px solid #ddd", display: "block"
            }}
            alt="label preview"
          />
        ) : (
          <div className="py-10 text-center text-sm text-slate-400">Enter a name and price to see the preview</div>
        )}
      </div>

      <SizePicker size={labelSize} onChange={setLabelSize} />
      <CountControl count={count} setCount={setCount} />

      <Button className="w-full py-4 text-lg font-bold rounded-2xl" onClick={downloadPDF} disabled={pdfLoading || !ready}>
        <Download className="mr-2 h-5 w-5" />
        {pdfLoading ? "Building PDF…" : `Download ${count} Label${count !== 1 ? "s" : ""} as PDF`}
      </Button>

      <div className="bg-brand-50 rounded-xl p-3 space-y-1 text-xs text-slate-600">
        <p className="font-semibold text-brand-800 text-sm">What's on this label:</p>
        <p>✓ QR code (encodes name + price)</p>
        <p>✓ Anu Fashions</p>
        <p>✓ Saree name</p>
        <p>✓ Selling price — bold</p>
        <p className="text-slate-400">✗ No item code</p>
      </div>
    </div>
  );
}
