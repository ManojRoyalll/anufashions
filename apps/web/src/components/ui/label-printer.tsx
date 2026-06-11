import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Printer, X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  if (code && code.startsWith("ANU-") && code.length > 16) return code.slice(0, 12);
  return code || "ANU-000";
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
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const openModal = () => {
    // Default copies = stock quantity per item
    const defaultCopies: Record<string, number> = {};
    products.forEach((p) => { defaultCopies[p.id] = p.quantity || 1; });
    setCopies(defaultCopies);
    setOpen(true);
  };

  const setCopy = (id: string, val: number) =>
    setCopies((prev) => ({ ...prev, [id]: Math.max(1, val) }));

  const generateQR = async (product: Product) => {
    if (qrMap[product.id]) return qrMap[product.id];
    const data = `${displayCode(product.code)} | ${product.name} | ${inr(product.sellingPrice)}`;
    const url = await QRCode.toDataURL(data, { width: 80, margin: 0, color: { dark: "#000", light: "#fff" } });
    setQrMap((prev) => ({ ...prev, [product.id]: url }));
    return url;
  };

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
        </div>
      `)
    );

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; background: white; }
      .label { width:${size.w}mm; height:${size.h}mm; display:flex; align-items:center; gap:2mm; padding:2mm 2.5mm; border:0.3mm solid #ccc; overflow:hidden; page-break-after:always; }
      .qr { flex-shrink:0; }
      .qr img { display:block; }
      .info { flex:1; overflow:hidden; }
      .shop { font-size:6.5pt; color:#666; font-weight:bold; }
      .title { font-size:7.5pt; font-weight:bold; color:#000; line-height:1.2; margin:0.3mm 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .cat { font-size:6pt; color:#555; }
      .code { font-size:6pt; color:#333; font-family:monospace; margin-top:0.3mm; }
      .price { font-size:${size.h > 35 ? 12 : 10}pt; font-weight:bold; color:#000; margin-top:0.5mm; }
      @media print { @page { size:${size.w}mm ${size.h}mm; margin:0; } .label { border:none; } }
    </style></head><body>${labels.join("")}</body></html>`;
  };

  const printOne = async (product: Product) => {
    const qr = await generateQR(product);
    const count = copies[product.id] || product.quantity || 1;
    const html = buildLabelHTML([{ product, count, qr }], labelSize);
    const iframe = printFrameRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }, 300);
  };

  const printAll = async () => {
    const items = await Promise.all(
      products.map(async (p) => ({
        product: p,
        count: copies[p.id] || p.quantity || 1,
        qr: await generateQR(p)
      }))
    );
    const html = buildLabelHTML(items.filter((i) => i.count > 0), labelSize);
    const iframe = printFrameRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }, 300);
  };

  const previewOne = async (product: Product) => {
    await generateQR(product);
    setPreviewProduct(product);
  };

  const applyCustomSize = () => {
    const w = Number(customW);
    const h = Number(customH);
    if (w > 0 && h > 0) setLabelSize({ w, h });
  };

  const totalLabels = products.reduce((s, p) => s + (copies[p.id] || p.quantity || 1), 0);

  return (
    <>
      <Button variant="secondary" onClick={openModal}>
        <Printer className="mr-2 h-4 w-4" />
        Print Labels
      </Button>

      <iframe ref={printFrameRef} style={{ position: "fixed", top: -9999, left: -9999, width: 0, height: 0, border: "none" }} title="print" />

      <Modal open={open} onClose={() => setOpen(false)} title="Print Labels / లేబుల్లు ప్రింట్ చేయి" size="lg">
        <div className="space-y-4">
          {/* Label size controls */}
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
                >
                  {p.label}
                </button>
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

          {/* Item list with quantity control — stacked on mobile */}
          <div className="max-h-72 overflow-y-auto space-y-2">
            {products.map((p) => (
              <div key={p.id} className="rounded-xl bg-brand-50 p-3 space-y-2">
                {/* Item name + details */}
                <div>
                  <p className="text-sm font-semibold text-brand-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{displayCode(p.code)} · {p.category?.name} · {inr(p.sellingPrice)} · Stock: {p.quantity}</p>
                </div>
                {/* Controls row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Labels:</span>
                    <button onClick={() => setCopy(p.id, (copies[p.id] || p.quantity || 1) - 1)} className="w-8 h-8 rounded-lg bg-white border border-brand-200 text-brand-700 font-bold flex items-center justify-center hover:bg-brand-100">−</button>
                    <input
                      type="number"
                      value={copies[p.id] ?? p.quantity ?? 1}
                      onChange={(e) => setCopy(p.id, Number(e.target.value))}
                      className="w-14 text-center text-sm font-bold rounded-lg border border-brand-200 py-1.5"
                    />
                    <button onClick={() => setCopy(p.id, (copies[p.id] || p.quantity || 1) + 1)} className="w-8 h-8 rounded-lg bg-white border border-brand-200 text-brand-700 font-bold flex items-center justify-center hover:bg-brand-100">+</button>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => previewOne(p)} className="px-3 py-1.5 text-xs text-brand-600 border border-brand-200 bg-white rounded-lg hover:bg-brand-50 font-medium">Preview</button>
                    <button onClick={() => printOne(p)} className="px-3 py-1.5 text-xs text-white bg-brand-700 rounded-lg hover:bg-brand-800 flex items-center gap-1 font-medium">
                      <Printer className="h-3 w-3" /> Print
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-brand-50 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-brand-900">{products.length} items · {totalLabels} total labels</span>
            <Button onClick={printAll}>
              <Printer className="mr-2 h-4 w-4" />
              Print All ({totalLabels})
            </Button>
          </div>
        </div>
      </Modal>

      {/* Single label preview */}
      <Modal open={!!previewProduct} onClose={() => setPreviewProduct(null)} title="Label Preview" size="sm">
        {previewProduct && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 text-center">{labelSize.w}×{labelSize.h}mm label preview</p>
            <div className="flex justify-center">
              <div style={{
                width: `${Math.min(labelSize.w * 3, 300)}px`,
                height: `${Math.min(labelSize.h * 3, 150)}px`,
                border: "2px dashed #bdc791",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                background: "white"
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
            <p className="text-xs text-center text-slate-400">Printing {copies[previewProduct.id] || previewProduct.quantity || 1} labels for this item</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setPreviewProduct(null)}><X className="mr-2 h-4 w-4" />Close</Button>
              <Button className="flex-1" onClick={() => { setPreviewProduct(null); printOne(previewProduct); }}>
                <Printer className="mr-2 h-4 w-4" />Print
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
