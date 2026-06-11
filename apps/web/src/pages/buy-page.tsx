import { useEffect, useState } from "react";
import { Plus, Trash2, Check, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { inr } from "@/lib/utils";
import { useLang } from "@/hooks/use-lang";
import { ImageUpload } from "@/components/ui/image-upload";

type Supplier = { id: string; name: string; phone?: string };
type ExistingCategory = { id: string; name: string };
type ItemRow = {
  id: string; title: string; categoryName: string;
  buyPrice: string; sellPrice: string; maxDiscount: string; quantity: string;
};

function emptyItem(): ItemRow {
  return { id: Math.random().toString(36).slice(2), title: "", categoryName: "", buyPrice: "", sellPrice: "", maxDiscount: "", quantity: "" };
}

export default function BuyPage() {
  const { t } = useLang();
  const { show } = useToastStore();

  // Supplier
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [existingCategories, setExistingCategories] = useState<ExistingCategory[]>([]);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);

  // Invoice
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState("");
  const [billPhoto, setBillPhoto] = useState<string | undefined>();
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);

  // Items
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  // Purchase history
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    api.get("/suppliers").then((r) => setSuppliers(r.data));
    api.get("/categories").then((r) => setExistingCategories(r.data));
    api.get("/purchases").then((r) => setHistory(r.data));
  }, []);

  const supplierMatches = supplierQuery.trim()
    ? suppliers.filter((s) =>
        s.name.toLowerCase().includes(supplierQuery.toLowerCase()) ||
        (s.phone && s.phone.includes(supplierQuery))
      ).slice(0, 5)
    : [];

  const selectSupplier = (s: Supplier) => {
    setSelectedSupplier(s);
    setNewSupplierName(s.name);
    setNewSupplierPhone(s.phone ?? "");
    setSupplierQuery("");
    setShowSupplierDrop(false);
  };

  const updateItem = (id: string, field: keyof ItemRow, val: string) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: val } : i));

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  // Live totals
  const totalInvestment = items.reduce((s, i) => s + (Number(i.buyPrice) || 0) * (Number(i.quantity) || 0), 0);
  const expectedRevenue = items.reduce((s, i) => s + (Number(i.sellPrice) || 0) * (Number(i.quantity) || 0), 0);
  const validItems = items.filter((i) => i.title.trim() && i.buyPrice && i.sellPrice && i.quantity);

  const saveAll = async () => {
    if (!newSupplierName.trim()) { show("Enter supplier name", "error"); return; }
    if (validItems.length === 0) { show("Add at least one item with name, prices and quantity", "error"); return; }
    setSaving(true);
    try {
      // Ensure supplier
      let supplierId: string;
      if (selectedSupplier) {
        supplierId = selectedSupplier.id;
      } else {
        const phoneExists = newSupplierPhone.trim()
          ? suppliers.find((s) => s.phone === newSupplierPhone.trim())
          : null;
        if (phoneExists) {
          supplierId = phoneExists.id;
        } else {
          const res = await api.post("/suppliers", {
            name: newSupplierName.trim(),
            phone: newSupplierPhone.trim() || undefined
          });
          supplierId = res.data.id;
        }
      }

      // Ensure categories and create products
      const purchaseItems: { productId: string; quantity: number; costPrice: number }[] = [];
      let saved = 0;

      for (const item of validItems) {
        // Upsert category
        let categoryId: string;
        const catName = item.categoryName.trim() || "General";
        const existing = existingCategories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
        if (existing) {
          categoryId = existing.id;
        } else {
          try {
            const catRes = await api.post("/categories", { name: catName, status: "ACTIVE" });
            categoryId = catRes.data.id;
          } catch {
            const cats = await api.get("/categories");
            const found = cats.data.find((c: ExistingCategory) => c.name.toLowerCase() === catName.toLowerCase());
            categoryId = found?.id;
            if (!categoryId) continue;
          }
        }

        // Create product
        try {
          const productRes = await api.post("/products", {
            code: `ANU-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
            name: item.title.trim(),
            categoryId,
            supplierId,
            purchasePrice: Number(item.buyPrice),
            sellingPrice: Number(item.sellPrice),
            discountLimit: item.maxDiscount ? Number(item.maxDiscount) : undefined,
            quantity: Number(item.quantity),
          });
          purchaseItems.push({
            productId: productRes.data.id,
            quantity: Number(item.quantity),
            costPrice: Number(item.buyPrice)
          });
          saved++;
        } catch { /* skip failed items */ }
      }

      // Create purchase record (invoice)
      if (purchaseItems.length > 0) {
        await api.post("/purchases", {
          purchaseDate: new Date(date).toISOString(),
          supplierId,
          invoiceNo: invoiceNo.trim() || `INV-${Date.now()}`,
          items: purchaseItems
        });
      }

      show(`${saved} item${saved > 1 ? "s" : ""} added to stock ✓`);

      // Refresh
      const [updatedCats, updatedSups, updatedHistory] = await Promise.all([
        api.get("/categories"),
        api.get("/suppliers"),
        api.get("/purchases")
      ]);
      setExistingCategories(updatedCats.data);
      setSuppliers(updatedSups.data);
      setHistory(updatedHistory.data);

      // Reset form
      setItems([emptyItem()]);
      setInvoiceNo("");
      setInvoiceTotalAmount("");
      setBillPhoto(undefined);
      setSelectedSupplier(null);
      setNewSupplierName("");
      setNewSupplierPhone("");
      setDate(new Date().toISOString().slice(0, 10));
    } catch (e: any) {
      show(e?.response?.data?.error || "Error saving", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await api.delete(`/purchases/${id}`);
      show(t.delete + " ✓");
      const h = await api.get("/purchases");
      setHistory(h.data);
    } catch { show("Error", "error"); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Buy Stock / సరుకు కొనుగోలు</h1>
        <p className="text-sm text-slate-500 mt-0.5">Add supplier, items purchased, prices — all in one place</p>
      </div>

      <Card>
        <CardContent className="space-y-5">
          {/* ── SUPPLIER ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">
              Supplier / సరఫరాదారు
            </p>
            {selectedSupplier ? (
              <div className="flex items-center justify-between bg-brand-50 rounded-xl px-4 py-3">
                <div>
                  <p className="font-bold text-brand-900">{selectedSupplier.name}</p>
                  {selectedSupplier.phone && <p className="text-xs text-slate-500">{selectedSupplier.phone}</p>}
                </div>
                <button onClick={() => { setSelectedSupplier(null); setNewSupplierName(""); setNewSupplierPhone(""); }} className="text-terra-500 text-sm font-medium">
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    placeholder="Search existing supplier by name or phone..."
                    value={supplierQuery}
                    onChange={(e) => { setSupplierQuery(e.target.value); setShowSupplierDrop(true); }}
                    onFocus={() => setShowSupplierDrop(true)}
                    autoComplete="off"
                  />
                  {showSupplierDrop && supplierMatches.length > 0 && (
                    <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-brand-200 rounded-xl shadow-premium overflow-hidden">
                      {supplierMatches.map((s) => (
                        <button key={s.id} onClick={() => selectSupplier(s)} className="w-full text-left px-4 py-2.5 hover:bg-brand-50 border-b border-brand-50 last:border-0">
                          <p className="font-semibold text-sm text-brand-900">{s.name}</p>
                          {s.phone && <p className="text-xs text-slate-500">{s.phone}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">New Supplier Name *</p>
                    <Input placeholder="e.g. Franzil" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} autoComplete="off" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Phone (optional)</p>
                    <Input placeholder="9876543210" value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── INVOICE DETAILS (collapsible) ── */}
          <div>
            <button
              type="button"
              onClick={() => setShowInvoiceDetails((v) => !v)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-700"
            >
              {showInvoiceDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Invoice Details (optional)
            </button>
            {showInvoiceDetails && (
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t.date}</p>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t.invoiceNo}</p>
                  <Input placeholder="INV-2026-001" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} autoComplete="off" />
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 mb-1">Invoice Bill Total (₹) <span className="text-brand-600">— including GST / actual amount paid</span></p>
                  <Input type="number" placeholder="Enter total amount on the invoice bill" value={invoiceTotalAmount} onChange={(e) => setInvoiceTotalAmount(e.target.value)} />
                  {invoiceTotalAmount && totalInvestment > 0 && Math.abs(Number(invoiceTotalAmount) - totalInvestment) > 1 && (
                    <p className="text-xs mt-1 text-terra-600 font-medium">
                      Difference: {Number(invoiceTotalAmount) > totalInvestment ? "+" : ""}{(Number(invoiceTotalAmount) - totalInvestment).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })} (likely GST / transport charges)
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 mb-1">{t.billPhoto}</p>
                  <ImageUpload value={billPhoto} onChange={setBillPhoto} />
                </div>
              </div>
            )}
          </div>

          {/* ── ITEMS ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">
              Items Purchased / కొన్న వస్తువులు
            </p>

            {/* Column headers */}
            <div className="grid gap-2 mb-1 px-1" style={{ gridTemplateColumns: "2fr 1.2fr 1fr 1fr 0.8fr 0.8fr auto" }}>
              {["Item Name", "Category", "Buy ₹", "Sell ₹", "Disc%", "Qty", ""].map((h) => (
                <p key={h} className="text-xs font-semibold text-brand-600">{h}</p>
              ))}
            </div>

            <div className="space-y-2">
              {items.map((item) => {
                const buy = Number(item.buyPrice) || 0;
                const sell = Number(item.sellPrice) || 0;
                const profit = sell - buy;
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="grid gap-2 items-center" style={{ gridTemplateColumns: "2fr 1.2fr 1fr 1fr 0.8fr 0.8fr auto" }}>
                      <Input placeholder="Saree / item name" value={item.title} onChange={(e) => updateItem(item.id, "title", e.target.value)} autoComplete="off" />
                      <div className="relative">
                        <Input
                          placeholder="Category"
                          value={item.categoryName}
                          onChange={(e) => updateItem(item.id, "categoryName", e.target.value)}
                          autoComplete="off"
                          list={`cats-${item.id}`}
                        />
                        <datalist id={`cats-${item.id}`}>
                          {existingCategories.map((c) => <option key={c.id} value={c.name} />)}
                        </datalist>
                      </div>
                      <Input type="number" placeholder="0" value={item.buyPrice} onChange={(e) => updateItem(item.id, "buyPrice", e.target.value)} />
                      <Input type="number" placeholder="0" value={item.sellPrice} onChange={(e) => updateItem(item.id, "sellPrice", e.target.value)} />
                      <Input type="number" placeholder="20" value={item.maxDiscount} onChange={(e) => updateItem(item.id, "maxDiscount", e.target.value)} />
                      <Input type="number" placeholder="1" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} />
                      <button onClick={() => items.length > 1 ? removeItem(item.id) : undefined} className={`p-2 rounded-xl ${items.length > 1 ? "text-red-400 hover:bg-red-50" : "text-slate-200"}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {buy > 0 && sell > 0 && (
                      <p className={`text-xs ml-1 font-semibold ${profit >= 0 ? "text-brand-600" : "text-terra-500"}`}>
                        Profit: {inr(profit)} per piece ({buy > 0 ? ((profit / buy) * 100).toFixed(1) : 0}%)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 font-medium mt-2"
            >
              <Plus className="h-4 w-4" /> Add another item
            </button>
          </div>

          {/* ── LIVE TOTALS ── */}
          {totalInvestment > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-brand-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">Total Investment</p>
                <p className="font-bold text-brand-900 mt-0.5">{inr(totalInvestment)}</p>
              </div>
              <div className="bg-terra-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">Expected Revenue</p>
                <p className="font-bold text-terra-700 mt-0.5">{inr(expectedRevenue)}</p>
              </div>
              <div className="bg-brand-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">Expected Profit</p>
                <p className="font-bold text-brand-700 mt-0.5">{inr(expectedRevenue - totalInvestment)}</p>
              </div>
            </div>
          )}

          {/* ── SAVE ── */}
          {validItems.length > 0 && (
            <Button className="w-full py-4 text-base font-bold" onClick={saveAll} disabled={saving}>
              {saving ? "Saving..." : `✅ Save ${validItems.length} Item${validItems.length > 1 ? "s" : ""} to Stock`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── PURCHASE HISTORY ── */}
      <Card>
        <CardContent className="space-y-3">
          <h3 className="font-bold text-brand-900">Purchase History / కొన్న చరిత్ర</h3>
          {history.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">No purchases yet</p>
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
                      <td className="text-right">{h.items?.length ?? 0}</td>
                      <td className="text-right font-semibold text-brand-800">{inr(Number(h.totalAmount))}</td>
                      <td className="text-right">
                        <button onClick={() => deleteEntry(h.id)} className="p-1.5 text-terra-400 hover:text-terra-600 hover:bg-terra-50 rounded-lg">
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
