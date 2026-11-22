import { supabase } from "@/lib/supabase";

export type LabelVariant = "code" | "price";
export type LabelSize = { w: number; h: number; label: string };

export type HistoryEntry = {
  id: string;
  ts: number;
  variant: LabelVariant;
  name: string;
  code: string;
  price: string;
  size: LabelSize;
  count: number;
};

const LS_KEY = "label-history";
const TABLE = "LabelHistory";

// ── localStorage cache (also the offline fallback) ────────────────────────────
function lsRead(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
function lsWrite(list: HistoryEntry[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 200))); } catch { /* ignore */ }
}

// ── row <-> entry mapping ─────────────────────────────────────────────────────
type Row = {
  id: string; variant: LabelVariant; name: string; code: string; price: string;
  sizeW: number; sizeH: number; sizeLabel: string; count: number; createdAt: string;
};

function rowToEntry(r: Row): HistoryEntry {
  return {
    id: r.id,
    ts: new Date(r.createdAt).getTime(),
    variant: r.variant,
    name: r.name ?? "",
    code: r.code ?? "",
    price: r.price ?? "",
    size: { w: Number(r.sizeW), h: Number(r.sizeH), label: r.sizeLabel ?? "" },
    count: r.count ?? 1,
  };
}
function entryToRow(e: HistoryEntry): Row {
  return {
    id: e.id, variant: e.variant, name: e.name, code: e.code, price: e.price,
    sizeW: e.size.w, sizeH: e.size.h, sizeLabel: e.size.label, count: e.count,
    createdAt: new Date(e.ts).toISOString(),
  };
}

// ── public API ────────────────────────────────────────────────────────────────
export async function listHistory(): Promise<HistoryEntry[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("createdAt", { ascending: false })
      .limit(200);
    if (!error && data) {
      const list = (data as Row[]).map(rowToEntry);
      lsWrite(list);
      return list;
    }
  }
  return lsRead();
}

export async function addHistory(input: Omit<HistoryEntry, "id" | "ts">): Promise<void> {
  const entry: HistoryEntry = {
    ...input,
    id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
    ts: Date.now(),
  };
  lsWrite([entry, ...lsRead()]);
  if (supabase) {
    try { await supabase.from(TABLE).insert(entryToRow(entry)); } catch { /* keep local copy */ }
  }
}

export async function removeHistory(id: string): Promise<void> {
  lsWrite(lsRead().filter((x) => x.id !== id));
  if (supabase) {
    try { await supabase.from(TABLE).delete().eq("id", id); } catch { /* ignore */ }
  }
}

export async function clearHistory(): Promise<void> {
  lsWrite([]);
  if (supabase) {
    try { await supabase.from(TABLE).delete().neq("id", ""); } catch { /* ignore */ }
  }
}
