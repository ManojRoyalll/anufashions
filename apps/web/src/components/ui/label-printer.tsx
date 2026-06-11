import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { Printer, Settings2, Copy, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Modal } from "@/components/ui/modal";
import { inr } from "@/lib/utils";

type Product = {
  id: string; code: string; name: string;
  sellingPrice: number; quantity: number; category?: { name: string };
};

type LabelSize = { w: number; h: number; label: string };

// Sezink Josh is a 4-inch (100mm) thermal label printer.
// Common roll sizes for that printer listed first.
const LABEL_PRESETS: LabelSize[] = [
  { label: "100×75mm (Josh — Large)", w: 100, h: 75 },
  { label: "100×50mm (Josh — Standard)", w: 100, h: 50 },
  { label: "100×150mm (Josh — XL)", w: 100, h: 150 },
  { label: "75×50mm", w: 75, h: 50 },
  { label: "62×38mm", w: 62, h: 38 },
  { label: "50×30mm", w: 50, h: 30 },
];

const DEFAULT_SIZE = LABEL_PRESETS[1]; // 100×50 as default

function displayCode(code: string): string {
  return code || "ANU-000";
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim().replace(/\s+/g, "-") || "label";
}

function safeSheetName(name: string): string {
  return name.replace(/[\\\/\[\]\*\?\:]/g, "").slice(0, 31) || "Label";
}

// ── CANVAS LABEL RENDERER ──────────────────────────────────────────────────
// Renders one label onto a canvas at 300 DPI and returns it.
async function renderLabelCanvas(
  product: Product,
  qrDataUrl: string,
  size: LabelSize
): Promise<HTMLCanvasElement> {
  const DPI = 300;
  const MM  = DPI / 25.4;  // canvas px per mm at 300 DPI

  // Reference label from wdfx: 50×30mm
  const REF_W = 50, REF_H = 30;
  const sX = size.w / REF_W;   // horizontal scale
  const sY = size.h / REF_H;   // vertical scale
  const sF = Math.min(sX, sY); // uniform font/size scale

  const rx  = (mm: number) => Math.round(mm * sX * MM);  // x → canvas px
  const ry  = (mm: number) => Math.round(mm * sY * MM);  // y → canvas px
  const rf  = (mm: number) => Math.round(mm * sF * MM);  // size → canvas px

  const W = Math.round(size.w * MM);
  const H = Math.round(size.h * MM);

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "top";  // y coordinate = top of text, matches wdfx y

  // ── QR Code ──────────────────────────────────────────────────────────────
  // wdfx: x=0.788, y=1.905, w=17.842, h=25.014 → render as square (width)
  const qrImg = new Image();
  qrImg.src = qrDataUrl;
  await new Promise<void>((res) => { qrImg.onload = () => res(); });
  const qrSide = rf(17.842);
  ctx.drawImage(qrImg, rx(0.788), ry(1.905), qrSide, qrSide);

  ctx.fillStyle = "#000";

  // ── Font sizes (wdfx fontHeight in mm) ───────────────────────────────────
  const bodyPx  = rf(2.999);  // body: 2.999mm
  const pricePx = rf(5.644);  // price: 5.644mm

  // Helper: hard-wrap text to fit within maxPx width
  const wrapText = (text: string, font: string, maxPx: number): string[] => {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxPx) return [text];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxPx && cur) { lines.push(cur); cur = w; }
      else { cur = test; }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const lineH = Math.round(bodyPx * 1.25); // line spacing

  // ── "Anu Fashions"  wdfx: x=22.685, y=4.532, fontH=2.999 ───────────────
  ctx.font = `${bodyPx}px Arial`;
  ctx.fillText("Anu Fashions", rx(22.685), ry(4.532));

  // ── Item name  wdfx: x=22.455, y=8.464, w=20.050, fontH=2.999 ───────────
  ctx.font = `${bodyPx}px Arial`;
  wrapText(product.name, `${bodyPx}px Arial`, rf(20.050))
    .forEach((line, i) => ctx.fillText(line, rx(22.455), ry(8.464) + i * lineH));

  // ── Item code  wdfx: x=21.820, y=12.117, w=28.450, fontH=2.999  — BOLD ──
  ctx.font = `bold ${bodyPx}px Arial`;
  wrapText(displayCode(product.code), `bold ${bodyPx}px Arial`, rf(28.450))
    .forEach((line, i) => ctx.fillText(line, rx(21.820), ry(12.117) + i * lineH));

  // ── Price  wdfx: x=23.167, y=19.086, fontH=5.644 ────────────────────────
  ctx.font = `${pricePx}px Arial`;
  ctx.fillText(inr(product.sellingPrice), rx(23.167), ry(19.086));

  return canvas;
}

// ── PDF GENERATOR

// ── PDF GENERATOR

// ── PDF GENERATOR ─────────────────────────────────────────────────────────
// Builds a multi-page PDF manually (no library needed).
// Each page = one label at the exact physical size.
async function generateLabelPDF(
  items: { product: Product; count: number; qr: string }[],
  size: LabelSize
): Promise<Blob> {
  const DPI = 300;
  const MM_TO_PT = 2.8346; // PDF points per mm

  const pageW = size.w * MM_TO_PT;
  const pageH = size.h * MM_TO_PT;

  const pageObjects: string[] = [];
  const xObjects: string[] = [];
  let objIndex = 5; // objects 1-4 are catalog, pages, resources, procset

  for (const { product, count, qr } of items) {
    for (let i = 0; i < count; i++) {
      const canvas = await renderLabelCanvas(product, qr, size);
      const imgDataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const base64 = imgDataUrl.split(",")[1];
      const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const imgObjNum = objIndex++;
      const pageObjNum = objIndex++;

      // Image XObject
      xObjects.push(
        `${imgObjNum} 0 obj\n` +
        `<< /Type /XObject /Subtype /Image\n` +
        `/Width ${canvas.width} /Height ${canvas.height}\n` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8\n` +
        `/Filter /DCTDecode\n` +
        `/Length ${imgBytes.length} >>\n` +
        `stream\n`
      );

      // Page object
      pageObjects.push(
        `${pageObjNum} 0 obj\n` +
        `<< /Type /Page /Parent 2 0 R\n` +
        `/MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}]\n` +
        `/Resources << /XObject << /Im${imgObjNum} ${imgObjNum} 0 R >> >>\n` +
        `/Contents ${pageObjNum + 100000} 0 R >>\n` + // placeholder — we'll handle inline
        `>>\nendobj\n`
      );
    }
  }

  // Since manual PDF is complex with binary streams, use the simpler approach:
  // render all labels to one tall canvas then encode as single-image PDF.
  // Actually the cleanest zero-dep approach: build PDF with one page per label
  // using the canvas dataURL as a JPEG embedded in PDF.

  // We'll build it properly using the PDF spec with byte-accurate offsets.
  const pages: Array<{ canvas: HTMLCanvasElement; jpeg: Uint8Array }> = [];

  for (const { product, count, qr } of items) {
    for (let i = 0; i < count; i++) {
      const canvas = await renderLabelCanvas(product, qr, size);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const b64 = dataUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      pages.push({ canvas, jpeg: bytes });
    }
  }

  if (pages.length === 0) return new Blob([], { type: "application/pdf" });

  // Build PDF byte-by-byte
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;

  const write = (s: string) => {
    const b = enc.encode(s);
    parts.push(b);
    pos += b.length;
  };
  const writeBytes = (b: Uint8Array) => {
    parts.push(b);
    pos += b.length;
  };

  write("%PDF-1.4\n");
  write("%\xFF\xFF\xFF\xFF\n"); // binary marker

  const numPages = pages.length;
  // Object numbers:
  // 1 = catalog, 2 = pages, 3..2+N = page[i], 3+N..2+2N = content[i], 3+2N..2+3N = image[i]
  const pageBase = 3;
  const contentBase = pageBase + numPages;
  const imageBase = contentBase + numPages;

  // Obj 1: Catalog
  offsets[1] = pos;
  write(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // Obj 2: Pages
  offsets[2] = pos;
  const kidsStr = Array.from({ length: numPages }, (_, i) => `${pageBase + i} 0 R`).join(" ");
  write(`2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${numPages} >>\nendobj\n`);

  // Page + Content + Image objects
  for (let i = 0; i < pages.length; i++) {
    const { canvas, jpeg } = pages[i];
    const imgW = canvas.width;
    const imgH = canvas.height;

    // Page object
    offsets[pageBase + i] = pos;
    write(
      `${pageBase + i} 0 obj\n` +
      `<< /Type /Page /Parent 2 0 R\n` +
      `/MediaBox [0 0 ${pageW.toFixed(3)} ${pageH.toFixed(3)}]\n` +
      `/Contents ${contentBase + i} 0 R\n` +
      `/Resources << /XObject << /Im1 ${imageBase + i} 0 R >> >>\n` +
      `>>\nendobj\n`
    );

    // Content stream: draw image filling the page
    const stream = `q ${pageW.toFixed(3)} 0 0 ${pageH.toFixed(3)} 0 0 cm /Im1 Do Q`;
    offsets[contentBase + i] = pos;
    write(
      `${contentBase + i} 0 obj\n` +
      `<< /Length ${stream.length} >>\n` +
      `stream\n${stream}\nendstream\nendobj\n`
    );

    // Image XObject
    offsets[imageBase + i] = pos;
    write(
      `${imageBase + i} 0 obj\n` +
      `<< /Type /XObject /Subtype /Image\n` +
      `/Width ${imgW} /Height ${imgH}\n` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8\n` +
      `/Filter /DCTDecode /Length ${jpeg.length} >>\n` +
      `stream\n`
    );
    writeBytes(jpeg);
    write(`\nendstream\nendobj\n`);
  }

  // Cross-reference table
  const xrefOffset = pos;
  const totalObjs = imageBase + numPages; // last object number
  write(`xref\n0 ${totalObjs + 1}\n`);
  write(`0000000000 65535 f \n`);
  for (let i = 1; i <= totalObjs; i++) {
    write(`${String(offsets[i] ?? 0).padStart(10, "0")} 00000 n \n`);
  }

  write(
    `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`
  );

  // Merge all parts
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return new Blob([out], { type: "application/pdf" });
}

// ── EXCEL (no QR image, but QR data text) ─────────────────────────────────
function buildSheet(product: Product, count: number) {
  const qrData = `${displayCode(product.code)} | ${product.name} | ${inr(product.sellingPrice)}`;
  return XLSX.utils.json_to_sheet(
    Array.from({ length: count }, (_, i) => ({
      "No": i + 1,
      "Shop": "Anu Fashions",
      "Item Name": product.name,
      "Category": product.category?.name ?? "",
      "Code": displayCode(product.code),
      "Sell Price (₹)": product.sellingPrice,
      "QR Data (text)": qrData,
    }))
  );
}

function downloadExcelSingle(product: Product, count: number) {
  const wb = XLSX.utils.book_new();
  const ws = buildSheet(product, count);
  ws["!cols"] = [{ wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 44 }];
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(product.name));
  XLSX.writeFile(wb, `${safeName(product.name)}.xlsx`);
}

function downloadExcelAll(products: Product[], copies: Record<string, number>) {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  products.forEach((p) => {
    const count = copies[p.id] ?? 1;
    if (count <= 0) return;
    const ws = buildSheet(p, count);
    ws["!cols"] = [{ wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 44 }];
    let name = safeSheetName(p.name);
    let n = 2;
    while (used.has(name)) { name = safeSheetName(p.name).slice(0, 28) + `-${n++}`; }
    used.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  if (wb.SheetNames.length === 0) return;
  XLSX.writeFile(wb, "anu-fashions-labels.xlsx");
}

// ─────────────────────────────────────────────────────────────────────────
// ── WYSIWYG canvas preview ────────────────────────────────────────────────
function CanvasPreview({ product, qr, size }: { product: Product; qr: string; size: LabelSize }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    if (!qr) return;
    renderLabelCanvas(product, qr, size).then((c) => setSrc(c.toDataURL("image/png")));
  }, [product, qr, size]);
  const maxW = Math.min(size.w * 3, 380);
  const maxH = Math.round(maxW * (size.h / size.w));
  return src
    ? <img src={src} style={{ width: maxW, height: maxH, borderRadius: 6, border: "1px solid #ddd" }} alt="label preview" />
    : <div style={{ width: maxW, height: maxH, background: "#f5f5f0", borderRadius: 6 }} className="animate-pulse" />;
}

type Props = { products: Product[] };

export function LabelPrinter({ products }: Props) {
  const [open, setOpen] = useState(false);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [labelSize, setLabelSize] = useState<LabelSize>(DEFAULT_SIZE);
  const [customW, setCustomW] = useState(String(DEFAULT_SIZE.w));
  const [customH, setCustomH] = useState(String(DEFAULT_SIZE.h));
  const [showSizeSettings, setShowSizeSettings] = useState(false);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [pdfLoadingAll, setPdfLoadingAll] = useState(false);
  const [xlsLoadingId, setXlsLoadingId] = useState<string | null>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

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

  // ── PDF download (single item) ──────────────────────────────────────────
  const downloadPDFOne = async (product: Product) => {
    setPdfLoadingId(product.id);
    try {
      const qr = await generateQR(product);
      const count = copies[product.id] ?? 1;
      const blob = await generateLabelPDF([{ product, count, qr }], labelSize);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${safeName(product.name)}-labels.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally { setPdfLoadingId(null); }
  };

  // ── PDF download (all items) ─────────────────────────────────────────────
  const downloadPDFAll = async () => {
    setPdfLoadingAll(true);
    try {
      const items = await Promise.all(
        products
          .filter((p) => (copies[p.id] ?? 1) > 0)
          .map(async (p) => ({ product: p, count: copies[p.id] ?? 1, qr: await generateQR(p) }))
      );
      const blob = await generateLabelPDF(items, labelSize);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "anu-fashions-all-labels.pdf"; a.click();
      URL.revokeObjectURL(url);
    } finally { setPdfLoadingAll(false); }
  };

  // ── Excel download ───────────────────────────────────────────────────────
  const handleXlsOne = (product: Product) => {
    setXlsLoadingId(product.id);
    setTimeout(() => { downloadExcelSingle(product, copies[product.id] ?? 1); setXlsLoadingId(null); }, 50);
  };

  // ── Copy image ───────────────────────────────────────────────────────────
  const copyLabelImage = async (product: Product) => {
    const qr = await generateQR(product);
    const canvas = await renderLabelCanvas(product, qr, labelSize);
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => b ? res(b) : rej(new Error("failed")), "image/png")
    );
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopiedId(product.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `label-${safeName(product.name)}.png`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ── Preview ──────────────────────────────────────────────────────────────
  const previewOne = async (product: Product) => { await generateQR(product); setPreviewProduct(product); };

  // ── Print (browser) ──────────────────────────────────────────────────────
  const buildLabelHTML = (items: { product: Product; count: number; qr: string }[], size: LabelSize) => {
    const labels = items.flatMap(({ product, count, qr }) =>
      Array.from({ length: count }).map(() => `
        <div class="label">
          <div class="qr"><img src="${qr}" /></div>
          <div class="info">
            <div class="shop">Anu Fashions</div>
            <div class="name">${product.name.length > 35 ? product.name.slice(0, 33) + "…" : product.name}</div>
            ${product.category?.name ? `<div class="cat">${product.category.name}</div>` : ""}
            <div class="code">${displayCode(product.code)}</div>
            <div class="price">${inr(product.sellingPrice)}</div>
          </div>
        </div>`)
    );
    const scale = Math.max(0.7, size.h / 50);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; background: white; }
      .label { width:${size.w}mm; height:${size.h}mm; display:flex; align-items:stretch; gap:2mm; padding:2mm; overflow:hidden; page-break-after:always; }
      .qr { flex-shrink:0; display:flex; align-items:center; }
      .qr img { display:block; width:calc(${size.h}mm - 4mm); height:calc(${size.h}mm - 4mm); }
      .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; gap:${(1.2 * scale).toFixed(1)}mm; }
      .shop  { font-size:${(5.5 * scale).toFixed(1)}pt; font-weight:900; color:#000; }
      .name  { font-size:${(7 * scale).toFixed(1)}pt;   font-weight:900; color:#000; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .cat   { font-size:${(5.5 * scale).toFixed(1)}pt; font-weight:700; color:#000; }
      .code  { font-size:${(5.5 * scale).toFixed(1)}pt; font-weight:700; color:#000; font-family:monospace; }
      .price { font-size:${(9.5 * scale).toFixed(1)}pt; font-weight:900; color:#000; }
      @media print { @page { size:${size.w}mm ${size.h}mm; margin:0; } body { margin:0; } .label { page-break-after:always; } }
    </style></head><body>${labels.join("")}</body></html>`;
  };

  const printOne = async (product: Product) => {
    const qr = await generateQR(product);
    const count = copies[product.id] ?? 1;
    const html = buildLabelHTML([{ product, count, qr }], labelSize);
    const iframe = printFrameRef.current; if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document; if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }, 300);
  };

  const applyCustomSize = () => {
    const w = Number(customW); const h = Number(customH);
    if (w > 0 && h > 0) setLabelSize({ w, h, label: `${w}×${h}mm` });
  };

  const totalLabels = products.reduce((s, p) => s + (copies[p.id] ?? p.quantity ?? 1), 0);
  const activeItems = products.filter((p) => (copies[p.id] ?? p.quantity ?? 1) > 0).length;

  return (
    <>
      <Button variant="secondary" onClick={openDrawer}>
        <FileText className="mr-2 h-4 w-4" />
        Labels
      </Button>

      <iframe ref={printFrameRef} style={{ position: "fixed", top: -9999, left: -9999, width: 0, height: 0, border: "none" }} title="print" />

      <Drawer open={open} onClose={() => setOpen(false)} title="Labels / లేబుల్లు ప్రింట్">
        <div className="space-y-4">

          {/* ── Size selector ── */}
          <div className="bg-brand-50 rounded-xl px-3 py-2.5 space-y-2">
            <p className="text-xs font-bold text-brand-700 uppercase tracking-wide">Label Size (Sezink Josh)</p>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setLabelSize(p); setCustomW(String(p.w)); setCustomH(String(p.h)); }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition leading-tight ${
                    labelSize.w === p.w && labelSize.h === p.h
                      ? "bg-brand-700 text-white" : "bg-white text-brand-700 border border-brand-200 hover:border-brand-400"
                  }`}
                >{p.label}</button>
              ))}
            </div>
            <button onClick={() => setShowSizeSettings((v) => !v)} className="text-xs text-brand-600 flex items-center gap-1">
              <Settings2 className="h-3 w-3" /> Custom size
            </button>
            {showSizeSettings && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-brand-100">
                <span className="text-xs text-slate-500">W mm:</span>
                <input type="number" value={customW} onChange={(e) => setCustomW(e.target.value)} className="w-14 rounded-lg border border-brand-200 px-2 py-1 text-sm text-center" />
                <span className="text-xs text-slate-500">H mm:</span>
                <input type="number" value={customH} onChange={(e) => setCustomH(e.target.value)} className="w-14 rounded-lg border border-brand-200 px-2 py-1 text-sm text-center" />
                <button onClick={applyCustomSize} className="rounded-lg bg-brand-700 text-white px-3 py-1 text-xs font-semibold">Apply</button>
              </div>
            )}
            <p className="text-xs text-slate-500">Selected: <span className="font-semibold text-brand-700">{labelSize.w}×{labelSize.h}mm</span></p>
          </div>

          {/* ── Item list ── */}
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

                  {/* Count selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 shrink-0">Labels:</span>
                    <button onClick={() => setCopy(p.id, count - 1)} className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 font-bold flex items-center justify-center hover:bg-brand-100">−</button>
                    <input
                      type="number" value={count} min={0} max={p.quantity}
                      onChange={(e) => setCopy(p.id, Math.min(Number(e.target.value), p.quantity))}
                      className="w-14 text-center text-sm font-bold rounded-lg border border-brand-200 py-1 focus:border-brand-500 focus:outline-none"
                    />
                    <button onClick={() => setCopy(p.id, Math.min(count + 1, p.quantity))} className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 font-bold flex items-center justify-center hover:bg-brand-100">+</button>
                    <span className="text-xs text-slate-400">/ {p.quantity}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {/* PRIMARY: PDF with QR */}
                    <button
                      onClick={() => downloadPDFOne(p)}
                      disabled={count === 0 || pdfLoadingId === p.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-700 rounded-lg hover:bg-brand-800 disabled:opacity-40 transition"
                    >
                      <FileText className="h-3 w-3" />
                      {pdfLoadingId === p.id ? "Building…" : `PDF (${count} labels)`}
                    </button>

                    {/* Excel (no QR image) */}
                    <button
                      onClick={() => handleXlsOne(p)}
                      disabled={count === 0 || xlsLoadingId === p.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 disabled:opacity-40 transition"
                    >
                      <FileSpreadsheet className="h-3 w-3" />
                      {xlsLoadingId === p.id ? "…" : "Excel"}
                    </button>

                    {/* Copy image */}
                    <button
                      onClick={() => copyLabelImage(p)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                        copiedId === p.id ? "bg-green-100 text-green-700 border-green-300" : "bg-white text-brand-600 border-brand-200 hover:bg-brand-50"
                      }`}
                    >
                      <Copy className="h-3 w-3" />
                      {copiedId === p.id ? "Copied!" : "Copy"}
                    </button>

                    {/* Preview */}
                    <button onClick={() => previewOne(p)} className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition">
                      Preview
                    </button>

                    {/* Print */}
                    <button onClick={() => printOne(p)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition">
                      <Printer className="h-3 w-3" /> Print
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Footer: Download All PDF ── */}
          <div className="sticky bottom-0 bg-white border-t border-brand-100 pt-3 pb-1 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{activeItems} items · {totalLabels} total labels</span>
              <button
                onClick={() => { const d: Record<string,number> = {}; products.forEach((p) => { d[p.id] = p.quantity || 1; }); setCopies(d); }}
                className="text-brand-600 underline"
              >Reset to stock qty</button>
            </div>
            <Button
              className="w-full"
              onClick={downloadPDFAll}
              disabled={pdfLoadingAll || totalLabels === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {pdfLoadingAll ? "Building PDF…" : `Download All (${totalLabels} labels) as PDF`}
            </Button>
            <button
              onClick={() => downloadExcelAll(products, copies)}
              disabled={totalLabels === 0}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50 disabled:opacity-40 transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Download All as Excel (without QR image)
            </button>
          </div>
        </div>
      </Drawer>

      {/* Label preview modal — shows actual rendered canvas (WYSIWYG) */}
      <Modal open={!!previewProduct} onClose={() => setPreviewProduct(null)} title="Label Preview" size="sm">
        {previewProduct && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 text-center">{labelSize.w}×{labelSize.h}mm — {copies[previewProduct.id] ?? 1} label(s)</p>
            <div className="flex justify-center">
              {/* Render actual canvas to an img so preview = exactly what prints */}
              <CanvasPreview product={previewProduct} qr={qrMap[previewProduct.id] ?? ""} size={labelSize} />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPreviewProduct(null)}>Close</Button>
              <Button variant="secondary" className="flex-1" onClick={() => copyLabelImage(previewProduct)}>
                <Copy className="mr-2 h-3 w-3" />{copiedId === previewProduct.id ? "Copied!" : "Copy"}
              </Button>
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
