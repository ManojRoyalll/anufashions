import { useEffect, useState } from "react";
import api, { uploadBillPhoto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { ImageUpload } from "@/components/ui/image-upload";
import { Drawer } from "@/components/ui/drawer";
import { TwoPane } from "@/components/ui/two-pane";
import { useToastStore } from "@/store/toast";
import { useLang } from "@/hooks/use-lang";
import { inr } from "@/lib/utils";
import { Plus, Trash2, Eye, Pencil } from "lucide-react";

type Supplier = { id: string; name: string };
type Product = { id: string; name: string; purchasePrice: number };
type InvoiceItem = { id: string; productId: string; quantity: number; costPrice: number };
type PurchaseRecord = {
  id: string; purchaseDate: string; invoiceNo: string; totalAmount: number;
  invoiceBillAmount?: number | null; transportCost?: number;
  billPhoto?: string;
  supplier?: { name: string; phone?: string };
  items: { id: string; quantity: number; costPrice: number; lineTotal: number; product?: { name: string; code: string } }[];
};

function emptyItem(): InvoiceItem {
  return { id: Math.random().toString(36).slice(2), productId: "", quantity: 1, costPrice: 0 };
}

export default function InvoicesPage() {
  const { t } = useLang();
  const { show } = useToastStore();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<PurchaseRecord[]>([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [billPhoto, setBillPhoto] = useState<string | undefined>();
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<PurchaseRecord | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editInvoiceNo, setEditInvoiceNo] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editTransport, setEditTransport] = useState("");
  const [editPhoto, setEditPhoto] = useState<string | undefined>();
  const [editSaving, setEditSaving] = useState(false);

  const load = () =>
    Promise.all([
      api.get("/suppliers"),
      api.get("/products"),
      api.get("/purchases")
    ]).then(([s, p, h]) => {
      setSuppliers(s.data);
      setProducts(p.data);
      setHistory(h.data);
    });

  useEffect(() => { load(); }, []);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const updateItem = (id: string, field: keyof Omit<InvoiceItem, "id">, val: string | number) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: val } : i));

  const onProductSelect = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    setItems((prev) => prev.map((i) =>
      i.id === itemId ? { ...i, productId, costPrice: product ? product.purchasePrice : 0 } : i
    ));
  };

  const submit = async () => {
    if (!supplierId) { show("Select a supplier", "error"); return; }
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) { show("Add at least one item", "error"); return; }
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (billPhoto) {
        photoUrl = billPhoto.startsWith('data:') ? await uploadBillPhoto(billPhoto) : billPhoto;
      }
      await api.post("/purchases", {
        purchaseDate: new Date(date).toISOString(),
        supplierId,
        invoiceNo: invoiceNo || `INV-${Date.now()}`,
        invoiceBillAmount: totalAmount ? Number(totalAmount) : undefined,
        billPhoto: photoUrl || undefined,
        items: validItems.map(({ productId, quantity, costPrice }) => ({ productId, quantity, costPrice }))
      });
      show(t.recordPurchase + " ✓");
      setAddDrawerOpen(false);
      setDate(new Date().toISOString().slice(0, 10));
      setSupplierId("");
      setInvoiceNo("");
      setTotalAmount("");
      setBillPhoto(undefined);
      setItems([emptyItem()]);
      load();
    } catch (e: any) {
      show(e?.response?.data?.error || "Error", "error");
    } finally {
      setSaving(false);
    }
  };

  const openEditRecord = (record: PurchaseRecord) => {
    setEditInvoiceNo(record.invoiceNo || "");
    setEditBillAmount(record.invoiceBillAmount ? String(record.invoiceBillAmount) : "");
    setEditTransport(record.transportCost ? String(record.transportCost) : "");
    setEditPhoto(record.billPhoto || undefined);
    setEditMode(true);
  };

  const saveEditRecord = async () => {
    if (!detailRecord) return;
    setEditSaving(true);
    try {
      let photoUrl = editPhoto;
      if (editPhoto && editPhoto.startsWith('data:')) {
        photoUrl = await uploadBillPhoto(editPhoto);
      }
      await api.put(`/purchases/${detailRecord.id}`, {
        invoiceNo: editInvoiceNo || detailRecord.invoiceNo,
        invoiceBillAmount: editBillAmount ? String(Number(editBillAmount)) : null,
        transportCost: editTransport ? String(Number(editTransport)) : "0",
        billPhoto: photoUrl || null,
        updatedAt: new Date().toISOString(),
      });
      show("Invoice updated ✓");
      load();
      const h = await api.get("/purchases");
      const updated = h.data.find((p: PurchaseRecord) => p.id === detailRecord.id);
      if (updated) setDetailRecord(updated);
      setEditMode(false);
    } catch { show("Error saving", "error"); }
    finally { setEditSaving(false); }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    try {
      await api.delete(`/purchases/${id}`);
      show(t.delete + " ✓");
      load();
    } catch { show("Error", "error"); }
  };

  return (
    <div className="space-y-5">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <PageHeader title={t.invoices} subtitle={`బిల్లులు — ${history.length} invoices`} />
        <button
          onClick={() => setAddDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-700 text-white text-sm font-semibold rounded-xl hover:bg-brand-800 transition shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Invoice
        </button>
      </div>

      {/* ── HISTORY (default view) ── */}
      <Card>
        <CardContent className="space-y-3">
          <h3 className="font-bold text-brand-900">{t.purchaseHistory}</h3>
          {history.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-slate-400 text-sm">{t.noInvoices}</p>
              <button onClick={() => setAddDrawerOpen(true)} className="px-4 py-2 bg-brand-700 text-white text-sm font-semibold rounded-xl hover:bg-brand-800 transition">
                + Add First Invoice
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-brand-100">
                    <th className="pb-2 font-semibold">{t.date}</th>
                    <th className="pb-2 font-semibold">{t.supplier}</th>
                    <th className="pb-2 font-semibold">{t.invoiceNo}</th>
                    <th className="pb-2 font-semibold text-right">{t.items}</th>
                    <th className="pb-2 font-semibold text-right">{t.total}</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t border-brand-50 hover:bg-brand-50/40 cursor-pointer" onClick={() => setDetailRecord(h)}>
                      <td className="py-2">{new Date(h.purchaseDate).toLocaleDateString("en-IN")}</td>
                      <td className="font-medium">{h.supplier?.name ?? "-"}</td>
                      <td className="text-slate-500">{h.invoiceNo || "-"}</td>
                      <td className="text-right">{h.items.length}</td>
                      <td className="text-right font-semibold text-brand-800">{inr(Number(h.totalAmount))}</td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <button onClick={(e) => { e.stopPropagation(); setDetailRecord(h); }} className="p-1.5 text-brand-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteInvoice(h.id); }} className="p-1.5 text-terra-400 hover:text-terra-600 hover:bg-terra-50 rounded-lg">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── ADD INVOICE TWO-PANE ── */}
      <TwoPane
        open={addDrawerOpen}
        onClose={() => {
          setAddDrawerOpen(false);
          setDate(new Date().toISOString().slice(0, 10));
          setSupplierId(""); setInvoiceNo(""); setTotalAmount(""); setBillPhoto(undefined); setItems([emptyItem()]);
        }}
        title="Add Invoice / ఇన్వాయిస్ చేర్చు"
        leftLabel="Invoice Details"
        rightLabel="Summary"
        leftPane={
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t.date} required>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
              </FormField>
              <FormField label={t.invoiceNo}>
                <input type="text" autoComplete="off" placeholder="e.g. INV-2026-001" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
              </FormField>
            </div>
            <FormField label={t.supplier} required>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                <option value="">{t.supplier}...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
            <FormField label={t.totalBill}>
              <input type="number" placeholder="0" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
            </FormField>
            <FormField label={t.billPhoto}>
              <ImageUpload value={billPhoto} onChange={setBillPhoto} />
            </FormField>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">{t.items}</p>
              <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 mb-1 px-1">
                {["Item / Saree", "Qty", "Cost ₹", ""].map((h) => (
                  <p key={h} className="text-xs font-semibold text-brand-600">{h}</p>
                ))}
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
                    <select value={item.productId} onChange={(e) => onProductSelect(item.id, e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                      <option value="">Select item...</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm text-center shadow-sm focus:border-brand-500 focus:outline-none" />
                    <input type="number" min={0} step="0.01" value={item.costPrice} onChange={(e) => updateItem(item.id, "costPrice", Number(e.target.value))} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
                    <button onClick={() => items.length > 1 ? removeItem(item.id) : undefined} className={`p-2 rounded-xl ${items.length > 1 ? "text-red-400 hover:bg-red-50" : "text-slate-200"}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addItem} className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 font-medium mt-2">
                <Plus className="h-4 w-4" /> Add item
              </button>
            </div>
            <Button className="w-full" onClick={submit} disabled={saving}>
              {saving ? "Saving..." : "✅ " + t.recordPurchase}
            </Button>
          </div>
        }
        rightPane={
          <div className="space-y-4">
            {/* Invoice summary */}
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Invoice Summary</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Supplier</span><span className="font-medium">{suppliers.find(s => s.id === supplierId)?.name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-medium">{date}</span></div>
                {invoiceNo && <div className="flex justify-between"><span className="text-slate-500">Invoice No</span><span className="font-medium">{invoiceNo}</span></div>}
                {totalAmount && <div className="flex justify-between"><span className="text-slate-500">Total Bill</span><span className="font-semibold text-terra-700">{inr(Number(totalAmount))}</span></div>}
              </div>
            </div>
            {/* Items */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">Items ({items.filter(i => i.productId).length})</p>
              {items.filter(i => i.productId).length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-brand-200 p-8 text-center">
                  <p className="text-sm text-slate-400">No items yet</p>
                  <p className="text-xs text-slate-300 mt-1">Select items on the left ←</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.filter(i => i.productId).map((item, i) => {
                    const prod = products.find(p => p.id === item.productId);
                    const lineTotal = item.quantity * item.costPrice;
                    return (
                      <div key={item.id} className="bg-white rounded-xl px-3 py-2.5 shadow-sm flex justify-between">
                        <div>
                          <p className="font-semibold text-sm text-brand-900">{prod?.name ?? "—"}</p>
                          <p className="text-xs text-slate-500">{item.quantity} × {inr(item.costPrice)}</p>
                        </div>
                        <p className="font-bold text-brand-700 text-sm">{inr(lineTotal)}</p>
                      </div>
                    );
                  })}
                  <div className="flex justify-between px-3 py-2 font-bold text-brand-900 border-t border-brand-100">
                    <span>Grand Total</span>
                    <span>{inr(items.filter(i => i.productId).reduce((s, i) => s + i.quantity * i.costPrice, 0))}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* ── INVOICE DETAIL DRAWER (read-only) ── */}
      <Drawer
        open={!!detailRecord}
        onClose={() => { setDetailRecord(null); setEditMode(false); }}
        title={editMode ? "Edit Invoice" : `Invoice — ${detailRecord?.invoiceNo || detailRecord?.supplier?.name || "Details"}`}
      >
        {detailRecord && !editMode && (
          <>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => openEditRecord(detailRecord)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Invoice
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-brand-50 rounded-xl p-3"><p className="text-xs text-slate-500">Supplier</p><p className="font-semibold text-brand-900">{detailRecord.supplier?.name ?? "—"}</p>{detailRecord.supplier?.phone && <p className="text-xs text-slate-500">{detailRecord.supplier.phone}</p>}</div>
              <div className="bg-brand-50 rounded-xl p-3"><p className="text-xs text-slate-500">Date</p><p className="font-semibold text-brand-900">{new Date(detailRecord.purchaseDate).toLocaleDateString("en-IN", { dateStyle: "long" })}</p></div>
              <div className="bg-brand-50 rounded-xl p-3"><p className="text-xs text-slate-500">Invoice No</p><p className="font-semibold text-brand-900">{detailRecord.invoiceNo || "—"}</p></div>
              <div className="bg-terra-50 rounded-xl p-3"><p className="text-xs text-slate-500">Total Amount</p><p className="font-bold text-xl text-terra-700">{inr(Number(detailRecord.totalAmount))}</p></div>
              {detailRecord.invoiceBillAmount && <div className="bg-brand-50 rounded-xl p-3"><p className="text-xs text-slate-500">Invoice Bill Amount</p><p className="font-semibold text-brand-900">{inr(Number(detailRecord.invoiceBillAmount))}</p></div>}
              {(detailRecord.transportCost ?? 0) > 0 && <div className="bg-brand-50 rounded-xl p-3"><p className="text-xs text-slate-500">Transport Cost</p><p className="font-semibold text-brand-900">{inr(Number(detailRecord.transportCost))}</p></div>}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">Items Purchased ({detailRecord.items.length})</p>
              <div className="space-y-1.5">
                {detailRecord.items.map((item: any, i: number) => (
                  <div key={item.id ?? i} className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5">
                    <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-brand-900 truncate">{item.product?.name ?? "—"}</p><p className="text-xs text-slate-500">{item.product?.code}</p></div>
                    <div className="text-right shrink-0 ml-3"><p className="text-sm font-semibold">{item.quantity} × {inr(Number(item.costPrice))}</p><p className="text-xs text-brand-700 font-bold">{inr(Number(item.lineTotal ?? Number(item.costPrice) * item.quantity))}</p></div>
                  </div>
                ))}
              </div>
            </div>
            {detailRecord.billPhoto ? (
              <div><p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">Bill Photo</p><a href={detailRecord.billPhoto} target="_blank" rel="noopener noreferrer"><img src={detailRecord.billPhoto} alt="Bill" className="w-full object-contain rounded-xl border border-brand-200" /></a></div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-brand-200 p-4 text-center"><p className="text-sm text-slate-400">No bill photo — click Edit Invoice to add one</p></div>
            )}
          </>
        )}
        {detailRecord && editMode && (
          <div className="space-y-4">
            <div><p className="text-xs font-semibold text-brand-700 mb-1">Invoice No</p><input value={editInvoiceNo} onChange={(e) => setEditInvoiceNo(e.target.value)} placeholder="INV-2026-001" autoComplete="off" className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" /></div>
            <div><p className="text-xs font-semibold text-brand-700 mb-1">Invoice Bill Amount (₹)</p><input type="number" value={editBillAmount} onChange={(e) => setEditBillAmount(e.target.value)} placeholder="0" className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" /></div>
            <div><p className="text-xs font-semibold text-brand-700 mb-1">Transport Cost (₹)</p><input type="number" value={editTransport} onChange={(e) => setEditTransport(e.target.value)} placeholder="0" className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" /></div>
            <div><p className="text-xs font-semibold text-brand-700 mb-1">Bill Photo</p><ImageUpload value={editPhoto} onChange={setEditPhoto} /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveEditRecord} disabled={editSaving}>{editSaving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
