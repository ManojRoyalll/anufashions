import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, X, Trash2, BookOpen, ChevronLeft, IndianRupee, ShoppingBag, Wallet } from "lucide-react";
import api from "@/lib/api";
import { inr } from "@/lib/utils";
import { useToastStore } from "@/store/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type KhataCustomer = { id: string; name: string; phone?: string; balance: number; updatedAt: string };

type KhataTransaction = {
  id: string; customerId: string; type: "PURCHASE" | "PAYMENT";
  amount: number; items: { name: string; qty: number; price: number }[];
  note?: string; txDate: string;
};

type CustomerDetail = KhataCustomer & { transactions: KhataTransaction[] };

type Product = { id: string; name: string; sellingPrice: number };

type ItemRow = { id: string; name: string; qty: number; price: number; fromStock: boolean };
function emptyRow(): ItemRow { return { id: Math.random().toString(36).slice(2), name: "", qty: 1, price: 0, fromStock: false }; }
function itemsTotal(rows: ItemRow[]) { return rows.reduce((s, i) => s + i.qty * (i.price || 0), 0); }

// ── PurchaseForm — defined OUTSIDE the page component so it is a stable
//    component type and React never unmounts it on parent re-render.
//    (If defined inside, every keystroke re-creates the type → focus lost)
function PurchaseForm({
  items, setItems, products,
  stockSearchVal, setStockSearch,
  paid, setPaid, noteVal, setNote,
}: {
  items: ItemRow[]; setItems: (r: ItemRow[]) => void; products: Product[];
  stockSearchVal: string; setStockSearch: (v: string) => void;
  paid: string; setPaid: (v: string) => void;
  noteVal: string; setNote: (v: string) => void;
}) {
  const total = itemsTotal(items);
  const balance = total - (Number(paid) || 0);
  const hasNamedItems = items.some(i => i.name.trim());

  const stockFiltered = (q: string) => {
    if (!q.trim()) return products.slice(0, 6);
    return products.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  };

  const addFromStock = (p: Product) => {
    const ex = items.find(r => r.fromStock && r.name === p.name);
    if (ex) setItems(items.map(r => r.name === p.name && r.fromStock ? { ...r, qty: r.qty + 1 } : r));
    else setItems([...items.filter(r => r.name || r.price), { id: Math.random().toString(36).slice(2), name: p.name, qty: 1, price: p.sellingPrice, fromStock: true }]);
  };

  return (
    <div className="space-y-3">
      {/* Stock search */}
      <div>
        <p className="text-xs font-semibold text-brand-700 mb-1">Search from Stock</p>
        <input type="text" placeholder="Type saree name to search stock..." value={stockSearchVal}
          onChange={e => setStockSearch(e.target.value)} data-no-caps
          className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
        {stockSearchVal.trim() && (
          <div className="mt-1 border border-brand-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
            {stockFiltered(stockSearchVal).length === 0
              ? <p className="px-3 py-2 text-xs text-slate-400">Not in stock — add manually below</p>
              : stockFiltered(stockSearchVal).map(p => (
                <button key={p.id} type="button" onClick={() => { addFromStock(p); setStockSearch(""); }}
                  className="w-full flex justify-between px-3 py-2.5 text-sm hover:bg-brand-50 border-b border-brand-50 last:border-0">
                  <span className="font-medium">{p.name}</span>
                  <span className="font-bold text-brand-700">{inr(p.sellingPrice)}</span>
                </button>
              ))
            }
          </div>
        )}
      </div>

      {/* Item rows — manual entry */}
      <div>
        <p className="text-xs font-semibold text-brand-700 mb-1.5">Items</p>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Item name"
                value={item.name}
                onChange={e => setItems(items.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                className="flex-1 rounded-xl border border-brand-200 bg-white px-2 py-2.5 text-sm focus:border-brand-500 focus:outline-none min-w-0"
              />
              <input
                type="number"
                placeholder="₹"
                value={item.price || ""}
                onChange={e => setItems(items.map((r, i) => i === idx ? { ...r, price: Number(e.target.value) } : r))}
                className="w-20 rounded-xl border border-brand-200 bg-white px-2 py-2.5 text-sm text-center focus:border-brand-500 focus:outline-none normal-case"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => setItems(items.map((r, i) => i === idx ? { ...r, qty: Math.max(1, r.qty - 1) } : r))} className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 font-bold flex items-center justify-center">−</button>
                <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                <button type="button" onClick={() => setItems(items.map((r, i) => i === idx ? { ...r, qty: r.qty + 1 } : r))} className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 font-bold flex items-center justify-center">+</button>
              </div>
              <button type="button" onClick={() => setItems(items.length > 1 ? items.filter((_, i) => i !== idx) : [emptyRow()])} className="text-slate-300 hover:text-red-400 shrink-0 p-0.5"><X className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => setItems([...items, emptyRow()])}
            className="w-full py-2 text-xs text-brand-600 border-2 border-dashed border-brand-200 rounded-xl hover:bg-brand-50 transition">
            + Add another item
          </button>
        </div>
      </div>

      {/* Total + Paid + Balance — show whenever items have names, not just when price > 0 */}
      {hasNamedItems && (
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-brand-50 rounded-xl px-4 py-2.5">
            <span className="font-semibold text-brand-800">Total Bill</span>
            <span className="text-xl font-black text-brand-900">{inr(total)}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-brand-700 mb-1">Paid now (₹)</p>
            <input
              type="number"
              placeholder="0 — leave blank if nothing paid yet"
              value={paid}
              onChange={e => setPaid(e.target.value)}
              className="w-full rounded-xl border-2 border-brand-200 bg-white px-3 py-2.5 text-lg font-bold focus:border-brand-500 focus:outline-none normal-case"
            />
          </div>
          <div className={`flex justify-between items-center rounded-xl px-4 py-2.5 ${balance > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
            <span className={`font-bold ${balance > 0 ? "text-amber-700" : "text-green-700"}`}>Balance Due</span>
            <span className={`text-xl font-black ${balance > 0 ? "text-amber-600" : "text-green-600"}`}>{inr(Math.max(0, balance))}</span>
          </div>
        </div>
      )}

      <input type="text" placeholder="Note (optional)" value={noteVal} onChange={e => setNote(e.target.value)} data-no-caps
        className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
    </div>
  );
}

export default function KhataPage() {
  const { show } = useToastStore();

  // List view
  const [customers, setCustomers] = useState<KhataCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "pending" | "clear">("all");
  const [searchQ, setSearchQ] = useState("");

  // Detail view
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // All products (for stock search)
  const [products, setProducts] = useState<Product[]>([]);

  // ── Add Customer + Purchase modal ──
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<ItemRow[]>([emptyRow()]);
  const [stockSearch, setStockSearch] = useState("");
  const [paidNow, setPaidNow] = useState("");
  const [purchaseNote, setPurchaseNote] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  // ── Add Purchase to existing customer ──
  const [showPurchase, setShowPurchase] = useState(false);
  const [exPurchaseItems, setExPurchaseItems] = useState<ItemRow[]>([emptyRow()]);
  const [exStockSearch, setExStockSearch] = useState("");
  const [exPaidNow, setExPaidNow] = useState("");
  const [exPurchaseNote, setExPurchaseNote] = useState("");
  const [savingPurchase, setSavingPurchase] = useState(false);

  // ── Add Payment ──
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const loadList = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([api.get("/khata"), api.get("/products")]);
      setCustomers(c.data);
      setProducts(p.data);
    } finally { setLoading(false); }
  };

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    try { const r = await api.get(`/khata/${id}`); setDetail(r.data); }
    finally { setDetailLoading(false); }
  };

  useEffect(() => { loadList(); }, []);

  // ── Totals ──────────────────────────────────────────────────────────────
  const totalOutstanding = customers.reduce((s, c) => s + c.balance, 0);
  const pendingCount = customers.filter(c => c.balance > 0).length;

  const filtered = useMemo(() => {
    const q = searchQ.toLowerCase().trim();
    return customers.filter(c => {
      if (filterMode === "pending" && c.balance <= 0) return false;
      if (filterMode === "clear" && c.balance > 0) return false;
      if (q && !c.name.toLowerCase().includes(q) && !(c.phone?.includes(q))) return false;
      return true;
    });
  }, [customers, filterMode, searchQ]);

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────
  const saveNewCustomer = async () => {
    if (!newName.trim()) { show("Enter customer name", "error"); return; }
    const validItems = purchaseItems.filter(i => i.name.trim() && i.price > 0);
    if (validItems.length === 0) { show("Add at least one item", "error"); return; }
    setSavingCustomer(true);
    try {
      await api.post("/khata", {
        name: newName.trim(), phone: newPhone.trim() || undefined,
        items: validItems.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        totalCost: itemsTotal(validItems),
        paidNow: Number(paidNow) || 0,
        note: purchaseNote.trim() || undefined,
      });
      show("Customer added ✓");
      setShowAddCustomer(false);
      setNewName(""); setNewPhone(""); setPurchaseItems([emptyRow()]); setPaidNow(""); setPurchaseNote("");
      loadList();
    } catch { show("Error saving", "error"); }
    finally { setSavingCustomer(false); }
  };

  // ── Save purchase to existing customer ──────────────────────────────────
  const savePurchase = async () => {
    if (!detail) return;
    const validItems = exPurchaseItems.filter(i => i.name.trim() && i.price > 0);
    if (validItems.length === 0) { show("Add at least one item", "error"); return; }
    setSavingPurchase(true);
    try {
      await api.post(`/khata/${detail.id}/purchase`, {
        items: validItems.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        totalCost: itemsTotal(validItems),
        paidNow: Number(exPaidNow) || 0,
        note: exPurchaseNote.trim() || undefined,
      });
      show("Purchase added ✓");
      setShowPurchase(false);
      setExPurchaseItems([emptyRow()]); setExPaidNow(""); setExPurchaseNote("");
      loadDetail(detail.id); loadList();
    } catch { show("Error", "error"); }
    finally { setSavingPurchase(false); }
  };

  // ── Save payment ─────────────────────────────────────────────────────────
  const savePayment = async () => {
    if (!detail || !payAmount || Number(payAmount) <= 0) { show("Enter amount", "error"); return; }
    setSavingPayment(true);
    try {
      await api.post(`/khata/${detail.id}/payment`, { amount: Number(payAmount), note: payNote.trim() || undefined });
      show("Payment recorded ✓");
      setShowPayment(false); setPayAmount(""); setPayNote("");
      loadDetail(detail.id); loadList();
    } catch { show("Error", "error"); }
    finally { setSavingPayment(false); }
  };

  // ── Delete customer ───────────────────────────────────────────────────────
  const deleteCustomer = async (id: string) => {
    if (!confirm("Delete this customer and all their transactions?")) return;
    try { await api.delete(`/khata/${id}`); show("Deleted ✓"); setDetail(null); loadList(); }
    catch { show("Error", "error"); }
  };

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (detail) {
    return (
      <>
        <div className="space-y-4 max-w-xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => setDetail(null)} className="p-2 rounded-xl hover:bg-brand-100 text-brand-600 transition">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-brand-900 truncate">{detail.name}</h2>
              {detail.phone && <p className="text-sm text-slate-400">{detail.phone}</p>}
            </div>
            <button onClick={() => deleteCustomer(detail.id)} className="p-2 text-red-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Balance card */}
          <div className={`rounded-2xl p-5 text-center ${detail.balance > 0 ? "bg-amber-50 border-2 border-amber-200" : "bg-green-50 border-2 border-green-200"}`}>
            <p className="text-sm text-slate-500 mb-1">Outstanding Balance</p>
            <p className={`text-4xl font-black ${detail.balance > 0 ? "text-amber-600" : "text-green-600"}`}>{inr(detail.balance)}</p>
            {detail.balance <= 0 && <p className="text-sm text-green-600 font-semibold mt-1">✓ All clear!</p>}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setExPurchaseItems([emptyRow()]); setExPaidNow(""); setExPurchaseNote(""); setExStockSearch(""); setShowPurchase(true); }}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition shadow-sm">
              <ShoppingBag className="h-5 w-5" /> Add Purchase
            </button>
            <button onClick={() => { setPayAmount(String(detail.balance)); setPayNote(""); setShowPayment(true); }}
              disabled={detail.balance <= 0}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-600 text-white font-bold hover:bg-green-700 transition shadow-sm disabled:opacity-40">
              <Wallet className="h-5 w-5" /> Add Payment
            </button>
          </div>

          {/* Transaction timeline */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Transaction History</p>
            {detailLoading ? (
              <p className="text-center text-slate-400 py-6">Loading…</p>
            ) : detail.transactions.length === 0 ? (
              <p className="text-center text-slate-300 py-6">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {detail.transactions.map(tx => (
                  <div key={tx.id} className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${tx.type === "PURCHASE" ? "bg-amber-50 border border-amber-100" : "bg-green-50 border border-green-100"}`}>
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${tx.type === "PURCHASE" ? "bg-amber-400" : "bg-green-500"}`}>
                      {tx.type === "PURCHASE" ? "P" : "✓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm text-slate-800">
                            {tx.type === "PURCHASE" ? "Purchase" : "Payment received"}
                          </p>
                          {tx.items.length > 0 && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {tx.items.map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}
                            </p>
                          )}
                          {tx.note && <p className="text-xs text-slate-400 italic mt-0.5">"{tx.note}"</p>}
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(tx.txDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                        </div>
                        <p className={`font-black text-base shrink-0 ml-3 ${tx.type === "PURCHASE" ? "text-amber-600" : "text-green-600"}`}>
                          {tx.type === "PURCHASE" ? "+" : "−"}{inr(tx.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Purchase modal */}
        <Modal open={showPurchase} onClose={() => setShowPurchase(false)} title="Add Purchase" size="md">
          <div className="space-y-4">
            <PurchaseForm
              items={exPurchaseItems} setItems={setExPurchaseItems}
              products={products}
              stockSearchVal={exStockSearch} setStockSearch={setExStockSearch}
              paid={exPaidNow} setPaid={setExPaidNow}
              noteVal={exPurchaseNote} setNote={setExPurchaseNote}
            />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowPurchase(false)}>Cancel</Button>
              <Button className="flex-1 py-3 font-bold" onClick={savePurchase} disabled={savingPurchase}>
                {savingPurchase ? "Saving…" : "Add Purchase"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Payment modal */}
        <Modal open={showPayment} onClose={() => setShowPayment(false)} title="Record Payment" size="sm">
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="font-semibold text-amber-700">Balance Due</span>
              <span className="text-2xl font-black text-amber-600">{inr(detail.balance)}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-brand-700 mb-1">Amount Received (₹) *</p>
              <input type="number" placeholder="0" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                className="w-full rounded-xl border-2 border-brand-200 bg-white px-3 py-3 text-2xl font-black text-center focus:border-brand-500 focus:outline-none normal-case" />
              <div className="flex gap-2 mt-2 flex-wrap">
                {[detail.balance, 500, 1000].filter(v => v > 0).map(v => (
                  <button key={v} onClick={() => setPayAmount(String(v))}
                    className="px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-sm font-semibold hover:bg-brand-100">
                    {inr(v)}
                  </button>
                ))}
              </div>
            </div>
            {payAmount && Number(payAmount) > 0 && (
              <div className={`flex justify-between rounded-xl px-4 py-2.5 ${detail.balance - Number(payAmount) > 0 ? "bg-amber-50" : "bg-green-50"}`}>
                <span className="text-sm font-semibold text-slate-600">Remaining</span>
                <span className={`font-black ${detail.balance - Number(payAmount) > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {inr(Math.max(0, detail.balance - Number(payAmount)))}
                </span>
              </div>
            )}
            <input type="text" placeholder="Note (optional)" value={payNote} onChange={e => setPayNote(e.target.value)} data-no-caps
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowPayment(false)}>Cancel</Button>
              <Button className="flex-1 py-3 font-bold bg-green-600 hover:bg-green-700" onClick={savePayment} disabled={savingPayment}>
                {savingPayment ? "Saving…" : "Record Payment"}
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-4 max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-800 flex items-center gap-2">
              <BookOpen className="h-6 w-6" /> Khata Book
            </h1>
            <p className="text-sm text-slate-500">కాట పుస్తకం · Credit tracker</p>
          </div>
          <button onClick={() => { setNewName(""); setNewPhone(""); setPurchaseItems([emptyRow()]); setPaidNow(""); setPurchaseNote(""); setStockSearch(""); setShowAddCustomer(true); }}
            className="flex items-center gap-2 px-4 py-3 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 transition shadow-sm">
            <Plus className="h-5 w-5" /> New
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">Outstanding</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{inr(totalOutstanding)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{pendingCount} customer{pendingCount !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">Cleared</p>
            <p className="text-2xl font-black text-green-600 mt-1">{customers.length - pendingCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">accounts settled</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "clear"] as const).map(f => (
            <button key={f} onClick={() => setFilterMode(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${filterMode === f ? "bg-brand-600 text-white border-brand-600" : "bg-white text-brand-700 border-brand-200"}`}>
              {f === "all" ? "All" : f === "pending" ? "⏳ Pending" : "✅ Clear"}
            </button>
          ))}
          <input type="text" placeholder="Search…" value={searchQ} onChange={e => setSearchQ(e.target.value)} data-no-caps
            className="flex-1 min-w-32 rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>

        {/* List */}
        {loading ? (
          <p className="text-center text-slate-400 py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <BookOpen className="h-12 w-12 mx-auto text-slate-200" />
            <p className="text-slate-400 font-medium">No customers yet</p>
            <p className="text-slate-300 text-sm">Tap "New" to add a credit customer</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <button key={c.id} onClick={async () => { setDetail({ ...c, transactions: [] }); await loadDetail(c.id); }}
                className="w-full flex items-center gap-3 bg-white rounded-2xl border-2 border-brand-100 px-4 py-3.5 text-left hover:border-brand-300 hover:shadow-sm transition">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-base shrink-0 ${c.balance > 0 ? "bg-amber-400" : "bg-green-500"}`}>
                  {c.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-brand-900 truncate">{c.name}</p>
                  {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-black text-lg ${c.balance > 0 ? "text-amber-600" : "text-green-600"}`}>
                    {c.balance > 0 ? inr(c.balance) : "✓"}
                  </p>
                  <p className="text-xs text-slate-400">{c.balance > 0 ? "due" : "clear"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Customer modal */}
      <Modal open={showAddCustomer} onClose={() => setShowAddCustomer(false)} title="New Customer" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-brand-700 mb-1">Customer Name *</p>
              <input type="text" placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <p className="text-xs font-semibold text-brand-700 mb-1">Mobile</p>
              <input type="tel" placeholder="Optional" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none normal-case" />
            </div>
          </div>
          <PurchaseForm
            items={purchaseItems} setItems={setPurchaseItems}
            products={products}
            stockSearchVal={stockSearch} setStockSearch={setStockSearch}
            paid={paidNow} setPaid={setPaidNow}
            noteVal={purchaseNote} setNote={setPurchaseNote}
          />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
            <Button className="flex-1 py-3 font-bold" onClick={saveNewCustomer} disabled={savingCustomer}>
              {savingCustomer ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
