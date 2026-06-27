import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, X, Trash2, IndianRupee, BookOpen, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import { inr } from "@/lib/utils";
import { useToastStore } from "@/store/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type LedgerItem = { name: string; qty: number; price: number };

type LedgerEntry = {
  id: string;
  entryDate: string;
  customerName: string;
  customerPhone?: string;
  items: LedgerItem[];
  totalBill: number;
  totalPaid: number;
  balance: number;
  notes?: string;
  payments: { id: string; amount: number; paymentDate: string; note?: string }[];
};

type Product = { id: string; name: string; sellingPrice: number; category?: { name: string } };
type Customer = { id: string; name: string; phone?: string };

export default function LedgerPage() {
  const { show } = useToastStore();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // Add entry modal
  const [showAdd, setShowAdd] = useState(false);
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formCustomerPhone, setFormCustomerPhone] = useState("");
  const [formCustomerQuery, setFormCustomerQuery] = useState("");
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [formItems, setFormItems] = useState<{ productId: string; name: string; qty: number; price: number }[]>([]);
  const [formProductQuery, setFormProductQuery] = useState("");
  const [formPaid, setFormPaid] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  // Pay modal
  const [payEntry, setPayEntry] = useState<LedgerEntry | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  // Expanded entries
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filter
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [searchQ, setSearchQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [e, p, c] = await Promise.all([api.get("/ledger"), api.get("/products"), api.get("/customers")]);
      setEntries(e.data);
      setProducts(p.data);
      setCustomers(c.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const custMatches = useMemo(() => {
    if (!formCustomerQuery.trim()) return [];
    const q = formCustomerQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))).slice(0, 5);
  }, [customers, formCustomerQuery]);

  const prodFiltered = useMemo(() => {
    if (!formProductQuery.trim()) return products.slice(0, 8);
    const q = formProductQuery.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [products, formProductQuery]);

  const formSubtotal = formItems.reduce((s, i) => s + i.qty * i.price, 0);
  const formBalance = formSubtotal - (Number(formPaid) || 0);

  const addItem = (product: Product) => {
    setFormItems(prev => {
      const ex = prev.find(i => i.productId === product.id);
      if (ex) return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId: product.id, name: product.name, qty: 1, price: product.sellingPrice }];
    });
    setFormProductQuery("");
  };

  const saveEntry = async () => {
    if (!formCustomerName.trim()) { show("Enter customer name", "error"); return; }
    if (formItems.length === 0) { show("Add at least one item", "error"); return; }
    setFormSaving(true);
    try {
      // Find or create customer
      let customerId: string | undefined;
      const existing = customers.find(c => c.name.toLowerCase() === formCustomerName.trim().toLowerCase());
      if (existing) {
        customerId = existing.id;
      } else if (formCustomerPhone.trim()) {
        const res = await api.post("/customers", { name: formCustomerName.trim(), phone: formCustomerPhone.trim() });
        customerId = res.data.id;
      }
      await api.post("/ledger", {
        customerName: formCustomerName.trim(),
        customerPhone: formCustomerPhone.trim() || undefined,
        customerId,
        items: formItems.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        totalBill: formSubtotal,
        totalPaid: Number(formPaid) || 0,
        notes: formNotes.trim() || undefined,
      });
      show("Entry added ✓");
      setShowAdd(false);
      setFormCustomerName(""); setFormCustomerPhone(""); setFormCustomerQuery("");
      setFormItems([]); setFormPaid(""); setFormNotes("");
      load();
    } catch { show("Error saving", "error"); }
    finally { setFormSaving(false); }
  };

  const savePayment = async () => {
    if (!payEntry || !payAmount || Number(payAmount) <= 0) { show("Enter valid amount", "error"); return; }
    setPaySaving(true);
    try {
      await api.post(`/ledger/${payEntry.id}/payment`, { amount: Number(payAmount), note: payNote.trim() || undefined });
      show("Payment recorded ✓");
      setPayEntry(null); setPayAmount(""); setPayNote("");
      load();
    } catch { show("Error", "error"); }
    finally { setPaySaving(false); }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Delete this ledger entry?")) return;
    try { await api.delete(`/ledger/${id}`); show("Deleted ✓"); load(); }
    catch { show("Error", "error"); }
  };

  const filtered = useMemo(() => {
    const q = searchQ.toLowerCase().trim();
    return entries.filter(e => {
      if (filter === "pending" && e.balance <= 0) return false;
      if (filter === "paid" && e.balance > 0) return false;
      if (q && !e.customerName.toLowerCase().includes(q) && !e.items.some(i => i.name.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [entries, filter, searchQ]);

  const totalOutstanding = entries.reduce((s, e) => s + e.balance, 0);
  const pendingCount = entries.filter(e => e.balance > 0).length;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-800 flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Khata Book
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">కాట పుస్తకం — Credit sales tracker</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-3 bg-brand-600 text-white font-bold text-base rounded-2xl hover:bg-brand-700 transition shadow-md">
          <Plus className="h-5 w-5" /> Add Entry
        </button>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-brand-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Outstanding</p>
          <p className="text-2xl font-black text-brand-700 mt-1">{inr(totalOutstanding)}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Pending</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount} customer{pendingCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-200 p-4 shadow-sm sm:block hidden">
          <p className="text-xs text-slate-500 font-medium">Fully Paid</p>
          <p className="text-2xl font-black text-green-600 mt-1">{entries.length - pendingCount} entries</p>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="flex gap-2 flex-wrap items-center">
        {(["all","pending","paid"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition capitalize ${filter===f?"bg-brand-600 text-white border-brand-600":"bg-white text-brand-700 border-brand-200"}`}>
            {f === "all" ? "All" : f === "pending" ? "⏳ Pending" : "✅ Paid"}
          </button>
        ))}
        <input type="text" placeholder="Search customer or item..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
          data-no-caps className="flex-1 min-w-40 rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      </div>

      {/* ── ENTRIES LIST ── */}
      {loading ? (
        <p className="text-center text-slate-400 py-8">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <BookOpen className="h-12 w-12 mx-auto text-slate-200" />
          <p className="text-slate-400 font-medium">No entries yet</p>
          <p className="text-slate-300 text-sm">Tap "+ Add Entry" to record a credit sale</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => {
            const isPaid = entry.balance <= 0;
            const isExpanded = expandedIds.has(entry.id);
            return (
              <div key={entry.id} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${isPaid ? "border-green-200" : "border-amber-200"}`}>
                {/* Main row */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-brand-900 text-lg leading-tight">{entry.customerName}</p>
                        {entry.customerPhone && <p className="text-xs text-slate-400">{entry.customerPhone}</p>}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {isPaid ? "✓ PAID" : "⏳ PENDING"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(entry.entryDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        {" · "}{entry.items.length} item{entry.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isPaid && (
                        <button onClick={() => { setPayEntry(entry); setPayAmount(String(entry.balance)); }}
                          className="px-3 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition">
                          + Pay
                        </button>
                      )}
                      <button onClick={() => setExpandedIds(prev => { const n = new Set(prev); n.has(entry.id) ? n.delete(entry.id) : n.add(entry.id); return n; })}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button onClick={() => deleteEntry(entry.id)} className="p-2 text-red-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bill summary row */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Bill</p>
                      <p className="font-bold text-slate-800 text-base mt-0.5">{inr(entry.totalBill)}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Paid</p>
                      <p className="font-bold text-green-700 text-base mt-0.5">{inr(entry.totalPaid)}</p>
                    </div>
                    <div className={`rounded-xl p-2.5 text-center ${entry.balance > 0 ? "bg-amber-50" : "bg-green-50"}`}>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Balance</p>
                      <p className={`font-black text-base mt-0.5 ${entry.balance > 0 ? "text-amber-600" : "text-green-600"}`}>
                        {entry.balance > 0 ? inr(entry.balance) : "₹0"}
                      </p>
                    </div>
                  </div>

                  {entry.notes && <p className="mt-2 text-xs text-slate-400 italic">"{entry.notes}"</p>}
                </div>

                {/* Expanded: items + payment history */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-3">
                    {/* Items */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Items</p>
                      <div className="space-y-1">
                        {entry.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-slate-700">{item.name} <span className="text-slate-400">×{item.qty}</span></span>
                            <span className="font-semibold text-slate-800">{inr(item.qty * item.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Payment history */}
                    {entry.payments.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Payment History</p>
                        <div className="space-y-1">
                          {entry.payments.map(p => (
                            <div key={p.id} className="flex justify-between text-sm text-slate-600">
                              <span>{new Date(p.paymentDate).toLocaleDateString("en-IN", { dateStyle: "short" })}{p.note && ` — ${p.note}`}</span>
                              <span className="font-semibold text-green-700">+{inr(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD ENTRY MODAL ── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Khata Entry" size="md">
        <div className="space-y-4">
          {/* Customer */}
          <div>
            <p className="text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">Customer *</p>
            <div className="relative">
              <input type="text" placeholder="Search or enter customer name..." value={formCustomerQuery || formCustomerName}
                onChange={e => { setFormCustomerQuery(e.target.value); setFormCustomerName(e.target.value); setShowCustDrop(true); }}
                onFocus={() => setShowCustDrop(true)} data-no-caps
                className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
              {showCustDrop && custMatches.length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-brand-200 rounded-xl shadow-lg overflow-hidden">
                  {custMatches.map(c => (
                    <button key={c.id} type="button" onClick={() => { setFormCustomerName(c.name); setFormCustomerPhone(c.phone ?? ""); setFormCustomerQuery(""); setShowCustDrop(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-brand-50 border-b border-brand-50 last:border-0">
                      <p className="font-semibold text-sm">{c.name}</p>
                      {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="tel" placeholder="Mobile (optional)" value={formCustomerPhone} onChange={e => setFormCustomerPhone(e.target.value)}
              className="mt-2 w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none normal-case" />
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">Items *</p>
            <input type="text" placeholder="Search saree to add..." value={formProductQuery} onChange={e => setFormProductQuery(e.target.value)} data-no-caps
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none mb-2" />
            {formProductQuery.trim() && prodFiltered.length > 0 && (
              <div className="border border-brand-200 rounded-xl overflow-hidden mb-2 max-h-40 overflow-y-auto">
                {prodFiltered.map(p => (
                  <button key={p.id} type="button" onClick={() => addItem(p)}
                    className="w-full text-left px-3 py-2.5 hover:bg-brand-50 border-b border-brand-50 last:border-0 flex justify-between">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-sm font-bold text-brand-700">{inr(p.sellingPrice)}</span>
                  </button>
                ))}
              </div>
            )}
            {formItems.length > 0 && (
              <div className="space-y-1.5">
                {formItems.map(item => (
                  <div key={item.productId} className="flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2">
                    <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
                    <button onClick={() => setFormItems(prev => prev.map(i => i.productId === item.productId ? { ...i, qty: Math.max(1, i.qty - 1) } : i))} className="w-7 h-7 rounded-lg bg-white border border-brand-200 text-brand-700 font-bold flex items-center justify-center">−</button>
                    <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                    <button onClick={() => setFormItems(prev => prev.map(i => i.productId === item.productId ? { ...i, qty: i.qty + 1 } : i))} className="w-7 h-7 rounded-lg bg-white border border-brand-200 text-brand-700 font-bold flex items-center justify-center">+</button>
                    <span className="text-sm font-semibold text-brand-800 w-16 text-right">{inr(item.qty * item.price)}</span>
                    <button onClick={() => setFormItems(prev => prev.filter(i => i.productId !== item.productId))} className="text-slate-300 hover:text-red-400"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bill + Payment */}
          {formItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-brand-50 rounded-xl px-4 py-3">
                <span className="font-semibold text-brand-800">Total Bill</span>
                <span className="text-xl font-black text-brand-900">{inr(formSubtotal)}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-brand-700 mb-1">Amount Paid Now (₹)</p>
                <input type="number" placeholder="0" value={formPaid} onChange={e => setFormPaid(e.target.value)}
                  className="w-full rounded-xl border-2 border-brand-200 bg-white px-3 py-3 text-lg font-bold focus:border-brand-500 focus:outline-none normal-case" />
              </div>
              {formSubtotal > 0 && (
                <div className={`flex justify-between items-center rounded-xl px-4 py-3 ${formBalance > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                  <span className={`font-bold ${formBalance > 0 ? "text-amber-700" : "text-green-700"}`}>Balance Due</span>
                  <span className={`text-2xl font-black ${formBalance > 0 ? "text-amber-600" : "text-green-600"}`}>{inr(Math.max(0, formBalance))}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-brand-700 mb-1">Notes (optional)</p>
            <input type="text" placeholder="e.g. Will pay next week" value={formNotes} onChange={e => setFormNotes(e.target.value)} data-no-caps
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="flex-1 py-3 text-base font-bold" onClick={saveEntry} disabled={formSaving}>
              {formSaving ? "Saving…" : "Save Entry"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── ADD PAYMENT MODAL ── */}
      <Modal open={!!payEntry} onClose={() => setPayEntry(null)} title="Record Payment" size="sm">
        {payEntry && (
          <div className="space-y-4">
            <div className="bg-brand-50 rounded-xl p-4 space-y-1">
              <p className="font-bold text-brand-900 text-lg">{payEntry.customerName}</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Bill</span><span className="font-semibold">{inr(payEntry.totalBill)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Already Paid</span><span className="font-semibold text-green-600">{inr(payEntry.totalPaid)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-brand-200 pt-1 mt-1">
                <span className="text-amber-700">Balance Due</span><span className="text-amber-600 text-lg">{inr(payEntry.balance)}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-brand-700 mb-1">Payment Amount (₹) *</p>
              <input type="number" placeholder="0" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                className="w-full rounded-xl border-2 border-brand-200 bg-white px-3 py-3 text-2xl font-black text-center focus:border-brand-500 focus:outline-none normal-case" />
              {/* Quick amount buttons */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {[payEntry.balance, Math.ceil(payEntry.balance / 2 / 50) * 50, 500, 1000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4).map(v => (
                  <button key={v} onClick={() => setPayAmount(String(v))}
                    className="px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-sm font-semibold hover:bg-brand-100 transition">
                    {inr(v)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-brand-700 mb-1">Note (optional)</p>
              <input type="text" placeholder="e.g. Cash payment" value={payNote} onChange={e => setPayNote(e.target.value)} data-no-caps
                className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
            </div>

            {payAmount && Number(payAmount) > 0 && (
              <div className={`flex justify-between items-center rounded-xl px-4 py-3 ${payEntry.balance - Number(payAmount) > 0 ? "bg-amber-50" : "bg-green-50"}`}>
                <span className="text-sm font-semibold text-slate-600">Remaining after this</span>
                <span className={`font-black text-lg ${payEntry.balance - Number(payAmount) > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {inr(Math.max(0, payEntry.balance - Number(payAmount)))}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPayEntry(null)}>Cancel</Button>
              <Button className="flex-1 py-3 text-base font-bold" onClick={savePayment} disabled={paySaving}>
                {paySaving ? "Saving…" : "Record Payment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
