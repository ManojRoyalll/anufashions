import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { inr } from "@/lib/utils";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  const load = () => {
    api.get("/products", { params: { q: query } }).then((r) => setProducts(r.data));
  };

  useEffect(() => {
    load();
  }, []);

  const lowStockCount = useMemo(() => products.filter((p) => p.stockStatus !== "IN_STOCK").length, [products]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Product Management</h2>
            <p className="text-sm text-slate-600">Track stock, margin, and pricing in one place.</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Search by name/code/barcode" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button onClick={load}>Search</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Total Items: {products.length}</p>
            <Badge className="bg-red-100 text-red-700">Low/Out of Stock: {lowStockCount}</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="pb-2">Code</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Buy</th>
                  <th className="pb-2">Sell</th>
                  <th className="pb-2">Margin</th>
                  <th className="pb-2">Profit %</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-brand-100">
                    <td className="py-2">{p.code}</td>
                    <td>{p.name}</td>
                    <td>{p.category?.name}</td>
                    <td>{inr(p.purchasePrice)}</td>
                    <td>{inr(p.sellingPrice)}</td>
                    <td>{inr(p.margin)}</td>
                    <td>{Number(p.profitPercentage).toFixed(1)}%</td>
                    <td>{p.quantity}</td>
                    <td>
                      <Badge className={p.stockStatus === "IN_STOCK" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{p.stockStatus.replaceAll("_", " ")}</Badge>
                    </td>
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
