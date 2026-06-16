import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLang } from "@/hooks/use-lang";
import CategoriesPage from "@/pages/categories";
import PriceRangesPage from "@/pages/price-ranges";
import CustomersPage from "@/pages/customers";
import SuppliersPage from "@/pages/suppliers";
import InvoicesPage from "@/pages/invoices";
import { getSellMultiplier, setSellMultiplier, roundUpTo50 } from "@/lib/utils";

type Tab = "pricing" | "categories" | "prices" | "suppliers" | "invoices" | "customers";

function PricingSettings() {
  const [multiplier, setMultiplier] = useState(() => getSellMultiplier());
  const [saved, setSaved] = useState(false);

  const PRESETS = [
    { label: "2× (double)", value: 2 },
    { label: "2.5×", value: 2.5 },
    { label: "3×", value: 3 },
    { label: "1.5×", value: 1.5 },
    { label: "Custom", value: 0 },
  ];

  const [custom, setCustom] = useState(
    PRESETS.some(p => p.value === getSellMultiplier()) ? "" : String(getSellMultiplier())
  );

  const activePreset = PRESETS.find(p => p.value === multiplier && p.value !== 0) ?? PRESETS[4];

  const save = (v: number) => {
    if (v <= 0) return;
    setSellMultiplier(v);
    setMultiplier(v);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exampleBuy = 245;
  const exampleSell = roundUpTo50(exampleBuy * multiplier);

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-2xl bg-white border border-brand-100 shadow-sm p-5 space-y-5">
        <div>
          <h3 className="font-bold text-brand-900 text-base">Sell Price Multiplier</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            When you enter a buy price, the sell price is automatically set to <strong>buy × multiplier</strong>, rounded up to the nearest ₹50.
          </p>
        </div>

        {/* Preset buttons */}
        <div>
          <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-2">Quick Select</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.filter(p => p.value !== 0).map(p => (
              <button
                key={p.value}
                onClick={() => { save(p.value); setCustom(""); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                  multiplier === p.value
                    ? "bg-brand-700 text-white border-brand-700"
                    : "bg-white text-brand-700 border-brand-200 hover:bg-brand-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom input */}
        <div>
          <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-2">Custom Multiplier</p>
          <div className="flex gap-2 items-center">
            <input
              type="number" min="1" max="10" step="0.1"
              placeholder="e.g. 2.2"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-32 rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              onClick={() => { const v = Number(custom); if (v > 0) save(v); }}
              disabled={!custom || Number(custom) <= 0}
              className="px-4 py-2 rounded-xl bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 disabled:opacity-40 transition"
            >
              Apply
            </button>
            {saved && <span className="text-sm text-green-600 font-semibold">✓ Saved</span>}
          </div>
        </div>

        {/* Live example */}
        <div className="rounded-xl bg-brand-50 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Live Example</p>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">Buy price ₹{exampleBuy}</span>
            <span className="text-slate-400">→</span>
            <span className="font-bold text-brand-900">Sell price ₹{exampleSell}</span>
            <span className="text-xs text-slate-400">({multiplier}× rounded to ₹50)</span>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Current multiplier: <strong className="text-brand-700">{multiplier}×</strong> — applies to Buy Stock and Add Item forms.
          You can always override the auto-filled sell price manually.
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("pricing");

  const tabs: { key: Tab; label: string; sub: string }[] = [
    { key: "pricing",     label: "Pricing",         sub: "ధర సెట్టింగ్" },
    { key: "categories",  label: "Categories",       sub: "రకాలు" },
    { key: "prices",      label: "Price Groups",     sub: "ధర గుంపులు" },
    { key: "suppliers",   label: t.suppliers,        sub: "సరఫరాదారులు" },
    { key: "invoices",    label: "Bills & Invoices", sub: "బిల్లులు" },
    { key: "customers",   label: t.customers,        sub: "కస్టమర్లు" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Settings / సెట్టింగులు</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage categories, price groups, suppliers, invoices and customers</p>
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

      {tab === "pricing"    && <PricingSettings />}
      {tab === "categories" && <CategoriesPage />}
      {tab === "prices"     && <PriceRangesPage />}
      {tab === "suppliers"  && <SuppliersPage />}
      {tab === "invoices"   && <InvoicesPage />}
      {tab === "customers"  && <CustomersPage />}
    </div>
  );
}
