import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { inr } from "@/lib/utils";
import { useToastStore } from "@/store/toast";

export default function PurchasesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [costPrice, setCostPrice] = useState(0);
  const { show } = useToastStore();

  const load = () => {
    Promise.all([api.get("/products"), api.get("/suppliers"), api.get("/purchases")]).then(([p, s, h]) => {
      setProducts(p.data);
      setSuppliers(s.data);
      setHistory(h.data);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const createPurchase = async () => {
    if (!supplierId || !productId) {
      show("Please select a supplier and product", "error");
      return;
    }
    try {
      await api.post("/purchases", {
        purchaseDate: new Date().toISOString(),
        supplierId,
        invoiceNo,
        items: [{ productId, quantity, costPrice }]
      });
      setInvoiceNo("");
      load();
      show("Purchase recorded");
    } catch {
      show("Failed to record purchase", "error");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <select className="h-10 rounded-xl border border-brand-200 bg-white/80 px-3 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Supplier</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Input placeholder="Invoice Number" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          <select className="h-10 rounded-xl border border-brand-200 bg-white/80 px-3 text-sm" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          <Input type="number" min={1} value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} />
          <Button onClick={createPurchase}>Record Purchase</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-3 font-semibold">Purchase History</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Supplier</th>
                  <th className="pb-2">Invoice</th>
                  <th className="pb-2">Items</th>
                  <th className="pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-brand-100">
                    <td className="py-2">{new Date(h.purchaseDate).toLocaleDateString()}</td>
                    <td>{h.supplier?.name}</td>
                    <td>{h.invoiceNo}</td>
                    <td>{h.items.length}</td>
                    <td>{inr(h.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
