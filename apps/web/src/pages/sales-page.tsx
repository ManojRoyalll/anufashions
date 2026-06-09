import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { inr } from "@/lib/utils";

export default function SalesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState(0);
  const [gst, setGst] = useState(0);
  const [cart, setCart] = useState<Array<{ productId: string; name: string; quantity: number; unitPrice: number }>>([]);

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data));
  }, []);

  const filtered = products.filter((p) =>
    [p.name, p.code, p.barcode, p.category?.name].join(" ").toLowerCase().includes(query.toLowerCase())
  );

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0), [cart]);
  const total = subtotal - discount + gst;

  const addToCart = (product: any) => {
    setCart((prev) => {
      const found = prev.find((c) => c.productId === product.id);
      if (found) {
        return prev.map((c) => (c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, unitPrice: product.sellingPrice }];
    });
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    await api.post("/sales", {
      saleDate: new Date().toISOString(),
      paymentMethod,
      discount,
      gst,
      items: cart
    });
    setCart([]);
    setDiscount(0);
    setGst(0);
    alert("Bill generated and sale recorded");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-xl font-bold">POS Sales Screen</h2>
          <Input placeholder="Search by product name, code, barcode, category" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="max-h-[520px] space-y-2 overflow-auto">
            {filtered.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-xl bg-white/80 p-3">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-slate-600">{product.code} | Stock: {product.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{inr(product.sellingPrice)}</span>
                  <Button size="sm" onClick={() => addToCart(product)}>Add</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h3 className="text-lg font-semibold">Cart</h3>
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.productId} className="rounded-xl bg-white/80 p-3">
                <p className="text-sm font-medium">{item.name}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {
                      const quantity = Number(e.target.value);
                      setCart((prev) => prev.map((c) => (c.productId === item.productId ? { ...c, quantity } : c)));
                    }}
                    className="w-20"
                  />
                  <span className="text-sm">{inr(item.unitPrice * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Discount" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            <Input type="number" placeholder="GST" value={gst} onChange={(e) => setGst(Number(e.target.value))} />
          </div>

          <select className="h-10 w-full rounded-xl border border-brand-200 bg-white/80 px-3 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
          </select>

          <div className="rounded-xl bg-brand-100 p-3">
            <p className="text-sm">Subtotal: {inr(subtotal)}</p>
            <p className="text-sm">Total: {inr(total)}</p>
          </div>

          <Button className="w-full" onClick={checkout}>Generate Bill</Button>
        </CardContent>
      </Card>
    </div>
  );
}
