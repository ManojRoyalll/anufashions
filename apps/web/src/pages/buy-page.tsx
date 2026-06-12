import { useEffect, useState } from "react";
import { Plus, Trash2, Check, ChevronDown, ChevronUp, Eye, Pencil } from "lucide-react";
import api, { uploadBillPhoto } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useToastStore } from "@/store/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { TwoPane } from "@/components/ui/two-pane";
import { inr, generateItemCode, roundUpTo50 } from "@/lib/utils";
import { useLang } from "@/hooks/use-lang";
import { ImageUpload } from "@/components/ui/image-upload";

type Supplier = { id: string; name: string; phone?: string };
type ExistingCategory = { id: string; name: string };
type ItemRow = {
  id: string; title: string; categoryName: string; itemCode: string;
  buyPrice: string; sellPrice: string; maxDiscount: string; quantity: string;
};

function emptyItem(): ItemRow {
  return { id: Math.random().toString(36).slice(2), title: "", categoryName: "", itemCode: "", buyPrice: "", sellPrice: "", maxDiscount: "", quantity: "" };
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
  const [invoiceBillAmount, setInvoiceBillAmount] = useState("");
  const [transportCost, setTransportCost] = useState("");
  const [billPhoto, setBillPhoto] = useState<string | undefined>();
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);

  // Items
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  // Purchase history
  const [history, setHistory] = useState<any[]>([]);
  const [detailRecord, setDetailRecord] = useState<any | null>(null);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editInvoiceNo, setEditInvoiceNo] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editTransport, setEditTransport] = useState("");
  const [editPhoto, setEditPhoto] = useState<string | undefined>();
  const [editSaving, setEditSaving] = useState(false);

  // Add item to existing purchase
  const [addItemMode, setAddItemMode] = useState(false);
  const [addItemRow, setAddItemRow] = useState<ItemRow>(emptyItem());
  const [addItemSaving, setAddItemSaving] = useState(false);

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
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: val };
      // Auto-set sell price = 2× buy price, rounded up to nearest 50
      if (field === "buyPrice") {
        const buy = Number(val);
        if (buy > 0 && (!i.sellPrice || Number(i.sellPrice) === roundUpTo50(Number(i.buyPrice) * 2))) {
          updated.sellPrice = String(roundUpTo50(buy * 2));
        }
      }
      // Regenerate code whenever buy or sell price changes
      if (field === "buyPrice" || field === "sellPrice" || field === "maxDiscount") {
        const buy  = Number(field === "buyPrice"  ? val : updated.buyPrice);
        const sell = Number(field === "sellPrice" ? val : updated.sellPrice);
        const disc = Number(field === "maxDiscount" ? val : updated.maxDiscount) || 0;
        if (buy > 0 && sell > 0) {
          // Use item id chars as seed so pad is stable per item but different across items
          const seed = i.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
          updated.itemCode = generateItemCode(buy, sell, disc, seed);
        }
      }
      return updated;
    }));

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

      // Ensure categories and create products — all in parallel for speed
      const purchaseItems: { productId: string; quantity: number; costPrice: number }[] = [];
      let saved = 0;

      // Step 1: resolve all category IDs in parallel
      const categoryIds = await Promise.all(validItems.map(async (item) => {
        const catName = item.categoryName.trim() || "General";
        const existing = existingCategories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
        if (existing) return existing.id;
        try {
          const catRes = await api.post("/categories", { name: catName, status: "ACTIVE" });
          return catRes.data.id as string;
        } catch {
          const cats = await api.get("/categories");
          const found = cats.data.find((c: ExistingCategory) => c.name.toLowerCase() === catName.toLowerCase());
          return (found?.id as string) ?? null;
        }
      }));

      // Step 2: create all products in parallel
      await Promise.all(validItems.map(async (item, idx) => {
        const categoryId = categoryIds[idx];
        if (!categoryId) return;
        try {
          const productRes = await api.post("/products", {
            code: item.itemCode.trim() || generateItemCode(Number(item.buyPrice), Number(item.sellPrice), Number(item.maxDiscount) || 0),
            name: item.title.trim(),
            categoryId,
            supplierId,
            purchasePrice: Number(item.buyPrice),
            sellingPrice: Number(item.sellPrice),
            discountLimit: item.maxDiscount ? Number(item.maxDiscount) : undefined,
            quantity: 0,
          });
          purchaseItems.push({
            productId: productRes.data.id,
            quantity: Number(item.quantity),
            costPrice: Number(item.buyPrice)
          });
          saved++;
        } catch { /* skip failed items */ }
      }));

      // Create purchase record (invoice)
      if (purchaseItems.length > 0) {
        // Upload photo to storage first (avoids base64 in DB)
        let photoUrl: string | undefined;
        if (billPhoto) {
          photoUrl = billPhoto.startsWith('data:') ? await uploadBillPhoto(billPhoto) : billPhoto;
        }
        await api.post("/purchases", {
          purchaseDate: new Date(date).toISOString(),
          supplierId,
          invoiceNo: invoiceNo.trim() || `INV-${Date.now()}`,
          invoiceBillAmount: invoiceBillAmount ? Number(invoiceBillAmount) : undefined,
          transportCost: transportCost ? Number(transportCost) : 0,
          billPhoto: photoUrl,
          items: purchaseItems
        });
      }

      show(`${saved} item${saved > 1 ? "s" : ""} added to stock ✓`);
      setAddDrawerOpen(false);

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
      setInvoiceBillAmount("");
      setTransportCost("");
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

  const openEditRecord = (record: any) => {
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
      const h = await api.get("/purchases");
      setHistory(h.data);
      const updated = h.data.find((p: any) => p.id === detailRecord.id);
      if (updated) setDetailRecord(updated);
      setEditMode(false);
    } catch { show("Error saving", "error"); }
    finally { setEditSaving(false); }
  };

  // Updates addItemRow with same auto-logic as updateItem (auto sell=2×, auto code)
  const updateAddItem = (field: keyof ItemRow, val: string) =>
    setAddItemRow((r) => {
      const updated = { ...r, [field]: val };
      if (field === "buyPrice") {
        const buy = Number(val);
        if (buy > 0 && (!r.sellPrice || Number(r.sellPrice) === Number(r.buyPrice) * 2)) {
          updated.sellPrice = String(buy * 2);
        }
      }
      if (field === "buyPrice" || field === "sellPrice" || field === "maxDiscount") {
        const buy  = Number(field === "buyPrice"  ? val : updated.buyPrice);
        const sell = Number(field === "sellPrice" ? val : updated.sellPrice);
        const disc = Number(field === "maxDiscount" ? val : updated.maxDiscount) || 0;
        if (buy > 0 && sell > 0) {
          const seed = r.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
          updated.itemCode = generateItemCode(buy, sell, disc, seed);
        }
      }
      return updated;
    });

  const saveNewItemToPurchase = async () => {
    if (!detailRecord || !addItemRow.title.trim() || !addItemRow.buyPrice || !addItemRow.quantity) {
      show("Fill in item name, buy price and quantity", "error"); return;
    }
    setAddItemSaving(true);
    try {
      const supplierId = detailRecord.supplier?.id ?? detailRecord.supplierId;
      // Ensure category
      let categoryId: string | undefined;
      const catName = addItemRow.categoryName.trim() || "General";
      const existing = existingCategories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (existing) { categoryId = existing.id; }
      else {
        try { const r = await api.post("/categories", { name: catName, status: "ACTIVE" }); categoryId = r.data.id; }
        catch { const cats = await api.get("/categories"); categoryId = cats.data.find((c: any) => c.name.toLowerCase() === catName.toLowerCase())?.id; }
      }
      if (!categoryId) { show("Could not create category", "error"); return; }

      // Create product (quantity 0, purchase will increment)
      const productRes = await api.post("/products", {
        code: addItemRow.itemCode.trim() || generateItemCode(Number(addItemRow.buyPrice), Number(addItemRow.sellPrice || addItemRow.buyPrice), Number(addItemRow.maxDiscount) || 0, addItemRow.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0)),
        name: addItemRow.title.trim(), categoryId, supplierId,
        purchasePrice: Number(addItemRow.buyPrice),
        sellingPrice: Number(addItemRow.sellPrice || addItemRow.buyPrice),
        discountLimit: addItemRow.maxDiscount ? Number(addItemRow.maxDiscount) : undefined,
        quantity: 0,
      });

      // Add PurchaseItem row and increment stock
      const qty = Number(addItemRow.quantity);
      const cost = Number(addItemRow.buyPrice);
      await supabase.from('PurchaseItem').insert({ id: crypto.randomUUID(), purchaseId: detailRecord.id, productId: productRes.data.id, quantity: qty, costPrice: String(cost), lineTotal: String(qty * cost), createdAt: new Date().toISOString() });
      const { data: prod } = await supabase.from('Product').select('quantity').eq('id', productRes.data.id).single();
      if (prod) { const nq = prod.quantity + qty; await supabase.from('Product').update({ quantity: nq, stockStatus: nq <= 0 ? 'OUT_OF_STOCK' : nq <= 5 ? 'LOW_STOCK' : 'IN_STOCK', updatedAt: new Date().toISOString() }).eq('id', productRes.data.id); }

      // Recalculate purchase total
      const { data: allItems } = await supabase.from('PurchaseItem').select('lineTotal').eq('purchaseId', detailRecord.id);
      const newTotal = (allItems ?? []).reduce((s: number, r: any) => s + Number(r.lineTotal), 0);
      await supabase.from('Purchase').update({ totalAmount: String(newTotal), updatedAt: new Date().toISOString() }).eq('id', detailRecord.id);

      show("Item added ✓");
      setAddItemMode(false);
      setAddItemRow(emptyItem());
      const h = await api.get("/purchases");
      setHistory(h.data);
      const updated = h.data.find((p: any) => p.id === detailRecord.id);
      if (updated) setDetailRecord(updated);
    } catch (e: any) { show(e?.message || "Error adding item", "error"); }
    finally { setAddItemSaving(false); }
  };

  const deletePurchaseItem = async (purchaseItemId: string) => {
    if (!confirm("Remove this item from the purchase? Stock will be adjusted.")) return;
    try {
      await api.delete(`/purchase-items/${purchaseItemId}`);
      show("Item removed ✓");
      const h = await api.get("/purchases");
      setHistory(h.data);
      // Refresh detailRecord to reflect removed item + updated total
      const updated = h.data.find((p: any) => p.id === detailRecord?.id);
      if (updated) setDetailRecord(updated);
      else setDetailRecord(null);
    } catch { show("Error removing item", "error"); }
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
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Buy Stock / సరుకు కొనుగోలు</h1>
          <p className="text-sm text-slate-500 mt-0.5">{history.length} purchases recorded</p>
        </div>
        <button
          onClick={() => setAddDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-700 text-white text-sm font-semibold rounded-xl hover:bg-brand-800 transition"
        >
          <Plus className="h-4 w-4" /> Add Bill
        </button>
      </div>

      {/* ── PURCHASE HISTORY (default view) ── */}
      <Card>
        <CardContent className="space-y-3">
          <h3 className="font-bold text-brand-900">Purchase History / కొన్న చరిత్ర</h3>
          {history.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-slate-400 text-sm">No purchases yet</p>
              <button onClick={() => setAddDrawerOpen(true)} className="px-4 py-2 bg-brand-700 text-white text-sm font-semibold rounded-xl hover:bg-brand-800 transition">
                + Add First Bill
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 cursor-pointer hover:bg-brand-100/60 transition" onClick={() => setDetailRecord(h)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-900 text-sm">{h.supplier?.name ?? "-"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {h.purchaseDate ? new Date(h.purchaseDate).toLocaleDateString("en-IN") : "-"}
                      {h.invoiceNo ? ` · ${h.invoiceNo}` : ""}
                      {` · ${h.items?.length ?? 0} items`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <p className="font-bold text-brand-800">{inr(Number(h.totalAmount))}</p>
                    <button onClick={(e) => { e.stopPropagation(); setDetailRecord(h); }} className="p-1.5 text-brand-400 hover:text-brand-600 hover:bg-brand-100 rounded-lg">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteEntry(h.id); }} className="p-1.5 text-terra-400 hover:text-terra-600 hover:bg-terra-50 rounded-lg">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── ADD BILL TWO-PANE ── */}
      <TwoPane
        open={addDrawerOpen}
        onClose={() => {
          setAddDrawerOpen(false);
          setItems([emptyItem()]);
          setInvoiceNo(""); setInvoiceBillAmount(""); setTransportCost(""); setBillPhoto(undefined);
          setSelectedSupplier(null); setNewSupplierName(""); setNewSupplierPhone("");
          setDate(new Date().toISOString().slice(0, 10));
          setShowInvoiceDetails(false);
        }}
        title="Add Bill / బిల్లు చేర్చు"
        leftLabel="Add Items"
        rightLabel="Summary"
        leftPane={
          <div className="space-y-5">
            {/* ── SUPPLIER ── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">Supplier / సరఫరాదారు</p>
              {selectedSupplier ? (
                <div className="flex items-center justify-between bg-brand-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-bold text-brand-900">{selectedSupplier.name}</p>
                    {selectedSupplier.phone && <p className="text-xs text-slate-500">{selectedSupplier.phone}</p>}
                  </div>
                  <button onClick={() => { setSelectedSupplier(null); setNewSupplierName(""); setNewSupplierPhone(""); }} className="text-terra-500 text-sm font-medium">Change</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Input placeholder="Search existing supplier..." value={supplierQuery}
                      onChange={(e) => { setSupplierQuery(e.target.value); setShowSupplierDrop(true); }}
                      onFocus={() => setShowSupplierDrop(true)} autoComplete="off" />
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

            {/* ── INVOICE DETAILS ── */}
            <div>
              <button type="button" onClick={() => setShowInvoiceDetails((v) => !v)}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-700">
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
                  <div className="col-span-2 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-brand-700 mb-1">Invoice Bill Amount (₹)</p>
                      <Input type="number" placeholder="Amount on invoice" value={invoiceBillAmount} onChange={(e) => setInvoiceBillAmount(e.target.value)} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-brand-700 mb-1">Transport Cost (₹)</p>
                      <Input type="number" placeholder="0" value={transportCost} onChange={(e) => setTransportCost(e.target.value)} />
                    </div>
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
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">Items / వస్తువులు</p>
              <div className="space-y-3">
                {items.map((item) => {
                  const buy = Number(item.buyPrice) || 0;
                  const sell = Number(item.sellPrice) || 0;
                  const profit = sell - buy;
                  return (
                    <div key={item.id} className="bg-brand-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-brand-600 mb-1">Item Name</p>
                          <Input placeholder="Saree / item name" value={item.title} onChange={(e) => updateItem(item.id, "title", e.target.value)} autoComplete="off" />
                        </div>
                        <button onClick={() => items.length > 1 ? removeItem(item.id) : undefined} className={`mt-5 p-2 rounded-xl ${items.length > 1 ? "text-red-400 hover:bg-red-100" : "text-slate-200"}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-brand-600 mb-1">Code <span className="text-slate-400 font-normal">(auto-generated)</span></p>
                        <Input placeholder="e.g. ANU32/456-MP094-D5" value={item.itemCode} onChange={(e) => updateItem(item.id, "itemCode", e.target.value)} autoComplete="off" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-brand-600 mb-1">Category</p>
                        <Input placeholder="e.g. Cotton Sarees" value={item.categoryName} onChange={(e) => updateItem(item.id, "categoryName", e.target.value)} autoComplete="off" list={`cats-${item.id}`} />
                        <datalist id={`cats-${item.id}`}>{existingCategories.map((c) => <option key={c.id} value={c.name} />)}</datalist>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><p className="text-xs font-semibold text-brand-600 mb-1">Buy ₹</p><Input type="number" placeholder="0" value={item.buyPrice} onChange={(e) => updateItem(item.id, "buyPrice", e.target.value)} /></div>
                        <div><p className="text-xs font-semibold text-brand-600 mb-1">Sell ₹</p><Input type="number" placeholder="0" value={item.sellPrice} onChange={(e) => updateItem(item.id, "sellPrice", e.target.value)} /></div>
                        <div><p className="text-xs font-semibold text-brand-600 mb-1">Max Disc %</p><Input type="number" placeholder="0" value={item.maxDiscount} onChange={(e) => updateItem(item.id, "maxDiscount", e.target.value)} /></div>
                        <div><p className="text-xs font-semibold text-brand-600 mb-1">Qty</p><Input type="number" placeholder="1" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} /></div>
                      </div>
                      {buy > 0 && sell > 0 && (
                        <p className={`text-xs font-semibold ${profit >= 0 ? "text-brand-600" : "text-terra-500"}`}>
                          Profit: {inr(profit)} ({buy > 0 ? ((profit / buy) * 100).toFixed(1) : 0}%)
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setItems((prev) => [...prev, emptyItem()])} className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 font-medium mt-2">
                <Plus className="h-4 w-4" /> Add another item
              </button>
            </div>

            <Button className="w-full py-3 text-base font-bold" onClick={saveAll} disabled={saving || validItems.length === 0}>
              {saving ? "Saving..." : validItems.length === 0 ? "Add items to save" : `✅ Save ${validItems.length} Item${validItems.length > 1 ? "s" : ""} to Stock`}
            </Button>
          </div>
        }
        rightPane={
          <div className="space-y-4">
            {/* Running totals */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-xs text-slate-500">Investment</p>
                <p className="font-bold text-brand-900 mt-0.5 text-sm">{inr(totalInvestment)}</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-xs text-slate-500">Revenue</p>
                <p className="font-bold text-terra-700 mt-0.5 text-sm">{inr(expectedRevenue)}</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-xs text-slate-500">Profit</p>
                <p className="font-bold text-brand-700 mt-0.5 text-sm">{inr(expectedRevenue - totalInvestment)}</p>
              </div>
            </div>

            {/* Items added so far */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">
                Items ({validItems.length})
              </p>
              {validItems.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-brand-200 p-8 text-center">
                  <p className="text-sm text-slate-400">No items yet</p>
                  <p className="text-xs text-slate-300 mt-1">Fill in the form on the left ←</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {validItems.map((item, i) => {
                    const buy = Number(item.buyPrice);
                    const sell = Number(item.sellPrice);
                    const qty = Number(item.quantity);
                    return (
                      <div key={item.id} className="bg-white rounded-xl px-3 py-2.5 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-brand-900 truncate">{item.title}</p>
                            {item.categoryName && <p className="text-xs text-slate-500">{item.categoryName}</p>}
                          </div>
                          <span className="text-xs font-bold text-brand-700 shrink-0">×{qty}</span>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-slate-500">
                          <span>Buy {inr(buy)}</span>
                          <span>Sell {inr(sell)}</span>
                          <span className="text-brand-600 font-semibold">Profit {inr((sell - buy) * qty)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* ── PURCHASE DETAIL DRAWER (read-only, backdrop close is fine) ── */}
      <Drawer
        open={!!detailRecord}
        onClose={() => { setDetailRecord(null); setEditMode(false); setAddItemMode(false); }}
        title={editMode ? "Edit Invoice" : `Purchase — ${detailRecord?.invoiceNo || detailRecord?.supplier?.name || "Details"}`}
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
              {detailRecord.transportCost > 0 && <div className="bg-brand-50 rounded-xl p-3"><p className="text-xs text-slate-500">Transport Cost</p><p className="font-semibold text-brand-900">{inr(Number(detailRecord.transportCost))}</p></div>}
            </div>
            {detailRecord.items?.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">Items ({detailRecord.items.length})</p>
                <div className="space-y-1.5">
                  {detailRecord.items.map((item: any, i: number) => (
                    <div key={item.id ?? i} className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-brand-900 truncate">{item.product?.name ?? "—"}</p>
                        <p className="text-xs text-slate-500">{item.product?.code}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{item.quantity} × {inr(Number(item.costPrice))}</p>
                        <p className="text-xs text-brand-700 font-bold">{inr(Number(item.lineTotal ?? Number(item.costPrice) * item.quantity))}</p>
                      </div>
                      {item.id && (
                        <button
                          onClick={() => deletePurchaseItem(item.id)}
                          className="p-1.5 text-terra-400 hover:text-terra-600 hover:bg-terra-50 rounded-lg shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detailRecord.billPhoto ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">Bill Photo</p>
                <a href={detailRecord.billPhoto} target="_blank" rel="noopener noreferrer">
                  <img src={detailRecord.billPhoto} alt="Bill" className="w-full object-contain rounded-xl border border-brand-200 cursor-pointer hover:opacity-90" />
                </a>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-brand-200 p-4 text-center"><p className="text-sm text-slate-400">No bill photo — click Edit Invoice to add one</p></div>
            )}

            {/* ── Add item to this purchase ── */}
            {!addItemMode ? (
              <button
                onClick={() => { setAddItemMode(true); setAddItemRow(emptyItem()); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-brand-700 border-2 border-dashed border-brand-300 rounded-xl hover:bg-brand-50 transition"
              >
                <Plus className="h-4 w-4" /> Add Item to This Purchase
              </button>
            ) : (
              <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Add New Item</p>

                <div>
                  <p className="text-xs font-semibold text-brand-600 mb-1">Item Name *</p>
                  <Input placeholder="Saree / item name" value={addItemRow.title} onChange={(e) => updateAddItem("title", e.target.value)} autoComplete="off" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-brand-600 mb-1">Category</p>
                  <Input placeholder="e.g. Cotton Sarees" value={addItemRow.categoryName} onChange={(e) => updateAddItem("categoryName", e.target.value)} autoComplete="off" list="add-item-cats" />
                  <datalist id="add-item-cats">{existingCategories.map((c) => <option key={c.id} value={c.name} />)}</datalist>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs font-semibold text-brand-600 mb-1">Buy ₹ *</p><Input type="number" placeholder="0" value={addItemRow.buyPrice} onChange={(e) => updateAddItem("buyPrice", e.target.value)} /></div>
                  <div><p className="text-xs font-semibold text-brand-600 mb-1">Sell ₹</p><Input type="number" placeholder="0" value={addItemRow.sellPrice} onChange={(e) => updateAddItem("sellPrice", e.target.value)} /></div>
                  <div><p className="text-xs font-semibold text-brand-600 mb-1">Max Disc %</p><Input type="number" placeholder="0" min={0} max={100} value={addItemRow.maxDiscount} onChange={(e) => updateAddItem("maxDiscount", e.target.value)} /></div>
                  <div><p className="text-xs font-semibold text-brand-600 mb-1">Qty *</p><Input type="number" placeholder="1" value={addItemRow.quantity} onChange={(e) => updateAddItem("quantity", e.target.value)} /></div>
                </div>

                {Number(addItemRow.buyPrice) > 0 && Number(addItemRow.sellPrice) > 0 && (
                  <div className="rounded-xl bg-brand-50 px-3 py-2 text-xs flex gap-3">
                    <span className="font-semibold text-brand-800">Profit:</span>
                    <span className="font-bold text-brand-700">{inr(Number(addItemRow.sellPrice) - Number(addItemRow.buyPrice))}</span>
                    <span className="text-slate-500">({Number(addItemRow.buyPrice) > 0 ? (((Number(addItemRow.sellPrice) - Number(addItemRow.buyPrice)) / Number(addItemRow.buyPrice)) * 100).toFixed(1) : 0}%)</span>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-brand-600 mb-1">Code <span className="font-normal text-slate-400">(auto-generated)</span></p>
                  <Input placeholder="Auto-generated from prices" value={addItemRow.itemCode} onChange={(e) => updateAddItem("itemCode", e.target.value)} autoComplete="off" />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="secondary" className="flex-1" onClick={() => setAddItemMode(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={saveNewItemToPurchase} disabled={addItemSaving}>
                    {addItemSaving ? "Adding..." : "Add Item"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        {detailRecord && editMode && (
          <div className="space-y-4">
            <div><p className="text-xs font-semibold text-brand-700 mb-1">Invoice No</p><Input value={editInvoiceNo} onChange={(e) => setEditInvoiceNo(e.target.value)} placeholder="INV-2026-001" autoComplete="off" /></div>
            <div><p className="text-xs font-semibold text-brand-700 mb-1">Invoice Bill Amount (₹)</p><Input type="number" value={editBillAmount} onChange={(e) => setEditBillAmount(e.target.value)} placeholder="0" /></div>
            <div><p className="text-xs font-semibold text-brand-700 mb-1">Transport Cost (₹)</p><Input type="number" value={editTransport} onChange={(e) => setEditTransport(e.target.value)} placeholder="0" /></div>
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
