import { useState } from "react";
import { Tag } from "lucide-react";
import { PriceLabelCreator, CustomLabelCreator } from "@/components/ui/label-printer";

type Mode = "price" | "custom";

export default function App() {
  const [mode, setMode] = useState<Mode>("price");

  const tabs: { key: Mode; label: string; sub: string }[] = [
    { key: "price",  label: "Price Label",  sub: "Purchase + Sell price → item code" },
    { key: "custom", label: "Custom Label", sub: "Name + Sell price only" },
  ];

  return (
    <div className="min-h-screen bg-brand-50/40">
      <header className="bg-gradient-to-r from-brand-600 to-brand-700 text-white">
        <div className="mx-auto max-w-3xl px-4 py-5 flex items-center gap-3">
          <div className="rounded-2xl bg-white/15 p-2.5">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Anu Fashions — Label Creation</h1>
            <p className="text-sm text-white/80">లేబుల్ తయారీ</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                mode === tab.key
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-brand-800 border-brand-200 hover:border-brand-400"
              }`}
            >
              <p className="font-bold">{tab.label}</p>
              <p className={`text-xs mt-0.5 ${mode === tab.key ? "text-white/80" : "text-slate-500"}`}>{tab.sub}</p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-white border border-brand-100 shadow-sm p-4 sm:p-6">
          {mode === "price" ? <PriceLabelCreator /> : <CustomLabelCreator />}
        </div>
      </main>
    </div>
  );
}
