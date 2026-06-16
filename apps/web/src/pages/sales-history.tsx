import { useEffect, useMemo, useState } from "react";
import { Trash2, Pencil, Eye, Search } from "lucide-react";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { inr } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Modal } from "@/components/ui/modal";
import { useLang } from "@/hooks/use-lang";
import { PageHeader } from "@/components/ui/page-header";

type SaleItem = {
  id: string; quantity: number; unitPrice: number; lineTotal?: number; purchasePrice?: number;
  product?: { name: string; id: string; supplier?: { name: string }; category?: { name: string } };
};

type Sale = {
  id: string; saleDate: string; totalAmount: number; paymentMethod: string;
  discount: number; revenue?: number; netProfit?: number;
  customer?: { name: string; phone?: string };
  items: SaleItem[];
};

type Period = "today" | "week" | "month" | "all";

export default function SalesHistoryPage() {
  const { t } = useLang();
  const { show } = useToastStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("today");
  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editPayment, setEditPayment] = useState("CASH");
  const [editSaving, setEditSaving] = useState(false);

  const load = async (p: Period) => {
    setLoading(true);
    try {
      const now = new Date();
      let from: string | undefined;
      if (p === "today") from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      else if (p === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString(); }
      else if (p === "month") from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const r = await api.get("/sales", from ? { params: { from } } : undefined);
      setSales(r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load("today"); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sales.filter(s => {
      if (filterPayment && s.paymentMethod !== filterPayment) return false;
      if (!q) return true;
      return (
        s.customer?.name?.toLowerCase().includes(q) ||
        s.items.some(i => i.product?.name?.toLowerCase().includes(q) || i.product?.supplier?.name?.toLowerCase().includes(q))
      );
    });
  }, [sales, search, filterPayment]);

  const totals = useMemo(() => ({
    revenue: filtered.reduce((s, r) => s + Number(r.totalAmount), 0),
    count: filtered.length,
    items: filtered.reduce((s, r) => s + r.items.reduce((si, i) => si + i.quantity, 0), 0),
    profit: filtered.reduce((s, r) => {
      const cogs = r.items.reduce((si, i) => si + i.quantity * Number(i.purchasePrice ?? 0), 0);
      return s + Number(r.totalAmount) - cogs;
    }, 0),
  }), [filtered]);

  const deleteSale = async (id: string) => {
    if (!confirm("Delete this sale?")) return;
    try { await api.delete(`/sales/${id}`); show("Deleted ✓"); load(period); }
    catch { show("Error", "error"); }
  };

  const openEdit = (s: Sale) => { setEditingSale(s); setEditPayment(s.paymentMethod); };

  const saveEdit = async () => {
    if (!editingSale) return;
    setEditSaving(true);
    try {
      await api.put(`/sales/${editingSale.id}`, { paymentMethod: editPayment, updatedAt: new Date().toISOString() });
      show("Updated ✓"); setEditingSale(null); load(period);
    } catch { show("Error", "error"); }
    finally { setEditSaving(false); }
  };

  const periodLabels: Record<Period, string> = { today: "Today", week: "This Week", month: "This Month", all: "All Time" };
  const paymentLabel = (p: string) => p === "CASH" ? "💵 Cash" : p === "UPI" ? "📱 UPI" : "💳 Card";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales History"
        subtitle="అమ్మకాల చరిత్ర"
      />

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white border border-brand-100 shadow-sm p-4">
          <p className="text-xs text-slate-500">Bills</p>
          <p className="text-2xl font-bold text-brand-900">{totals.count}</p>
        </div>
        <div className="rounded-2xl bg-white border border-brand-100 shadow-sm p-4">
          <p className="text-xs text-slate-500">Items Sold</p>
          <p className="text-2xl font-bold text-brand-700">{totals.items}</p>
        </div>
        <div className="rounded-2xl bg-terra-50 border border-terra-200 shadow-sm p-4">
          <p className="text-xs text-slate-500">Revenue</p>
          <p className="text-2xl font-bold text-terra-700">{inr(totals.revenue)}</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-4 ${totals.profit >= 0 ? "bg-brand-50 border-brand-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-xs text-slate-500">Profit</p>
          <p className={`text-2xl font-bold ${totals.profit >= 0 ? "text-brand-700" : "text-red-600"}`}>{inr(totals.profit)}</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="p-3 space-y-3">
          {/* Period */}
          <div className="flex flex-wrap gap-2">
            {(["today", "week", "month", "all"] as Period[]).map(p => (
              <button key={p} onClick={() => { setPeriod(p); load(p); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${period === p ? "bg-brand-700 text-white border-brand-700" : "bg-white text-brand-700 border-brand-200 hover:bg-brand-50"}`}>
                {periodLabels[p]}
              </button>
            ))}
            <div className="flex gap-1 ml-auto">
              {["", "CASH", "UPI", "CARD"].map(pm => (
                <button key={pm} onClick={() => setFilterPayment(pm)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${filterPayment === pm ? "bg-brand-700 text-white border-brand-700" : "bg-white text-brand-700 border-brand-200 hover:bg-brand-50"}`}>
                  {pm === "" ? "All" : pm === "CASH" ? "💵" : pm === "UPI" ? "📱" : "💳"}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text" placeholder="Search item, customer, supplier..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              data-no-caps
              className="w-full rounded-xl border border-brand-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* List */}
          {loading ? (
            <p className="text-center text-sm text-slate-400 py-6">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">No sales found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(sale => {
                const cogs = sale.items.reduce((s, i) => s + i.quantity * Number(i.purchasePrice ?? 0), 0);
                const profit = Number(sale.totalAmount) - cogs;
                return (
                  <div key={sale.id}
                    className="flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-3 cursor-pointer hover:bg-brand-100/60 transition"
                    onClick={() => setDetailSale(sale)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-brand-900">
                          {sale.items.reduce((s, i) => s + i.quantity, 0)} items
                          {sale.customer && <span className="text-brand-600"> · {sale.customer.name}</span>}
                        </p>
                        <span className="text-xs text-slate-400">
                          {new Date(sale.saleDate).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {paymentLabel(sale.paymentMethod)}
                        {sale.items[0]?.product?.supplier?.name && ` · ${sale.items[0].product.supplier.name}`}
                        {sale.items.slice(0, 2).map(i => i.product?.name).filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-brand-800">{inr(Number(sale.totalAmount))}</p>
                      <p className={`text-xs font-semibold ${profit >= 0 ? "text-brand-600" : "text-red-500"}`}>
                        {profit >= 0 ? "+" : ""}{inr(profit)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(sale)} className="p-1.5 text-brand-400 hover:text-brand-700 hover:bg-brand-100 rounded-lg">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteSale(sale.id)} className="p-1.5 text-terra-400 hover:text-terra-600 rounded-lg">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer totals */}
          {filtered.length > 0 && (
            <div className="flex justify-between rounded-xl bg-white border border-brand-200 px-4 py-3 text-sm font-semibold">
              <span>{filtered.length} bills · {totals.items} items</span>
              <span className="text-brand-800">{inr(totals.revenue)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── DETAIL DRAWER ── */}
      <Drawer
        open={!!detailSale}
        onClose={() => setDetailSale(null)}
        title={`Sale — ${new Date(detailSale?.saleDate ?? "").toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`}
      >
        {detailSale && (() => {
          const subT = detailSale.items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0);
          const disc = Number(detailSale.discount) || 0;
          const tot = Number(detailSale.totalAmount);
          const cogs = detailSale.items.reduce((s, i) => s + i.quantity * Number(i.purchasePrice ?? 0), 0);
          const profit = tot - cogs;
          return (
            <div className="space-y-4">
              <div className="bg-white border border-brand-100 rounded-xl p-4 space-y-2 font-mono text-xs">
                <p className="text-center font-bold text-base">Anu Fashions</p>
                <hr className="border-dashed border-brand-200" />
                {detailSale.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate flex-1 mr-2">{item.product?.name ?? "—"} ×{item.quantity}</span>
                    <span className="font-medium">{inr(item.quantity * Number(item.unitPrice))}</span>
                  </div>
                ))}
                <hr className="border-dashed border-brand-200" />
                {disc > 0 && (
                  <>
                    <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{inr(subT)}</span></div>
                    <div className="flex justify-between text-amber-600 font-semibold"><span>Discount</span><span>− {inr(disc)}</span></div>
                  </>
                )}
                <div className="flex justify-between font-black text-sm border-t border-brand-200 pt-1">
                  <span>TOTAL</span><span className="text-terra-700">{inr(tot)}</span>
                </div>
                <div className="flex justify-between text-slate-500"><span>Payment</span><span>{paymentLabel(detailSale.paymentMethod)}</span></div>
              </div>

              <div className={`rounded-xl p-3 flex justify-between items-center ${profit >= 0 ? "bg-brand-50" : "bg-red-50"}`}>
                <div><p className="text-xs text-slate-500">Profit</p><p className={`font-bold text-xl ${profit >= 0 ? "text-brand-700" : "text-red-600"}`}>{inr(profit)}</p></div>
                <div className="text-right"><p className="text-xs text-slate-500">Margin</p><p className={`font-bold text-lg ${profit >= 0 ? "text-brand-600" : "text-red-500"}`}>{subT > 0 ? ((profit / subT) * 100).toFixed(1) : 0}%</p></div>
              </div>

              {detailSale.customer && (
                <div className="bg-brand-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Customer</p>
                  <p className="font-semibold">{detailSale.customer.name}</p>
                  {detailSale.customer.phone && <p className="text-xs text-slate-500">{detailSale.customer.phone}</p>}
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">Items ({detailSale.items.length})</p>
                <div className="space-y-2">
                  {detailSale.items.map((item, i) => (
                    <div key={i} className="bg-white border border-brand-100 rounded-xl px-3 py-2.5">
                      <div className="flex justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{item.product?.name ?? "—"}</p>
                          <p className="text-xs text-slate-500">{item.product?.category?.name}</p>
                          {item.product?.supplier?.name && <p className="text-xs text-brand-600">Supplier: {item.product.supplier.name}</p>}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-semibold">{item.quantity} × {inr(Number(item.unitPrice))}</p>
                          <p className="text-xs text-brand-700 font-bold">{inr(item.quantity * Number(item.unitPrice))}</p>
                          {item.purchasePrice && <p className="text-xs text-slate-400">Buy: {inr(Number(item.purchasePrice))}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { openEdit(detailSale); setDetailSale(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button onClick={() => { if (confirm("Delete?")) { deleteSale(detailSale.id); setDetailSale(null); } }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-terra-600 border border-terra-200 rounded-xl hover:bg-terra-50 transition">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* ── EDIT MODAL ── */}
      <Modal open={!!editingSale} onClose={() => setEditingSale(null)} title="Edit Sale" size="sm">
        {editingSale && (
          <div className="space-y-4">
            <div className="bg-brand-50 rounded-xl p-3 text-sm space-y-1">
              <p className="font-semibold">{editingSale.items.reduce((s, i) => s + i.quantity, 0)} items · {inr(Number(editingSale.totalAmount))}</p>
              <p className="text-slate-500">{new Date(editingSale.saleDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-brand-700 mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {[["CASH", "💵", "Cash"], ["UPI", "📱", "UPI"], ["CARD", "💳", "Card"]].map(([val, icon, label]) => (
                  <button key={val} onClick={() => setEditPayment(val)}
                    className={`rounded-xl py-2.5 text-center font-bold border-2 transition ${editPayment === val ? "bg-brand-700 text-white border-brand-700" : "bg-white text-brand-700 border-brand-200"}`}>
                    <span className="block text-xl">{icon}</span>
                    <span className="block text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setEditingSale(null)}>Cancel</Button>
              <Button className="flex-1" onClick={saveEdit} disabled={editSaving}>{editSaving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
