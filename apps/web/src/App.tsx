import { useState } from "react";
import { Tag, RotateCw, LogOut } from "lucide-react";
import { LabelCreator, LabelHistory } from "@/components/ui/label-printer";
import { type HistoryEntry } from "@/lib/history";
import { useAuth, signOut } from "@/lib/auth";
import Login from "@/Login";

type Mode = "code" | "price" | "history";

export default function App() {
  const { loading, session } = useAuth();
  const [mode, setMode] = useState<Mode>("code");
  const [reuse, setReuse] = useState<HistoryEntry | null>(null);
  const [reuseKey, setReuseKey] = useState(0);

  if (loading) {
    return <div className="min-h-dvh bg-brand-50/40 flex items-center justify-center text-sm text-slate-400">Loading…</div>;
  }
  if (!session) {
    return <Login />;
  }

  const tabs: { key: Mode; label: string }[] = [
    { key: "code",    label: "Bill Code" },
    { key: "price",   label: "Price" },
    { key: "history", label: "History" },
  ];

  const selectTab = (key: Mode) => { setReuse(null); setMode(key); };

  const handleReuse = (entry: HistoryEntry) => {
    setReuse(entry);
    setReuseKey((k) => k + 1);
    setMode(entry.variant);
  };

  return (
    <div className="min-h-dvh bg-brand-50/40">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md">
        <div className="mx-auto max-w-md px-4 py-3.5 flex items-center gap-3">
          <div className="rounded-xl bg-white/15 p-2">
            <Tag className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">Anu Fashions</h1>
            <p className="text-xs text-white/80">లేబుల్ తయారీ</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            aria-label="Refresh"
            className="ml-auto rounded-xl bg-white/15 p-2.5 active:bg-white/25 touch-manipulation"
          >
            <RotateCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => signOut()}
            aria-label="Sign out"
            className="rounded-xl bg-white/15 p-2.5 active:bg-white/25 touch-manipulation"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-10 pt-4">
        <div className="grid grid-cols-3 gap-1.5 mb-5 rounded-2xl bg-white border border-brand-100 p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => selectTab(tab.key)}
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

        {mode === "history" ? (
          <LabelHistory onReuse={handleReuse} />
        ) : (
          <LabelCreator
            key={`${mode}-${reuseKey}`}
            variant={mode}
            initial={reuse && reuse.variant === mode ? reuse : undefined}
          />
        )}
      </main>
    </div>
  );
}
