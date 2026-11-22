import { useEffect, useMemo, useState } from "react";
import { Download, Sparkles, ChevronDown, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inr, generateItemCode } from "@/lib/utils";
import {
  type LabelSize, type LabelVariant, type HistoryEntry,
  listHistory, addHistory, removeHistory, clearHistory,
} from "@/lib/history";

const DEFAULT_SIZE: LabelSize = { label: "Josh Standard (100×50mm)", w: 100, h: 50 };

// ── DECORATIVE LADY IN SAREE (vector silhouette, print-crisp) ─────────────────
function drawLady(ctx: CanvasRenderingContext2D, cx: number, top: number, h: number) {
  const u = h / 10;
  const pink = "#c2185b";
  const deep = "#7d103b";
  const gold = "#d4a017";

  const shoulderY = top + 2.0 * u;
  const waistY    = top + 4.4 * u;
  const hemY      = top + 10 * u;
  const sW = 1.25 * u; // shoulder half-width
  const wW = 0.72 * u; // waist half-width
  const hW = 2.3 * u;  // hem half-width (saree flare)

  // Saree body
  ctx.fillStyle = pink;
  ctx.beginPath();
  ctx.moveTo(cx + sW, shoulderY);
  ctx.quadraticCurveTo(cx + wW * 1.15, (shoulderY + waistY) / 2, cx + wW, waistY);
  ctx.quadraticCurveTo(cx + hW * 0.8, (waistY + hemY) / 2, cx + hW, hemY);
  ctx.quadraticCurveTo(cx, hemY + 0.5 * u, cx - hW, hemY);
  ctx.quadraticCurveTo(cx - hW * 0.8, (waistY + hemY) / 2, cx - wW, waistY);
  ctx.quadraticCurveTo(cx - wW * 1.15, (shoulderY + waistY) / 2, cx - sW, shoulderY);
  ctx.quadraticCurveTo(cx, shoulderY - 0.55 * u, cx + sW, shoulderY);
  ctx.closePath();
  ctx.fill();

  // Neck + head + hair bun
  ctx.fillStyle = deep;
  ctx.fillRect(cx - 0.28 * u, top + 1.4 * u, 0.56 * u, 0.9 * u);
  ctx.beginPath(); ctx.arc(cx, top + 0.95 * u, 0.85 * u, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, top + 0.18 * u, 0.5 * u, 0, Math.PI * 2); ctx.fill();

  // Pallu drape (gold) across the saree
  ctx.strokeStyle = gold; ctx.lineWidth = 0.5 * u; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - sW * 0.9, shoulderY);
  ctx.quadraticCurveTo(cx + wW, waistY + 0.6 * u, cx + hW * 0.6, hemY - 0.6 * u);
  ctx.stroke();

  // Gold hem trim
  ctx.lineWidth = 0.32 * u;
  ctx.beginPath();
  ctx.moveTo(cx - hW, hemY);
  ctx.quadraticCurveTo(cx, hemY + 0.5 * u, cx + hW, hemY);
  ctx.stroke();

  // Bindi
  ctx.fillStyle = gold;
  ctx.beginPath(); ctx.arc(cx, top + 0.72 * u, 0.11 * u, 0, Math.PI * 2); ctx.fill();
}

// ── DECORATIVE FLORAL / PLANT BORDER (vector, print-crisp) ────────────────────
function drawFloralBorder(ctx: CanvasRenderingContext2D, W: number, H: number, u: number) {
  const gold = "#c99a2e";
  const pink = "#c2185b";
  const leaf = "#5a8f52";

  const m = u * 1.6;          // outer margin (kept close to the edge)
  const r = u * 2;            // corner radius

  // Keep the decoration soft so it never competes with the text
  ctx.save();
  ctx.globalAlpha = 0.38;

  const roundRect = (x: number, y: number, w: number, h: number, rad: number) => {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  };

  // Double border: gold outer, thin pink inner
  ctx.strokeStyle = gold; ctx.lineWidth = u * 0.55;
  roundRect(m, m, W - 2 * m, H - 2 * m, r); ctx.stroke();
  ctx.strokeStyle = pink; ctx.lineWidth = u * 0.2;
  roundRect(m + u * 0.8, m + u * 0.8, W - 2 * (m + u * 0.8), H - 2 * (m + u * 0.8), r); ctx.stroke();

  // A little flower with petals + a leaf
  const flower = (cx: number, cy: number, s: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = pink;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.ellipse(0, -s * 1.1, s * 0.5, s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(Math.PI / 3);
    }
    ctx.fillStyle = gold;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  const leafShape = (cx: number, cy: number, s: number, rot: number) => {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.fillStyle = leaf;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 1.4, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const s = u * 0.95;
  const corners: [number, number, number][] = [
    [m + u * 0.8, m + u * 0.8, 0],
    [W - m - u * 0.8, m + u * 0.8, Math.PI / 2],
    [m + u * 0.8, H - m - u * 0.8, -Math.PI / 2],
    [W - m - u * 0.8, H - m - u * 0.8, Math.PI],
  ];
  for (const [cx, cy, rot] of corners) {
    leafShape(cx + Math.cos(rot + 0.6) * s * 1.6, cy + Math.sin(rot + 0.6) * s * 1.6, s, rot + 0.6);
    leafShape(cx + Math.cos(rot - 0.2) * s * 1.8, cy + Math.sin(rot - 0.2) * s * 1.8, s * 0.8, rot - 0.2);
    flower(cx, cy, s);
  }
  ctx.restore();
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim().replace(/\s+/g, "-") || "label";
}

// ── DESIGNED LABEL RENDERER (no QR) ───────────────────────────────────────────
// Layout: decorative floral/plant border, a lady in saree on the right, and
// three stacked text lines on the left — Anu Fashions / item name / bottom line.
function renderDesignedLabel(
  opts: { name: string; bottom: string },
  size: LabelSize,
): HTMLCanvasElement {
  const DPI = 300;
  const MM  = DPI / 25.4;
  const W   = Math.round(size.w * MM);
  const H   = Math.round(size.h * MM);
  const px  = (mm: number) => Math.round(mm * MM);
  const sc  = size.h / 50; // scale fonts relative to a 50mm-tall reference

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Decorative floral / plant border
  drawFloralBorder(ctx, W, H, px(1.6 * sc));

  const pad = px(6 * sc);

  // Lady in saree on the right side
  const ladyBoxH = H - 2 * pad;
  const ladyW = ladyBoxH * 0.46;
  const ladyCx = W - pad - ladyW / 2;
  drawLady(ctx, ladyCx, pad, ladyBoxH);
  const ladyLeft = ladyCx - ladyW / 2 - px(2 * sc);

  // Text column
  ctx.textBaseline = "top";
  const textX = pad + px(1 * sc);
  const textMaxW = ladyLeft - textX;

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

  const shopPx    = px(7.0 * sc);
  const namePx    = px(5.5 * sc);
  const bottomPx  = px(8.0 * sc);

  // Vertically center the whole text block
  const nameFont = `600 ${namePx}px Georgia, 'Times New Roman', serif`;
  const nameLines = wrap(opts.name, nameFont, textMaxW);
  const nameLineH = Math.round(namePx * 1.2);
  const blockH =
    Math.round(shopPx * 1.5) +
    nameLines.length * nameLineH +
    Math.round(4 * sc * MM) +
    Math.round(bottomPx * 1.1);
  let y = Math.max(pad + px(1.5 * sc), (H - blockH) / 2);

  // Shop name — elegant serif, brand magenta
  ctx.fillStyle = "#c2185b";
  ctx.font = `bold ${shopPx}px Georgia, 'Times New Roman', serif`;
  ctx.fillText("Anu Fashions", textX, y);
  y += Math.round(shopPx * 1.5);

  // Item name
  ctx.fillStyle = "#1f2937";
  ctx.font = nameFont;
  for (const line of nameLines) {
    ctx.fillText(line, textX, y);
    y += nameLineH;
  }
  y += Math.round(4 * sc * MM);

  // Bottom line — bold (bill code or price). Shrink to fit the text column.
  let fitPx = bottomPx;
  ctx.font = `bold ${fitPx}px Arial`;
  while (fitPx > px(3 * sc) && ctx.measureText(opts.bottom).width > textMaxW) {
    fitPx -= 1;
    ctx.font = `bold ${fitPx}px Arial`;
  }
  ctx.fillStyle = "#7d103b";
  for (const line of wrap(opts.bottom, `bold ${fitPx}px Arial`, textMaxW)) {
    ctx.fillText(line, textX, y);
    y += Math.round(fitPx * 1.15);
  }

  return canvas;
}

// ── PDF BUILDER ─────────────────────────────────────────────────────────────
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

// ── SHARED UI PIECES ──────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-brand-700">{label}</span>
      <input
        type={type} autoComplete="off" placeholder={placeholder} inputMode={type === "number" ? "decimal" : undefined}
        value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-base shadow-sm focus:border-brand-500 focus:outline-none"
      />
    </label>
  );
}

function SizePicker({ size, onChange }: { size: LabelSize; onChange: (s: LabelSize) => void }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customW, setCustomW] = useState(String(size.w));
  const [customH, setCustomH] = useState(String(size.h));
  const isDefault = size.w === DEFAULT_SIZE.w && size.h === DEFAULT_SIZE.h;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { setShowCustom(false); onChange(DEFAULT_SIZE); }}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold border-2 transition ${
            isDefault && !showCustom ? "bg-brand-600 text-white border-brand-600" : "bg-white text-brand-700 border-brand-200"
          }`}
        >100 × 50 mm</button>
        <button
          onClick={() => setShowCustom(v => !v)}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold border-2 transition ${
            showCustom ? "bg-brand-600 text-white border-brand-600" : "bg-white text-brand-700 border-brand-200"
          }`}
        >Custom Size</button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">W</span>
          <input type="number" inputMode="decimal" value={customW} onChange={e => setCustomW(e.target.value)} className="w-16 rounded-xl border border-brand-200 px-2 py-2 text-sm text-center" />
          <span className="text-xs text-slate-500">H</span>
          <input type="number" inputMode="decimal" value={customH} onChange={e => setCustomH(e.target.value)} className="w-16 rounded-xl border border-brand-200 px-2 py-2 text-sm text-center" />
          <span className="text-xs text-slate-400">mm</span>
          <button
            onClick={() => { const w=Number(customW),h=Number(customH); if(w>0&&h>0) onChange({w,h,label:`${w}×${h}mm`}); }}
            className="ml-auto rounded-xl bg-brand-600 text-white px-4 py-2 text-xs font-semibold"
          >Apply</button>
        </div>
      )}
    </div>
  );
}

function CountControl({ count, setCount }: { count: number; setCount: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-slate-700 shrink-0">Copies</span>
      <button onClick={() => setCount(Math.max(1, count - 1))} className="w-11 h-11 rounded-xl bg-white border-2 border-brand-200 text-brand-700 text-xl font-bold flex items-center justify-center active:bg-brand-50 touch-manipulation">−</button>
      <input type="number" inputMode="numeric" value={count} min={1} onChange={e => setCount(Math.max(1, Number(e.target.value)))} className="flex-1 min-w-0 text-center text-xl font-black rounded-xl border-2 border-brand-200 py-2 focus:border-brand-500 focus:outline-none" />
      <button onClick={() => setCount(count + 1)} className="w-11 h-11 rounded-xl bg-white border-2 border-brand-200 text-brand-700 text-xl font-bold flex items-center justify-center active:bg-brand-50 touch-manipulation">+</button>
    </div>
  );
}

function Preview({ src, size }: { src: string; size: LabelSize }) {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full" style={{ maxWidth: 440 }}>
        {src ? (
          <img src={src} alt="label preview"
            className="w-full h-auto rounded-xl border border-slate-200 shadow-sm"
            style={{ aspectRatio: `${size.w} / ${size.h}` }} />
        ) : (
          <div className="w-full rounded-xl border-2 border-dashed border-brand-200 flex items-center justify-center text-sm text-slate-400 px-4 text-center"
            style={{ aspectRatio: `${size.w} / ${size.h}` }}>
            Fill in the details to see your label
          </div>
        )}
      </div>
    </div>
  );
}

// ── LABEL HISTORY (Supabase-backed, see @/lib/history) ────────────────────────
function entryPayload(e: { variant: LabelVariant; name: string; code: string; price: string }) {
  const bottom = e.variant === "code"
    ? e.code.trim()
    : (Number(e.price) > 0 ? inr(Number(e.price)) : "");
  return { name: e.name.trim() || "Item Name", bottom: bottom || "—" };
}

function downloadEntry(e: HistoryEntry) {
  const pages: Array<{ canvas: HTMLCanvasElement; jpeg: Uint8Array }> = [];
  for (let i = 0; i < e.count; i++) {
    const canvas = renderDesignedLabel(entryPayload(e), e.size);
    pages.push({ canvas, jpeg: canvasToJpeg(canvas) });
  }
  downloadBlob(buildPdf(pages, e.size), `${safeName(e.name)}-labels.pdf`);
}

// ── LABEL CREATOR ─────────────────────────────────────────────────────────────
// variant "code"  → bottom line is a manually-entered item bill code
// variant "price" → bottom line is the selling price
export function LabelCreator({ variant, initial }: { variant: LabelVariant; initial?: HistoryEntry }) {
  const [name, setName]       = useState(initial?.name ?? "");
  const [code, setCode]       = useState(initial?.variant === "code" ? initial.code : "");
  const [price, setPrice]     = useState(initial?.variant === "price" ? initial.price : "");
  const [size, setSize]       = useState<LabelSize>(initial?.size ?? DEFAULT_SIZE);
  const [count, setCount]     = useState(initial?.count ?? 1);
  const [src, setSrc]         = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  // "Generate code from prices" (optional helper)
  const [showGen, setShowGen] = useState(false);
  const [buyPrice, setBuyPrice] = useState("");
  const [sellForCode, setSellForCode] = useState("");
  const [discount, setDiscount] = useState("");

  const bottom = variant === "code"
    ? code.trim()
    : (Number(price) > 0 ? inr(Number(price)) : "");
  const ready = Boolean(name.trim()) && Boolean(bottom);

  const payload = useMemo(() => ({ name: name.trim() || "Item Name", bottom: bottom || "—" }), [name, bottom]);

  // Live preview
  useEffect(() => {
    if (!ready) { setSrc(""); return; }
    setSrc(renderDesignedLabel(payload, size).toDataURL("image/png"));
  }, [payload, size, ready]);

  const generateCode = () => {
    const b = Number(buyPrice), s = Number(sellForCode);
    if (b > 0 && s > 0) setCode(generateItemCode(b, s, Number(discount) || 0));
  };

  const downloadPDF = async () => {
    if (!ready) return;
    setPdfLoading(true);
    try {
      const pages: Array<{ canvas: HTMLCanvasElement; jpeg: Uint8Array }> = [];
      for (let i = 0; i < count; i++) {
        const canvas = renderDesignedLabel(payload, size);
        pages.push({ canvas, jpeg: canvasToJpeg(canvas) });
      }
      downloadBlob(buildPdf(pages, size), `${safeName(name)}-labels.pdf`);
      await addHistory({
        variant, name: name.trim(),
        code: variant === "code" ? code.trim() : "",
        price: variant === "price" ? price : "",
        size, count,
      });
    } finally { setPdfLoading(false); }
  };

  return (
    <div className="space-y-5">
      <Preview src={src} size={size} />

      <div className="space-y-3">
        <Field label="Item Name" value={name} onChange={setName} placeholder="e.g. SILVER PATTU" />

        {variant === "code" ? (
          <>
            <Field label="Item Bill Code" value={code} onChange={setCode} placeholder="e.g. ANU52/403-MP64/903" />
            <div className="rounded-xl border border-brand-100 bg-brand-50/60 overflow-hidden">
              <button onClick={() => setShowGen(v => !v)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-brand-700">
                <Sparkles className="h-4 w-4" />
                Generate code from prices
                <ChevronDown className={`ml-auto h-4 w-4 transition ${showGen ? "rotate-180" : ""}`} />
              </button>
              {showGen && (
                <div className="px-3 pb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Purchase ₹" value={buyPrice} onChange={setBuyPrice} placeholder="0" type="number" />
                    <Field label="Sell ₹" value={sellForCode} onChange={setSellForCode} placeholder="0" type="number" />
                  </div>
                  <Field label="Max Discount %" value={discount} onChange={setDiscount} placeholder="0" type="number" />
                  <Button variant="secondary" className="w-full py-2.5" onClick={generateCode} disabled={!(Number(buyPrice) > 0 && Number(sellForCode) > 0)}>
                    Generate & fill code
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Field label="Selling Price (₹)" value={price} onChange={setPrice} placeholder="0" type="number" />
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold text-brand-700 uppercase tracking-wide">Label size</p>
        <SizePicker size={size} onChange={setSize} />
      </div>

      <CountControl count={count} setCount={setCount} />

      <Button className="w-full py-4 text-base font-bold rounded-2xl" onClick={downloadPDF} disabled={pdfLoading || !ready}>
        <Download className="mr-2 h-5 w-5" />
        {pdfLoading ? "Building PDF…" : `Download ${count} Label${count !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}

// ── LABEL HISTORY ─────────────────────────────────────────────────────────────
function HistoryCard({ entry, onReuse, onDelete }: {
  entry: HistoryEntry; onReuse: (e: HistoryEntry) => void; onDelete: () => void;
}) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    setSrc(renderDesignedLabel(entryPayload(entry), entry.size).toDataURL("image/png"));
  }, [entry]);

  const value = entry.variant === "code" ? entry.code : inr(Number(entry.price));
  const when = new Date(entry.ts).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-3 space-y-3 shadow-sm">
      {src && (
        <img src={src} alt="" className="w-full h-auto rounded-xl border border-slate-100"
          style={{ aspectRatio: `${entry.size.w} / ${entry.size.h}` }} />
      )}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${entry.variant === "code" ? "bg-brand-100 text-brand-700" : "bg-terra-100 text-terra-700"}`}>
            {entry.variant === "code" ? "BILL CODE" : "PRICE"}
          </span>
          <p className="font-bold text-slate-800 truncate">{entry.name || "Untitled"}</p>
        </div>
        <p className="text-sm text-brand-800 font-semibold truncate">{value}</p>
        <p className="text-xs text-slate-400">{entry.size.w}×{entry.size.h}mm · {entry.count} cop{entry.count === 1 ? "y" : "ies"} · {when}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button className="py-2.5" onClick={() => downloadEntry(entry)}>
          <Download className="mr-1.5 h-4 w-4" /> Download
        </Button>
        <Button variant="secondary" className="py-2.5" onClick={() => onReuse(entry)}>
          Reuse
        </Button>
      </div>
      <button onClick={onDelete} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-400 hover:text-red-600 border border-slate-200 rounded-xl transition">
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </div>
  );
}

export function LabelHistory({ onReuse }: { onReuse: (e: HistoryEntry) => void }) {
  const [list, setList] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    listHistory().then((l) => { setList(l); setLoading(false); });
  };
  useEffect(refresh, []);

  const handleDelete = async (id: string) => {
    setList((l) => l.filter((x) => x.id !== id));
    await removeHistory(id);
  };
  const handleClear = async () => {
    setList([]);
    await clearHistory();
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-slate-400">Loading saved labels…</div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-brand-200 py-16 px-6 text-center">
        <Clock className="h-10 w-10 mx-auto text-brand-300" />
        <p className="mt-3 font-semibold text-slate-600">No labels yet</p>
        <p className="text-sm text-slate-400">Labels you download are saved here so you can reprint them from any device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600">{list.length} saved label{list.length !== 1 ? "s" : ""}</p>
        <button onClick={handleClear} className="text-xs font-semibold text-slate-400 hover:text-red-600">
          Clear all
        </button>
      </div>
      {list.map((e) => (
        <HistoryCard key={e.id} entry={e} onReuse={onReuse} onDelete={() => handleDelete(e.id)} />
      ))}
    </div>
  );
}
