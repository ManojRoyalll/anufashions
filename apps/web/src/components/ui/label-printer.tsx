import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Printer, CheckSquare, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { inr } from "@/lib/utils";

type Product = {
  id: string; code: string; name: string;
  sellingPrice: number; category?: { name: string };
};

type LabelItem = Product & { copies: number };

type Props = {
  products: Product[];
};

// Generate a short saree code if product.code is the auto-generated ANU-timestamp form
function displayCode(code: string): string {
  // If it's an auto-generated code like ANU-1718000000000-XYZ, shorten it
  if (code && code.startsWith("ANU-") && code.length > 16) {
    return code.slice(0, 12);
  }
  return code || "ANU-000";
}

export function LabelPrinter({ products }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [labelItems, setLabelItems] = useState<LabelItem[]>([]);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  // When modal opens, pre-select all
  const openModal = () => {
    setSelected(new Set(products.map((p) => p.id)));
    setOpen(true);
  };

  // Build label items from selection
  useEffect(() => {
    const items = products
      .filter((p) => selected.has(p.id))
      .map((p) => ({ ...p, copies: 1 }));
    setLabelItems(items);
  }, [selected, products]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateCopies = (id: string, val: number) => {
    setLabelItems((prev) => prev.map((i) => i.id === id ? { ...i, copies: Math.max(1, val) } : i));
  };

  // Generate QR codes for all label items
  const generateQRCodes = async (items: LabelItem[]) => {
    const map: Record<string, string> = {};
    for (const item of items) {
      const data = `${displayCode(item.code)} | ${item.name} | ${inr(item.sellingPrice)}`;
      map[item.id] = await QRCode.toDataURL(data, { width: 80, margin: 0, color: { dark: "#000", light: "#fff" } });
    }
    setQrDataUrls(map);
    return map;
  };

  // Build print HTML for Sezink Josh (62mm × 29mm labels)
  const buildPrintHTML = (items: LabelItem[], qrMap: Record<string, string>) => {
    const labels: string[] = [];

    for (const item of items) {
      for (let i = 0; i < item.copies; i++) {
        const qr = qrMap[item.id] || "";
        const code = displayCode(item.code);
        const name = item.name.length > 28 ? item.name.slice(0, 26) + "…" : item.name;
        const cat = item.category?.name || "";

        labels.push(`
          <div class="label">
            <div class="qr">
              <img src="${qr}" width="48" height="48" />
            </div>
            <div class="info">
              <div class="shop">Anu Fashions</div>
              <div class="title">${name}</div>
              ${cat ? `<div class="cat">${cat}</div>` : ""}
              <div class="code">${code}</div>
              <div class="price">${inr(item.sellingPrice)}</div>
            </div>
          </div>
        `);
      }
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: white; }
  .label {
    width: 62mm;
    height: 29mm;
    display: flex;
    align-items: center;
    gap: 3mm;
    padding: 2mm 3mm;
    border: 0.3mm solid #ccc;
    page-break-after: always;
    overflow: hidden;
  }
  .qr { flex-shrink: 0; }
  .qr img { display: block; }
  .info { flex: 1; overflow: hidden; }
  .shop { font-size: 7pt; color: #666; font-weight: bold; letter-spacing: 0.3px; }
  .title { font-size: 8pt; font-weight: bold; color: #000; line-height: 1.2; margin: 0.5mm 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cat { font-size: 6.5pt; color: #555; }
  .code { font-size: 6.5pt; color: #333; font-family: monospace; margin-top: 0.5mm; }
  .price { font-size: 11pt; font-weight: bold; color: #000; margin-top: 1mm; }
  @media print {
    @page { size: 62mm 29mm; margin: 0; }
    body { margin: 0; }
    .label { border: none; page-break-after: always; }
  }
</style>
</head>
<body>
${labels.join("\n")}
</body>
</html>`;
  };

  const printLabels = async () => {
    if (labelItems.length === 0) return;
    const qrMap = await generateQRCodes(labelItems);
    const html = buildPrintHTML(labelItems, qrMap);

    const iframe = printFrameRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  };

  const previewLabels = async () => {
    const qrMap = await generateQRCodes(labelItems);
    setQrDataUrls(qrMap);
    setPreviewOpen(true);
  };

  const totalLabels = labelItems.reduce((s, i) => s + i.copies, 0);

  return (
    <>
      <Button variant="secondary" onClick={openModal}>
        <Printer className="mr-2 h-4 w-4" />
        Print Labels
      </Button>

      {/* Hidden print iframe */}
      <iframe ref={printFrameRef} style={{ position: "fixed", top: -9999, left: -9999, width: 0, height: 0, border: "none" }} title="print" />

      {/* Selection modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Print Labels / లేబుల్లు ప్రింట్ చేయి" size="lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Select items and set copies per item. Labels print on Sezink Josh 62×29mm.</p>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set(products.map((p) => p.id)))} className="text-xs text-brand-600 hover:underline">All</button>
              <span className="text-slate-300">|</span>
              <button onClick={() => setSelected(new Set())} className="text-xs text-terra-500 hover:underline">None</button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-1.5">
            {products.map((p) => {
              const isSelected = selected.has(p.id);
              const labelItem = labelItems.find((i) => i.id === p.id);
              return (
                <div key={p.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition ${isSelected ? "bg-brand-50 border-brand-200" : "bg-white border-brand-50"}`}>
                  <button onClick={() => toggleSelect(p.id)} className="shrink-0 text-brand-600">
                    {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-slate-400" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{displayCode(p.code)} · {p.category?.name} · {inr(p.sellingPrice)}</p>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-slate-500">Copies:</span>
                      <button onClick={() => updateCopies(p.id, (labelItem?.copies || 1) - 1)} className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center hover:bg-brand-200">−</button>
                      <span className="w-6 text-center text-sm font-bold">{labelItem?.copies || 1}</span>
                      <button onClick={() => updateCopies(p.id, (labelItem?.copies || 1) + 1)} className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center hover:bg-brand-200">+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between bg-brand-50 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-brand-900">{selected.size} items · {totalLabels} labels total</span>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={previewLabels} disabled={labelItems.length === 0}>
              Preview Labels
            </Button>
            <Button className="flex-1" onClick={printLabels} disabled={labelItems.length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              Print {totalLabels} Label{totalLabels !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview modal */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Label Preview" size="md">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Preview of 62×29mm labels for Sezink Josh printer</p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {labelItems.map((item) => (
              <div key={item.id} className="border border-dashed border-brand-300 rounded-lg overflow-hidden">
                {Array.from({ length: item.copies }).map((_, ci) => (
                  <div key={ci} style={{ width: "100%", height: "80px", display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", borderBottom: ci < item.copies - 1 ? "1px dashed #e0d8c8" : "none" }}>
                    {qrDataUrls[item.id] && (
                      <img src={qrDataUrls[item.id]} width={48} height={48} alt="QR" style={{ flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontSize: "9px", color: "#666", fontWeight: "bold" }}>Anu Fashions</div>
                      <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                      {item.category?.name && <div style={{ fontSize: "9px", color: "#555" }}>{item.category.name}</div>}
                      <div style={{ fontSize: "9px", fontFamily: "monospace", color: "#333" }}>{displayCode(item.code)}</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold" }}>{inr(item.sellingPrice)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setPreviewOpen(false)}>
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
            <Button className="flex-1" onClick={() => { setPreviewOpen(false); printLabels(); }}>
              <Printer className="mr-2 h-4 w-4" /> Print Now
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
