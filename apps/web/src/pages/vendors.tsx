import { useState } from "react";
import { cn } from "@/lib/utils";
import SuppliersPage from "@/pages/suppliers";
import BuyPage from "@/pages/buy";
import InvoicesPage from "@/pages/invoices";

type Tab = "suppliers" | "buy" | "invoices";

export default function VendorsPage() {
  const [tab, setTab] = useState<Tab>("suppliers");

  const tabs: { key: Tab; label: string; sub: string; emoji: string }[] = [
    { key: "suppliers", label: "Vendors",       sub: "వ్యాపారులు",  emoji: "🏪" },
    { key: "buy",       label: "Buy Stock",     sub: "కొనుగోలు",   emoji: "🛒" },
    { key: "invoices",  label: "Bills",         sub: "బిల్లులు",   emoji: "📄" },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition",
              tab === t.key
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white border border-brand-200 text-brand-700 hover:bg-brand-50"
            )}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
            <span className={cn("text-xs font-normal", tab === t.key ? "opacity-70" : "text-slate-400")}>{t.sub}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "suppliers" && <SuppliersPage />}
      {tab === "buy"       && <BuyPage />}
      {tab === "invoices"  && <InvoicesPage />}
    </div>
  );
}
