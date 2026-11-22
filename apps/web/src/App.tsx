import { useState } from "react";
import { Tag } from "lucide-react";
import { LabelCreator } from "@/components/ui/label-printer";

type Mode = "code" | "price";

export default function App() {
  const [mode, setMode] = useState<Mode>("code");

  const tabs: { key: Mode; label: string }[] = [
    { key: "code",  label: "Bill Code Label" },
    { key: "price", label: "Price Label" },
  ];

  return (
    <div className="min-h-dvh bg-brand-50/40">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md">
        <div className="mx-auto max-w-md px-4 py-3.5 flex items-center gap-3">
          <div className="rounded-xl bg-white/15 p-2">
            <Tag className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">Anu Fashions — Labels</h1>
            <p className="text-xs text-white/80">లేబుల్ తయారీ</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-10 pt-4">
        <div className="grid grid-cols-2 gap-2 mb-5 rounded-2xl bg-white border border-brand-100 p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === tab.key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-brand-700 hover:bg-brand-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <LabelCreator key={mode} variant={mode} />
      </main>
    </div>
  );
}
