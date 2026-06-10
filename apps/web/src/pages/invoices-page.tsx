import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToastStore } from "@/store/toast";
import { useLang } from "@/hooks/use-lang";
import { inr } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type Supplier = { id: string; name: string };
type Product = { id: string; name: string; purchasePrice: number };
type InvoiceItem = { id: string; productId: string; quantity: number; costPrice: number };
type PurchaseRecord = {
  id: string; purchaseDate: string; invoiceNo: string; totalAmount: number;
  supplier?: { name: string }; items: { quantity: number }[];
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
      await api.post("/purchases", {
        purchaseDate: new Date(date).toISOString(),
        supplierId,
        invoiceNo: invoiceNo || `INV-${Date.now()}`,
        items: validItems.map(({ productId, quantity, costPrice }) => ({ productId, quantity, costPrice }))
      });
      show(t.recordPurchase + " ✓");
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
      <PageHeader
        title={t.invoices}
        subtitle="బిల్లులు — Record supplier invoices"
      />

      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-bold text-brand-900">Add Invoice / ఇన్వాయిస్ చేర్చు</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t.date} required>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
              />
            </FormField>
            <FormField label={t.invoiceNo}>
              <input
                type="text"
                autoComplete="off"
                placeholder="e.g. INV-2026-001"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
              />
            </FormField>
          </div>

          <FormField label={t.supplier} required>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">{t.supplier}...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>

          <FormField label={t.totalBill}>
            <input
              type="number"
              placeholder="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </FormField>

          <FormField label={t.billPhoto}>
            <ImageUpload value={billPhoto} onChange={setBillPhoto} />
            <p className="text-xs text-slate-400 mt-1">Photo is shown as preview only (not saved to server)</p>
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
                  <select
                    value={item.productId}
                    onChange={(e) => onProductSelect(item.id, e.target.value)}
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Select item...</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm text-center shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.costPrice}
                    onChange={(e) => updateItem(item.id, "costPrice", Number(e.target.value))}
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                  <button
                    onClick={() => items.length > 1 ? removeItem(item.id) : undefined}
                    className={`p-2 rounded-xl ${items.length > 1 ? "text-red-400 hover:bg-red-50" : "text-slate-200"}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 font-medium mt-2"
            >
              <Plus className="h-4 w-4" /> Add item
            </button>
          </div>

          <Button className="w-full" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "✅ " + t.recordPurchase}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h3 className="font-bold text-brand-900">{t.purchaseHistory}</h3>

          {history.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">{t.noInvoices}</p>
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
                    <tr key={h.id} className="border-t border-brand-50 hover:bg-brand-50/40">
                      <td className="py-2">{new Date(h.purchaseDate).toLocaleDateString("en-IN")}</td>
                      <td className="font-medium">{h.supplier?.name ?? "-"}</td>
                      <td className="text-slate-500">{h.invoiceNo || "-"}</td>
                      <td className="text-right">{h.items.length}</td>
                      <td className="text-right font-semibold text-brand-800">{inr(Number(h.totalAmount))}</td>
                      <td className="text-right">
                        <button onClick={() => deleteInvoice(h.id)} className="p-1.5 text-terra-400 hover:text-terra-600 hover:bg-terra-50 rounded-lg">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
