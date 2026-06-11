import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Settings2, Download, FileText, LayoutTemplate, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
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
    const lineH = Math.round(fpx * 1.3);
    let y = px(cfg.y);
    for (const line of wrap(text, font, maxW)) {
      ctx.font = font;
      ctx.fillText(line, px(cfg.x), y);
      y += lineH;
    }
  };

  drawField(layout.shopName, "Anu Fashions");
  drawField(layout.itemName, product.name);
  drawField(layout.itemCode, displayCode(product.code));

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
  const inp = "w-14 rounded-lg border border-brand-200 px-1.5 py-1 text-xs text-center focus:border-brand-500 focus:outline-none";
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-brand-800">{label}</span>
        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer select-none">
          <input type="checkbox" checked={cfg.visible} onChange={(e) => onChange({ visible: e.target.checked })} className="accent-brand-700" />
          Show
        </label>
      </div>
      {cfg.visible && (
        <div className="grid grid-cols-4 gap-1.5 items-center">
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-400 text-center">X (mm)</p>
            <input type="number" className={inp} value={cfg.x} min={0} max={xMax} step={0.5}
              onChange={(e) => onChange({ x: Math.max(0, Math.min(xMax, Number(e.target.value))) })} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-400 text-center">Y (mm)</p>
            <input type="number" className={inp} value={cfg.y} min={0} max={yMax} step={0.5}
              onChange={(e) => onChange({ y: Math.max(0, Math.min(yMax, Number(e.target.value))) })} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-400 text-center">Size (mm)</p>
            <input type="number" className={inp} value={cfg.fontSize} min={1} max={20} step={0.5}
              onChange={(e) => onChange({ fontSize: Math.max(1, Math.min(20, Number(e.target.value))) })} />
          </div>
          {showBold ? (
            <div className="space-y-0.5">
              <p className="text-[10px] text-slate-400 text-center">Bold</p>
              <div className="flex justify-center">
                <input type="checkbox" checked={cfg.bold} onChange={(e) => onChange({ bold: e.target.checked })} className="w-4 h-4 accent-brand-700 mt-1" />
              </div>
            </div>
          ) : <div />}
        </div>
      )}
    </div>
  );
}

// ── QR ROW ────────────────────────────────────────────────────────────────────
function QrRow({ cfg, onChange, xMax, yMax }: { cfg: QrCfg; onChange: (c: Partial<QrCfg>) => void; xMax: number; yMax: number }) {
  const inp = "w-14 rounded-lg border border-brand-200 px-1.5 py-1 text-xs text-center focus:border-brand-500 focus:outline-none";
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-brand-800">QR Code</span>
        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer select-none">
          <input type="checkbox" checked={cfg.visible} onChange={(e) => onChange({ visible: e.target.checked })} className="accent-brand-700" />
          Show
        </label>
      </div>
      {cfg.visible && (
        <div className="grid grid-cols-3 gap-1.5 items-center">
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-400 text-center">X (mm)</p>
            <input type="number" className={inp} value={cfg.x} min={0} max={xMax} step={0.5}
              onChange={(e) => onChange({ x: Math.max(0, Math.min(xMax, Number(e.target.value))) })} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-400 text-center">Y (mm)</p>
            <input type="number" className={inp} value={cfg.y} min={0} max={yMax} step={0.5}
              onChange={(e) => onChange({ y: Math.max(0, Math.min(yMax, Number(e.target.value))) })} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-400 text-center">Size (mm)</p>
            <input type="number" className={inp} value={cfg.size} min={5} max={Math.min(xMax, yMax)} step={0.5}
              onChange={(e) => onChange({ size: Math.max(5, Number(e.target.value)) })} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
type Props = { products: Product[] };

export function LabelPrinter({ products }: Props) {
  const [open, setOpen]             = useState(false);
  const [editLayout, setEditLayout] = useState(false);
  const [copies, setCopies]         = useState<Record<string, number>>({});
  const [labelSize, setLabelSize]   = useState<LabelSize>(DEFAULT_SIZE);
  const [customW, setCustomW]       = useState(String(DEFAULT_SIZE.w));
  const [customH, setCustomH]       = useState(String(DEFAULT_SIZE.h));
  const [showCustom, setShowCustom] = useState(false);
  const [layout, setLayout]         = useState<LabelLayout>(() => loadLayout(DEFAULT_SIZE));
  const [qrMap, setQrMap]           = useState<Record<string, string>>({});
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [pdfLoadingAll, setPdfLoadingAll] = useState(false);

  // Save layout whenever it changes (debounced via useCallback + setState)
  useEffect(() => { saveLayout(labelSize, layout); }, [layout, labelSize]);

  // When label size changes, load that size's saved layout
  const changeSize = useCallback((s: LabelSize) => {
    setLabelSize(s);
    setCustomW(String(s.w)); setCustomH(String(s.h));
    setLayout(loadLayout(s));
  }, []);

  const patchLayout = useCallback((patch: Partial<LabelLayout>) =>
    setLayout((prev) => ({ ...prev, ...patch })), []);

  const patchField = useCallback((field: keyof Omit<LabelLayout,"qr">, patch: Partial<FieldCfg>) =>
    setLayout((prev) => ({ ...prev, [field]: { ...prev[field], ...patch } })), []);

  const patchQr = useCallback((patch: Partial<QrCfg>) =>
    setLayout((prev) => ({ ...prev, qr: { ...prev.qr, ...patch } })), []);

  const resetLayout = () => {
    const d = defaultLayout(labelSize);
    setLayout(d);
    saveLayout(labelSize, d);
  };

  const openDrawer = () => {
    const d: Record<string, number> = {};
    products.forEach((p) => { d[p.id] = p.quantity || 1; });
    setCopies(d);
    setOpen(true);
  };

  const setCopy = (id: string, val: number) =>
    setCopies((prev) => ({ ...prev, [id]: Math.max(0, val) }));

  const generateQR = async (product: Product) => {
    if (qrMap[product.id]) return qrMap[product.id];
    const data = `${displayCode(product.code)} | ${product.name} | ${inr(product.sellingPrice)}`;
    const url = await QRCode.toDataURL(data, { width: 200, margin: 1, color: { dark: "#000", light: "#fff" } });
    setQrMap((prev) => ({ ...prev, [product.id]: url }));
    return url;
  };

  const downloadPDFOne = async (product: Product) => {
    setPdfLoadingId(product.id);
    try {
      const qr = await generateQR(product);
      const blob = await generateLabelPDF([{ product, count: copies[product.id] ?? 1, qr }], labelSize, layout);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${safeName(product.name)}-labels.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally { setPdfLoadingId(null); }
  };

  const downloadPDFAll = async () => {
    setPdfLoadingAll(true);
    try {
      const items = await Promise.all(
        products.filter((p) => (copies[p.id] ?? 1) > 0)
          .map(async (p) => ({ product: p, count: copies[p.id] ?? 1, qr: await generateQR(p) }))
      );
      const blob = await generateLabelPDF(items, labelSize, layout);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "anu-fashions-all-labels.pdf"; a.click();
      URL.revokeObjectURL(url);
    } finally { setPdfLoadingAll(false); }
  };

  const previewOne = async (product: Product) => { await generateQR(product); setPreviewProduct(product); };

  const totalLabels  = products.reduce((s, p) => s + (copies[p.id] ?? p.quantity ?? 1), 0);
  const activeItems  = products.filter((p) => (copies[p.id] ?? p.quantity ?? 1) > 0).length;

  // Pick first product with a QR for the layout editor preview
  const previewSample = products[0] ?? null;

  return (
    <>
      <Button variant="secondary" onClick={openDrawer}>
        <FileText className="mr-2 h-4 w-4" />
        Labels
      </Button>

      <Drawer open={open} onClose={() => { setOpen(false); setEditLayout(false); }} title={editLayout ? "Edit Layout / లేఅవుట్ సవరించు" : "Labels / లేబుల్లు"}>
        <div className="space-y-4">

          {/* ── Size selector ── */}
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

          {/* ── Edit Layout toggle ── */}
          <button
            onClick={() => setEditLayout((v) => !v)}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition ${
              editLayout
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-white text-brand-700 border-brand-200 hover:bg-brand-50"
            }`}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            {editLayout ? "✓ Editing Layout — click to close" : "Edit Layout / లేఅవుట్ సవరించు"}
          </button>

          {/* ── LAYOUT EDITOR ── */}
          {editLayout && (
            <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3">

              {/* Live preview */}
              {previewSample && qrMap[previewSample.id] && (
                <div className="flex justify-center">
                  <CanvasPreview product={previewSample} qr={qrMap[previewSample.id]} size={labelSize} layout={layout} />
                </div>
              )}
              {previewSample && !qrMap[previewSample.id] && (
                <button
                  onClick={() => generateQR(previewSample)}
                  className="w-full text-xs text-brand-600 underline text-center py-2"
                >
                  Load preview
                </button>
              )}

              {/* Field controls */}
              <div className="space-y-2">
                <QrRow cfg={layout.qr} onChange={patchQr} xMax={labelSize.w} yMax={labelSize.h} />
                <FieldRow label="Shop Name" cfg={layout.shopName} onChange={(p) => patchField("shopName", p)} xMax={labelSize.w} yMax={labelSize.h} />
                <FieldRow label="Item Name" cfg={layout.itemName} onChange={(p) => patchField("itemName", p)} xMax={labelSize.w} yMax={labelSize.h} />
                <FieldRow label="Item Code" cfg={layout.itemCode} onChange={(p) => patchField("itemCode", p)} showBold xMax={labelSize.w} yMax={labelSize.h} />
              </div>

              {/* Reset */}
              <button
                onClick={resetLayout}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-terra-600 border border-terra-200 rounded-xl hover:bg-terra-50 transition"
              >
                <RotateCcw className="h-3 w-3" /> Reset to default (wdfx template)
              </button>
            </div>
          )}

          {/* ── Item list ── */}
          {!editLayout && (
            <div className="space-y-2">
              {products.map((p) => {
                const count = copies[p.id] ?? p.quantity ?? 1;
                return (
                  <div key={p.id} className="rounded-xl border border-brand-100 bg-white p-3 space-y-2.5">
                    <div>
                      <p className="text-sm font-semibold text-brand-900 leading-tight">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{displayCode(p.code)} · {p.category?.name ?? "—"} · {inr(p.sellingPrice)}</p>
                      <p className="text-xs text-brand-600 font-medium">Stock: {p.quantity}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 shrink-0">Labels:</span>
                      <button onClick={() => setCopy(p.id, count - 1)} className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 font-bold flex items-center justify-center hover:bg-brand-100">−</button>
                      <input type="number" value={count} min={0} max={p.quantity}
                        onChange={(e) => setCopy(p.id, Math.min(Number(e.target.value), p.quantity))}
                        className="w-14 text-center text-sm font-bold rounded-lg border border-brand-200 py-1 focus:border-brand-500 focus:outline-none" />
                      <button onClick={() => setCopy(p.id, Math.min(count + 1, p.quantity))} className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 font-bold flex items-center justify-center hover:bg-brand-100">+</button>
                      <span className="text-xs text-slate-400">/ {p.quantity}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => downloadPDFOne(p)} disabled={count === 0 || pdfLoadingId === p.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-700 rounded-lg hover:bg-brand-800 disabled:opacity-40 transition">
                        <FileText className="h-3 w-3" />
                        {pdfLoadingId === p.id ? "Building…" : `PDF (${count})`}
                      </button>
                      <button onClick={() => previewOne(p)} className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition">Preview</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Footer ── */}
          {!editLayout && (
            <div className="sticky bottom-0 bg-white border-t border-brand-100 pt-3 pb-1 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{activeItems} items · {totalLabels} total labels</span>
                <button onClick={() => { const d: Record<string,number>={};products.forEach((p)=>{d[p.id]=p.quantity||1;});setCopies(d);}} className="text-brand-600 underline">Reset to stock qty</button>
              </div>
              <Button className="w-full" onClick={downloadPDFAll} disabled={pdfLoadingAll || totalLabels === 0}>
                <Download className="mr-2 h-4 w-4" />
                {pdfLoadingAll ? "Building PDF…" : `Download All (${totalLabels} labels) as PDF`}
              </Button>
            </div>
          )}
        </div>
      </Drawer>

      {/* Preview modal */}
      <Modal open={!!previewProduct} onClose={() => setPreviewProduct(null)} title="Label Preview" size="sm">
        {previewProduct && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 text-center">{labelSize.w}×{labelSize.h}mm — {copies[previewProduct.id] ?? 1} label(s)</p>
            <div className="flex justify-center">
              <CanvasPreview product={previewProduct} qr={qrMap[previewProduct.id] ?? ""} size={labelSize} layout={layout} />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPreviewProduct(null)}>Close</Button>
              <Button className="flex-1" onClick={() => { downloadPDFOne(previewProduct); setPreviewProduct(null); }}>
                <Download className="mr-2 h-3 w-3" />PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
