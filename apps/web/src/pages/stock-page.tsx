import { useState } from "react";
import { useLang } from "@/hooks/use-lang";
import { cn } from "@/lib/utils";
import AddStockPage from "@/pages/add-stock-page";
import ProductsPage from "@/pages/products-page";

export default function StockPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<"add" | "view">("add");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("add")}
          className={cn(
            "rounded-xl px-5 py-2.5 text-sm font-bold transition",
            tab === "add"
              ? "bg-brand-700 text-white"
              : "bg-white border border-brand-200 text-brand-700 hover:bg-brand-50"
          )}
        >
          ➕ {t.addNew}
          <span className="ml-1.5 text-xs font-normal opacity-70">సరుకు చేర్చు</span>
        </button>
        <button
          onClick={() => setTab("view")}
          className={cn(
            "rounded-xl px-5 py-2.5 text-sm font-bold transition",
            tab === "view"
              ? "bg-brand-700 text-white"
              : "bg-white border border-brand-200 text-brand-700 hover:bg-brand-50"
          )}
        >
          📦 {t.viewAll}
          <span className="ml-1.5 text-xs font-normal opacity-70">నా సరుకు</span>
        </button>
      </div>

      {tab === "add" ? <AddStockPage /> : <ProductsPage />}
    </div>
  );
}
