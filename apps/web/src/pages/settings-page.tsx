import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLang } from "@/hooks/use-lang";
import CategoriesPage from "@/pages/categories-page";
import PriceRangesPage from "@/pages/price-ranges-page";
import CustomersPage from "@/pages/customers-page";

type Tab = "categories" | "prices" | "customers";

export default function SettingsPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("categories");

  const tabs: { key: Tab; label: string; sub: string }[] = [
    { key: "categories", label: "Categories", sub: "రకాలు" },
    { key: "prices", label: "Price Groups", sub: "ధర గుంపులు" },
    { key: "customers", label: t.customers, sub: "కస్టమర్లు" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Settings / సెట్టింగులు</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage categories, price groups and customers</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab_) => (
          <button
            key={tab_.key}
            onClick={() => setTab(tab_.key)}
            className={cn(
              "rounded-xl px-4 py-2.5 text-sm font-bold transition",
              tab === tab_.key
                ? "bg-brand-700 text-white"
                : "bg-white border border-brand-200 text-brand-700 hover:bg-brand-50"
            )}
          >
            {tab_.label}
            <span className={cn("ml-1.5 text-xs font-normal", tab === tab_.key ? "opacity-70" : "text-slate-400")}>
              {tab_.sub}
            </span>
          </button>
        ))}
      </div>

      {tab === "categories" && <CategoriesPage />}
      {tab === "prices" && <PriceRangesPage />}
      {tab === "customers" && <CustomersPage />}
    </div>
  );
}
