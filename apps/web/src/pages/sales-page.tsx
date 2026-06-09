import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/store/toast";
import { inr } from "@/lib/utils";

type CartItem = { productId: string; name: string; quantity: number; unitPrice: number; purchasePrice: number; discountLimit?: number };

export default function SalesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState(0);
  const [gst, setGst] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const { show } = useToastStore();

  useEffect(() => {
    Promise.all([api.get("/products"), api.get("/customers")]).then(([p, c]) => {
      setProducts(p.data);
      setCustomers(c.data);
    });
  }, []);

  const filtered = products.filter((p) =>
    [p.name, p.code, p.barcode, p.category?.name].join(" ").toLowerCase().includes(query.toLowerCase())
  );

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [cart]);
  const total = subtotal - discount + gst;

  const discountPct = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  const discountWarnings = cart.filter((i) => i.discountLimit != null && discountPct > i.discountLimit);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const found = prev.find((c) => c.productId === product.id);
      if (found) return prev.map((c) => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { productId: product.id, name: product.name, quantity: 1, unitPrice: product.sellingPrice, purchasePrice: product.purchasePrice, discountLimit: product.discountLimit }];
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
      show("Bill generated successfully");
    } catch { show("Failed to record sale", "error"); }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-xl font-bold text-brand-900">POS Sales Screen</h2>
          <Input placeholder="Search by product name, code, barcode, category" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="max-h-[520px] space-y-2 overflow-auto">
            {filtered.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-xl bg-white/80 p-3 border border-brand-50">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.code} · {product.category?.name} · Stock: {product.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{inr(product.sellingPrice)}</p>
                    {product.discountLimit != null && <p className="text-xs text-slate-400">Max disc: {product.discountLimit}%</p>}
                  </div>
                  <Button size="sm" onClick={() => addToCart(product)} disabled={product.quantity === 0}>Add</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h3 className="text-lg font-semibold">Cart</h3>

          {discountWarnings.length > 0 && (
            <div className="rounded-xl bg-terra-50 px-3 py-2 text-xs text-terra-600 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Discount exceeds limit for: {discountWarnings.map(i => i.name).join(", ")}</span>
            </div>
          )}

          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.productId} className="rounded-xl bg-brand-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-slate-500">Margin: {inr(item.unitPrice - item.purchasePrice)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Input type="number" min={1} value={item.quantity}
                    onChange={(e) => setCart((prev) => prev.map((c) => c.productId === item.productId ? { ...c, quantity: Number(e.target.value) } : c))}
                    className="w-20" />
                  <span className="text-sm font-semibold">{inr(item.unitPrice * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <select className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Walk-in Customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min={0} placeholder="Discount (₹)" value={discount} onChange={(e) => setDiscount(Math.min(Number(e.target.value), subtotal))} />
            <Input type="number" placeholder="GST (₹)" value={gst} onChange={(e) => setGst(Number(e.target.value))} />
          </div>

          <select className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
          </select>

          <div className="rounded-xl bg-brand-100 p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
            <div className="flex justify-between text-terra-600"><span>Discount</span><span>- {inr(discount)}</span></div>
            <div className="flex justify-between"><span>GST</span><span>+ {inr(gst)}</span></div>
            <div className="flex justify-between font-bold text-base border-t border-brand-200 pt-1"><span>Total</span><span>{inr(total)}</span></div>
          </div>

          <Button className="w-full" onClick={checkout} disabled={cart.length === 0}>Generate Bill</Button>
        </CardContent>
      </Card>
    </div>
  );
}
