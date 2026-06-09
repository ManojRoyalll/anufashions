"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/products").then(async (r) => setProducts(await r.json()));
  }, []);

  return (
    <Card>
      <CardContent>
        <h2 className="mb-4 text-xl font-semibold">Inventory</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr><th>Code</th><th>Name</th><th>Qty</th><th>Stock</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t"><td>{p.productCode}</td><td>{p.name}</td><td>{p.quantity}</td><td>{p.stockStatus}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
