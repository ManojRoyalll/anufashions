// apps/web/src/pages/sales-page.tsx
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/store/toast";
import { useLang } from "@/hooks/use-lang";
import { inr } from "@/lib/utils";

type CartItem = {
  productId: string; name: string; quantity: number;
  unitPrice: number; purchasePrice: number; discountLimit?: number;
};

type SaleRecord = {
  id: string; saleDate: string; totalAmount: number; paymentMethod: string;
  items: { quantity: number }[];
};

type HistoryPeriod = "today" | "week" | "month";

export default function SalesPage() {
  const { t } = useLang();
  const { show } = useToastStore();

  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState(0);
  const [gst, setGst] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [period, setPeriod] = useState<HistoryPeriod>("today");

  const loadData = () =>
    Promise.all([api.get("/products"), api.get("/customers")]).then(([p, c]) => {
      setProducts(p.data);
      setCustomers(c.data);
    });

  const loadHistory = (p: HistoryPeriod) => {
    const now = new Date();
    let from: string;
    if (p === "today") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (p === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = d.toISOString();
    } else {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      from = d.toISOString();
    }
    api.get("/sales", { params: { from } }).then((r) => setSalesHistory(r.data)).catch(() => {
      api.get("/sales").then((r) => setSalesHistory(r.data));
    });
  };

  useEffect(() => { loadData(); loadHistory("today"); }, []);

  const changePeriod = (p: HistoryPeriod) => { setPeriod(p); loadHistory(p); };

  const filtered = products.filter((p) =>
    [p.name, p.code, p.barcode, p.category?.name].join(" ").toLowerCase().includes(query.toLowerCase())
  );

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [cart]);
  const total = subtotal - discount + gst;
  const discountPct = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  const discountWarnings = cart.filter((i) => i.discountLimit != null && discountPct > i.discountLimit);
  const historyTotal = salesHistory.reduce((s, r) => s + Number(r.totalAmount), 0);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const found = prev.find((c) => c.productId === product.id);
      if (found) return prev.map((c) => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, {
        productId: product.id, name: product.name, quantity: 1,
        unitPrice: product.sellingPrice, purchasePrice: product.purchasePrice,
        discountLimit: product.discountLimit
      }];
    });
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const safeDiscount = Math.min(discount, subtotal);
    try {
      await api.post("/sales", {
        saleDate: new Date().toISOString(),
        customerId: customerId || undefined,
        paymentMethod,
        discount: safeDiscount,
        gst,
        items: cart.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice }))
      });
      setCart([]); setDiscount(0); setGst(0); setCustomerId("");
      show(t.generateBill + " ✓");
      loadHistory(period);
      loadData();
    } catch { show("Error", "error"); }
  };

  const periodLabel: Record<HistoryPeriod, string> = {
    today: t.today,
    week: t.thisWeek,
    month: t.thisMonth
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardContent className="space-y-3">
            <h2 className="text-xl font-bold text-brand-900">{t.sell}</h2>
            <Input placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="max-h-[460px] space-y-2 overflow-auto">
              {filtered.map((product) => (
                <div key={product.id} className="flex items-center justify-between rounded-xl bg-white/80 p-3 border border-brand-50">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {product.category?.name} · {t.stock}: {product.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{inr(product.sellingPrice)}</p>
                      {product.discountLimit != null && (
                        <p className="text-xs text-slate-400">{t.maxDisc}: {product.discountLimit}%</p>
                      )}
                    </div>
                    <Button size="sm" onClick={() => addToCart(product)} disabled={product.quantity === 0}>
                      {t.addToBill}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <h3 className="text-lg font-semibold">{t.cart}</h3>

            {discountWarnings.length > 0 && (
              <div className="rounded-xl bg-terra-50 px-3 py-2 text-xs text-terra-600 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{t.discountWarning}: {discountWarnings.map(i => i.name).join(", ")}</span>
              </div>
            )}

            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.productId} className="rounded-xl bg-brand-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-slate-500">{t.margin}: {inr(item.unitPrice - item.purchasePrice)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Input type="number" min={1} value={item.quantity}
                      onChange={(e) => setCart((prev) => prev.map((c) =>
                        c.productId === item.productId ? { ...c, quantity: Number(e.target.value) } : c
                      ))}
                      className="w-20" />
                    <span className="text-sm font-semibold">{inr(item.unitPrice * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            <select className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">{t.walkIn}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min={0} placeholder={t.discount} value={discount}
                onChange={(e) => setDiscount(Math.min(Number(e.target.value), subtotal))} />
              <Input type="number" placeholder={t.gst} value={gst}
                onChange={(e) => setGst(Number(e.target.value))} />
            </div>

            <select className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="CASH">{t.cash}</option>
              <option value="UPI">{t.upi}</option>
              <option value="CARD">{t.card}</option>
            </select>

            <div className="rounded-xl bg-brand-100 p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>{t.subtotal}</span><span>{inr(subtotal)}</span></div>
              <div className="flex justify-between text-terra-600"><span>{t.discount}</span><span>- {inr(discount)}</span></div>
              <div className="flex justify-between"><span>{t.gst}</span><span>+ {inr(gst)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-brand-200 pt-1">
                <span>{t.total}</span><span>{inr(total)}</span>
              </div>
            </div>

            <Button className="w-full text-base py-3" onClick={checkout} disabled={cart.length === 0}>
              {t.generateBill}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sales History */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-semibold">{t.todaysSales}</h3>
            <div className="flex gap-1">
              {(["today", "week", "month"] as HistoryPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => changePeriod(p)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    period === p
                      ? "bg-brand-700 text-white"
                      : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                  }`}
                >
                  {periodLabel[p]}
                </button>
              ))}
            </div>
          </div>

          {salesHistory.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">{t.noSales}</p>
          ) : (
            <div className="space-y-2">
              {salesHistory.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {sale.items.reduce((s, i) => s + i.quantity, 0)} {t.items}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(sale.saleDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {sale.paymentMethod === "CASH" ? t.cash : sale.paymentMethod === "UPI" ? t.upi : t.card}
                    </p>
                  </div>
                  <p className="text-base font-bold text-brand-800">{inr(Number(sale.totalAmount))}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-white border border-brand-200 px-4 py-3 text-sm font-semibold">
            <span>{t.totalSales}: {salesHistory.length} {t.transactions}</span>
            <span className="text-brand-800 text-base">{inr(historyTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
