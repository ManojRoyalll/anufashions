import { useRef, useState } from "react";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { Printer, Settings2, Copy, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Modal } from "@/components/ui/modal";
import { inr } from "@/lib/utils";

type Product = {
  id: string; code: string; name: string;
  sellingPrice: number; quantity: number; category?: { name: string };
};

type LabelSize = { w: number; h: number };

const LABEL_PRESETS: { label: string; size: LabelSize }[] = [
  { label: "50×30mm", size: { w: 50, h: 30 } },
  { label: "62×29mm", size: { w: 62, h: 29 } },
  { label: "62×38mm", size: { w: 62, h: 38 } },
  { label: "100×50mm", size: { w: 100, h: 50 } },
];

function displayCode(code: string): string {
  return code || "ANU-000";
}

function safeSheetName(name: string): string {
  // Excel sheet names: max 31 chars, no special chars
  return name.replace(/[\\\/\[\]\*\?\:]/g, "").slice(0, 31) || "Label";
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim().replace(/\s+/g, "-") || "label";
}

// Build an Excel workbook sheet for one product, repeated `count` times
function buildSheet(product: Product, count: number) {
  const qrData = `${displayCode(product.code)} | ${product.name} | ${inr(product.sellingPrice)}`;
  const rows = Array.from({ length: count }, (_, i) => ({
    "No": i + 1,
    "Shop": "Anu Fashions",
    "Item Name": product.name,
    "Category": product.category?.name ?? "",
    "Code": displayCode(product.code),
    "Sell Price (₹)": product.sellingPrice,
    "QR Data": qrData,
  }));
  return XLSX.utils.json_to_sheet(rows);
}

// Download a workbook with one sheet for one product
function downloadSingle(product: Product, count: number) {
  const wb = XLSX.utils.book_new();
  const ws = buildSheet(product, count);
  // Column widths
  ws["!cols"] = [
    { wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 14 },
    { wch: 20 }, { wch: 14 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(product.name));
  XLSX.writeFile(wb, `${safeName(product.name)}.xlsx`);
}

// Download a workbook with one sheet per product
function downloadAll(products: Product[], copies: Record<string, number>) {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  products.forEach((p) => {
    const count = copies[p.id] ?? 1;
    if (count <= 0) return;
    const ws = buildSheet(p, count);
    ws["!cols"] = [
      { wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 14 },
      { wch: 20 }, { wch: 14 }, { wch: 40 },
    ];
    // Deduplicate sheet names
    let name = safeSheetName(p.name);
    let n = 2;
    while (used.has(name)) { name = safeSheetName(p.name).slice(0, 28) + `-${n++}`; }
    used.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  if (wb.SheetNames.length === 0) return;
  XLSX.writeFile(wb, "anu-fashions-labels.xlsx");
}

// Renders label to canvas for copy/preview
async function renderLabelToCanvas(
  product: Product,
  qrDataUrl: string,
  size: LabelSize
): Promise<HTMLCanvasElement> {
  const DPI = 300;
  const MM = DPI / 25.4;
  const PT = DPI / 72;
  const W = Math.round(size.w * MM);
  const H = Math.round(size.h * MM);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#ccc"; ctx.lineWidth = Math.max(1, 0.3 * MM);
  ctx.strokeRect(0, 0, W, H);
  const pad = 2 * MM; const gap = 2 * MM;
  const qrSizePx = Math.min(size.h - 4, 40) * MM;
  const qrImg = new Image(); qrImg.src = qrDataUrl;
  await new Promise<void>((res) => { qrImg.onload = () => res(); });
  ctx.drawImage(qrImg, pad, (H - qrSizePx) / 2, qrSizePx, qrSizePx);
  const textX = pad + qrSizePx + gap;
  const textMaxW = W - textX - pad;
  let y = pad;
  const truncate = (text: string, font: string, maxW: number) => {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
    return t + "…";
  };
  const shopFont = `bold ${Math.round(6.5 * PT)}px Arial`;
  ctx.fillStyle = "#666"; ctx.font = shopFont;
  y += Math.round(6.5 * PT); ctx.fillText("Anu Fashions", textX, y); y += Math.round(1 * MM);
  const nameFont = `bold ${Math.round(7.5 * PT)}px Arial`;
  ctx.fillStyle = "#000"; y += Math.round(7.5 * PT);
  ctx.fillText(truncate(product.name, nameFont, textMaxW), textX, y); y += Math.round(0.8 * MM);
  if (product.category?.name) {
    const catFont = `${Math.round(6 * PT)}px Arial`;
    ctx.fillStyle = "#555"; ctx.font = catFont;
    y += Math.round(6 * PT); ctx.fillText(product.category.name, textX, y); y += Math.round(0.5 * MM);
  }
  const codeFont = `${Math.round(6 * PT)}px monospace`;
  ctx.fillStyle = "#333"; ctx.font = codeFont;
  y += Math.round(6 * PT);
  ctx.fillText(truncate(displayCode(product.code), codeFont, textMaxW), textX, y); y += Math.round(0.5 * MM);
  const pricePt = size.h > 35 ? 12 : 10;
  const priceFont = `bold ${Math.round(pricePt * PT)}px Arial`;
  ctx.fillStyle = "#000"; ctx.font = priceFont;
  y += Math.round(pricePt * PT); ctx.fillText(inr(product.sellingPrice), textX, y);
  return canvas;
}

type Props = { products: Product[] };

export function LabelPrinter({ products }: Props) {
  const [open, setOpen] = useState(false);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [labelSize, setLabelSize] = useState<LabelSize>({ w: 50, h: 30 });
  const [customW, setCustomW] = useState("50");
  const [customH, setCustomH] = useState("30");
  const [showSizeSettings, setShowSizeSettings] = useState(false);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const openDrawer = () => {
    const defaultCopies: Record<string, number> = {};
    products.forEach((p) => { defaultCopies[p.id] = p.quantity || 1; });
    setCopies(defaultCopies);
    setOpen(true);
  };

  const setCopy = (id: string, val: number) =>
    setCopies((prev) => ({ ...prev, [id]: Math.max(0, val) }));

  const generateQR = async (product: Product) => {
    if (qrMap[product.id]) return qrMap[product.id];
    const data = `${displayCode(product.code)} | ${product.name} | ${inr(product.sellingPrice)}`;
    const url = await QRCode.toDataURL(data, { width: 80, margin: 0, color: { dark: "#000", light: "#fff" } });
    setQrMap((prev) => ({ ...prev, [product.id]: url }));
    return url;
  };

  // ── EXCEL DOWNLOAD ────────────────────────────────────────────────────────
  const handleDownloadOne = (product: Product) => {
    const count = copies[product.id] ?? 1;
    if (count <= 0) return;
    setDownloadingId(product.id);
    setTimeout(() => {
      downloadSingle(product, count);
      setDownloadingId(null);
    }, 50);
  };

  const handleDownloadAll = () => {
    setDownloadingAll(true);
    setTimeout(() => {
      downloadAll(products, copies);
      setDownloadingAll(false);
    }, 50);
  };

  // ── PRINT ─────────────────────────────────────────────────────────────────
  const buildLabelHTML = (items: { product: Product; count: number; qr: string }[], size: LabelSize) => {
    const qrSize = Math.min(size.h - 4, 40);
    const labels = items.flatMap(({ product, count, qr }) =>
      Array.from({ length: count }).map(() => `
        <div class="label">
          <div class="qr"><img src="${qr}" width="${qrSize}" height="${qrSize}" /></div>
          <div class="info">
            <div class="shop">Anu Fashions</div>
            <div class="title">${product.name.length > 30 ? product.name.slice(0, 28) + "…" : product.name}</div>
            ${product.category?.name ? `<div class="cat">${product.category.name}</div>` : ""}
            <div class="code">${displayCode(product.code)}</div>
            <div class="price">${inr(product.sellingPrice)}</div>
          </div>
        </div>`)
    );
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; background: white; }
      .label { width:${size.w}mm; height:${size.h}mm; display:flex; align-items:center; gap:2mm; padding:2mm 2.5mm; border:0.3mm solid #ccc; overflow:hidden; page-break-after:always; }
      .qr { flex-shrink:0; } .qr img { display:block; } .info { flex:1; overflow:hidden; }
      .shop { font-size:6.5pt; color:#666; font-weight:bold; }
      .title { font-size:7.5pt; font-weight:bold; color:#000; line-height:1.2; margin:0.3mm 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .cat { font-size:6pt; color:#555; } .code { font-size:6pt; color:#333; font-family:monospace; margin-top:0.3mm; }
      .price { font-size:${size.h > 35 ? 12 : 10}pt; font-weight:bold; color:#000; margin-top:0.5mm; }
      @media print { @page { size:${size.w}mm ${size.h}mm; margin:0; } .label { border:none; } }
    </style></head><body>${labels.join("")}</body></html>`;
  };

  const printOne = async (product: Product) => {
    const qr = await generateQR(product);
    const count = copies[product.id] ?? 1;
    const html = buildLabelHTML([{ product, count, qr }], labelSize);
    const iframe = printFrameRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }, 300);
  };

  // ── COPY IMAGE ────────────────────────────────────────────────────────────
  const copyLabelImage = async (product: Product) => {
    const qr = await generateQR(product);
    const canvas = await renderLabelToCanvas(product, qr, labelSize);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("failed")), "image/png")
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

  const previewOne = async (product: Product) => {
    await generateQR(product);
    setPreviewProduct(product);
  };

  const applyCustomSize = () => {
    const w = Number(customW); const h = Number(customH);
    if (w > 0 && h > 0) setLabelSize({ w, h });
  };

  const totalLabels = products.reduce((s, p) => s + (copies[p.id] ?? p.quantity ?? 1), 0);
  const activeItems = products.filter((p) => (copies[p.id] ?? p.quantity ?? 1) > 0).length;

  return (
    <>
      <Button variant="secondary" onClick={openDrawer}>
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Labels
      </Button>

      <iframe ref={printFrameRef} style={{ position: "fixed", top: -9999, left: -9999, width: 0, height: 0, border: "none" }} title="print" />

      <Drawer open={open} onClose={() => setOpen(false)} title="Labels / లేబుల్లు">
        <div className="space-y-4">
          {/* ── Size selector ── */}
          <div className="bg-brand-50 rounded-xl px-3 py-2.5 space-y-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs font-semibold text-brand-700 mr-1">Size:</span>
              {LABEL_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setLabelSize(p.size); setCustomW(String(p.size.w)); setCustomH(String(p.size.h)); }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    labelSize.w === p.size.w && labelSize.h === p.size.h
                      ? "bg-brand-700 text-white" : "bg-white text-brand-700 border border-brand-200"
                  }`}
                >{p.label}</button>
              ))}
              <button onClick={() => setShowSizeSettings((v) => !v)} className="rounded-lg px-2 py-1 text-xs text-brand-600 border border-brand-200 bg-white flex items-center gap-1">
                <Settings2 className="h-3 w-3" /> Custom
              </button>
            </div>
            {showSizeSettings && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-brand-100">
                <span className="text-xs text-slate-500">W(mm):</span>
                <input type="number" value={customW} onChange={(e) => setCustomW(e.target.value)} className="w-14 rounded-lg border border-brand-200 px-2 py-1 text-sm text-center" />
                <span className="text-xs text-slate-500">×H(mm):</span>
                <input type="number" value={customH} onChange={(e) => setCustomH(e.target.value)} className="w-14 rounded-lg border border-brand-200 px-2 py-1 text-sm text-center" />
                <button onClick={applyCustomSize} className="rounded-lg bg-brand-700 text-white px-3 py-1 text-xs font-semibold">Apply</button>
                <span className="text-xs text-brand-600 font-semibold">{labelSize.w}×{labelSize.h}mm</span>
              </div>
            )}
          </div>

          {/* ── Item list ── */}
          <div className="space-y-2">
            {products.map((p) => {
              const count = copies[p.id] ?? p.quantity ?? 1;
              return (
                <div key={p.id} className="rounded-xl border border-brand-100 bg-white p-3 space-y-2.5">
                  {/* Name + meta */}
                  <div>
                    <p className="text-sm font-semibold text-brand-900 leading-tight">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{displayCode(p.code)} · {p.category?.name ?? "—"} · {inr(p.sellingPrice)}</p>
                    <p className="text-xs text-brand-600 font-medium">Stock: {p.quantity}</p>
                  </div>

                  {/* Count control */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 shrink-0">Labels:</span>
                    <button
                      onClick={() => setCopy(p.id, count - 1)}
                      className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 font-bold text-sm flex items-center justify-center hover:bg-brand-100"
                    >−</button>
                    <input
                      type="number"
                      value={count}
                      min={0}
                      max={p.quantity}
                      onChange={(e) => setCopy(p.id, Math.min(Number(e.target.value), p.quantity))}
                      className="w-14 text-center text-sm font-bold rounded-lg border border-brand-200 py-1 focus:border-brand-500 focus:outline-none"
                    />
                    <button
                      onClick={() => setCopy(p.id, Math.min(count + 1, p.quantity))}
                      className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 font-bold text-sm flex items-center justify-center hover:bg-brand-100"
                    >+</button>
                    <span className="text-xs text-slate-400">/ {p.quantity}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {/* Primary: Download Excel */}
                    <button
                      onClick={() => handleDownloadOne(p)}
                      disabled={count === 0 || downloadingId === p.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-brand-700 rounded-lg hover:bg-brand-800 disabled:opacity-40 transition"
                    >
                      <FileSpreadsheet className="h-3 w-3" />
                      {downloadingId === p.id ? "…" : `Excel (${count})`}
                    </button>

                    {/* Copy image */}
                    <button
                      onClick={() => copyLabelImage(p)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                        copiedId === p.id
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "bg-white text-brand-600 border-brand-200 hover:bg-brand-50"
                      }`}
                    >
                      <Copy className="h-3 w-3" />
                      {copiedId === p.id ? "Copied!" : "Copy"}
                    </button>

                    {/* Preview */}
                    <button
                      onClick={() => previewOne(p)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 bg-white rounded-lg hover:bg-brand-50 transition"
                    >
                      Preview
                    </button>

                    {/* Print (secondary) */}
                    <button
                      onClick={() => printOne(p)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition"
                    >
                      <Printer className="h-3 w-3" /> Print
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Download All footer ── */}
          <div className="sticky bottom-0 bg-white border-t border-brand-100 pt-3 pb-1 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{activeItems} items · {totalLabels} total labels</span>
              <button
                onClick={() => {
                  const reset: Record<string, number> = {};
                  products.forEach((p) => { reset[p.id] = p.quantity || 1; });
                  setCopies(reset);
                }}
                className="text-brand-600 underline"
              >Reset to stock qty</button>
            </div>
            <Button
              className="w-full"
              onClick={handleDownloadAll}
              disabled={downloadingAll || totalLabels === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {downloadingAll ? "Building…" : `Download All Labels (${totalLabels}) as Excel`}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Label preview modal */}
      <Modal open={!!previewProduct} onClose={() => setPreviewProduct(null)} title="Label Preview" size="sm">
        {previewProduct && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 text-center">{labelSize.w}×{labelSize.h}mm · {copies[previewProduct.id] ?? 1} labels</p>
            <div className="flex justify-center">
              <div style={{
                width: `${Math.min(labelSize.w * 3, 300)}px`,
                height: `${Math.min(labelSize.h * 3, 150)}px`,
                border: "2px dashed #bdc791", borderRadius: "8px",
                display: "flex", alignItems: "center", gap: "8px",
                padding: "8px 12px", background: "white"
              }}>
                {qrMap[previewProduct.id] && (
                  <img src={qrMap[previewProduct.id]} width={Math.min(labelSize.h * 2.2, 66)} height={Math.min(labelSize.h * 2.2, 66)} alt="QR" style={{ flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "10px", color: "#666", fontWeight: "bold" }}>Anu Fashions</div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewProduct.name}</div>
                  {previewProduct.category?.name && <div style={{ fontSize: "9px", color: "#555" }}>{previewProduct.category.name}</div>}
                  <div style={{ fontSize: "9px", fontFamily: "monospace" }}>{displayCode(previewProduct.code)}</div>
                  <div style={{ fontSize: "15px", fontWeight: "bold" }}>{inr(previewProduct.sellingPrice)}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPreviewProduct(null)}>Close</Button>
              <Button variant="secondary" className="flex-1" onClick={() => copyLabelImage(previewProduct)}>
                <Copy className="mr-2 h-3 w-3" />
                {copiedId === previewProduct.id ? "Copied!" : "Copy Image"}
              </Button>
              <Button className="flex-1" onClick={() => { handleDownloadOne(previewProduct); setPreviewProduct(null); }}>
                <Download className="mr-2 h-3 w-3" />Excel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
