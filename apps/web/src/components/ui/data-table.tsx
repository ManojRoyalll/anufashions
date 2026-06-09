import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
};

type DataTableProps<T extends { id: string }> = {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  emptyMessage?: string;
  headerExtra?: React.ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  searchable,
  searchPlaceholder = "Search...",
  searchKeys = [],
  emptyMessage = "No records found.",
  headerExtra
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const perPage = 15;

  const filtered = data.filter((row) => {
    if (!query) return true;
    return searchKeys.some((k) =>
      String(row[k] ?? "").toLowerCase().includes(query.toLowerCase())
    );
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortKey] ?? "";
        const bv = (b as Record<string, unknown>)[sortKey] ?? "";
        const an = Number(av);
        const bn = Number(bv);
        if (!isNaN(an) && !isNaN(bn)) {
          return sortDir === "asc" ? an - bn : bn - an;
        }
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paged = sorted.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  return (
    <div className="space-y-3">
      {(searchable || headerExtra) && (
        <div className="flex items-center gap-3">
          {searchable && (
            <Input
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="max-w-xs"
            />
          )}
          {headerExtra}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-brand-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn("px-4 py-3 font-semibold text-brand-800", col.sortable && "cursor-pointer select-none")}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">{emptyMessage}</td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr key={row.id} className="border-t border-brand-50 hover:bg-brand-50/40">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{sorted.length} records</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded px-2 py-1 hover:bg-brand-100 disabled:opacity-40">Prev</button>
            <span>Page {page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded px-2 py-1 hover:bg-brand-100 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
