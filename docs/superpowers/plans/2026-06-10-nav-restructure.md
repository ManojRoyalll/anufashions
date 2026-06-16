# Nav Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse 10-item navigation to 6 clean sections: Sell, My Stock (Add+View tabbed), Bills & Invoices, Suppliers, Categories, Overview (Dashboard+Reports).

**Architecture:** Three new page files (`stock-page.tsx`, `invoices-page.tsx`, `overview-page.tsx`) compose existing page logic. `app-shell.tsx` updated with 6-item nav. `App.tsx` adds new routes while keeping old ones live.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, Axios, Lucide React, Recharts

---

## File Map

### New files
- `apps/web/src/pages/stock-page.tsx` — tabbed Add New / View All
- `apps/web/src/pages/invoices-page.tsx` — Bills & Invoices (replace old purchases UI)
- `apps/web/src/pages/overview-page.tsx` — Dashboard + Reports in one page

### Modified files
- `apps/web/src/lib/i18n.ts` — add new translation keys
- `apps/web/src/App.tsx` — add `/stock`, `/invoices`, `/overview` routes
- `apps/web/src/components/layout/app-shell.tsx` — 6-item nav
- `apps/web/src/pages/suppliers-page.tsx` — swap `outstandingPayments` column for `productsSupplied`

---

## Task 1: Add i18n keys

**Files:**
- Modify: `apps/web/src/lib/i18n.ts`

- [ ] **Step 1: Add new keys to both `en` and `te` objects**

In `apps/web/src/lib/i18n.ts`, add the following keys to the `en` object (after the existing `businessReports` key):

```ts
    addNew: "Add New",
    viewAll: "View All",
    invoices: "Bills & Invoices",
    totalBill: "Total Bill (₹)",
    billPhoto: "Bill Photo",
    overview: "Overview",
    downloadReports: "Download Reports",
    itemsSupplied: "Items Supplied",
    date: "Date",
    noInvoices: "No invoices yet",
```

Add to the `te` object (after `summaryPdf`):

```ts
    addNew: "కొత్తది చేర్చు",
    viewAll: "అన్నీ చూడు",
    invoices: "బిల్లులు & ఇన్వాయిసులు",
    totalBill: "మొత్తం బిల్లు (₹)",
    billPhoto: "బిల్లు ఫోటో",
    overview: "సారాంశం",
    downloadReports: "నివేదికలు డౌన్లోడ్",
    itemsSupplied: "సరఫరా వస్తువులు",
    date: "తేదీ",
    noInvoices: "ఇంకా బిల్లులు లేవు",
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/i18n.ts
git commit -m "feat: add i18n keys for invoices, overview, stock tabs"
```

---

## Task 2: Stock page (tabbed Add New + View All)

**Files:**
- Create: `apps/web/src/pages/stock-page.tsx`

- [ ] **Step 1: Create stock-page.tsx**

```tsx
// apps/web/src/pages/stock-page.tsx
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/stock-page.tsx
git commit -m "feat: add StockPage with Add New / View All tabs"
```

---

## Task 3: Invoices page (Bills & Invoices)

**Files:**
- Create: `apps/web/src/pages/invoices-page.tsx`

- [ ] **Step 1: Create invoices-page.tsx**

```tsx
// apps/web/src/pages/invoices-page.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToastStore } from "@/store/toast";
import { useLang } from "@/hooks/use-lang";
import { inr } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type Supplier = { id: string; name: string };
type Product = { id: string; name: string; purchasePrice: number };
type InvoiceItem = { id: string; productId: string; quantity: number; costPrice: number };
type PurchaseRecord = {
  id: string; purchaseDate: string; invoiceNo: string; totalAmount: number;
  supplier?: { name: string }; items: { quantity: number }[];
};

function emptyItem(): InvoiceItem {
  return { id: Math.random().toString(36).slice(2), productId: "", quantity: 1, costPrice: 0 };
}

export default function InvoicesPage() {
  const { t } = useLang();
  const { show } = useToastStore();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<PurchaseRecord[]>([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [billPhoto, setBillPhoto] = useState<string | undefined>();
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  const load = () =>
    Promise.all([
      api.get("/suppliers"),
      api.get("/products"),
      api.get("/purchases")
    ]).then(([s, p, h]) => {
      setSuppliers(s.data);
      setProducts(p.data);
      setHistory(h.data);
    });

  useEffect(() => { load(); }, []);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const updateItem = (id: string, field: keyof Omit<InvoiceItem, "id">, val: string | number) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: val } : i));

  const onProductSelect = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    setItems((prev) => prev.map((i) =>
      i.id === itemId ? { ...i, productId, costPrice: product ? product.purchasePrice : 0 } : i
    ));
  };

  const submit = async () => {
    if (!supplierId) { show("Select a supplier", "error"); return; }
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) { show("Add at least one item", "error"); return; }
    setSaving(true);
    try {
      await api.post("/purchases", {
        purchaseDate: new Date(date).toISOString(),
        supplierId,
        invoiceNo: invoiceNo || `INV-${Date.now()}`,
        items: validItems.map(({ productId, quantity, costPrice }) => ({ productId, quantity, costPrice }))
      });
      show(t.recordPurchase + " ✓");
      setDate(new Date().toISOString().slice(0, 10));
      setSupplierId("");
      setInvoiceNo("");
      setTotalAmount("");
      setBillPhoto(undefined);
      setItems([emptyItem()]);
      load();
    } catch (e: any) {
      show(e?.response?.data?.error || "Error", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.invoices}
        subtitle="బిల్లులు — Record supplier invoices"
      />

      {/* ADD INVOICE FORM */}
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-bold text-brand-900">Add Invoice / ఇన్వాయిస్ చేర్చు</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t.date} required>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
              />
            </FormField>
            <FormField label={t.invoiceNo}>
              <input
                type="text"
                autoComplete="off"
                placeholder="e.g. INV-2026-001"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
              />
            </FormField>
          </div>

          <FormField label={t.supplier} required>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">{t.supplier}...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>

          <FormField label={t.totalBill}>
            <input
              type="number"
              placeholder="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </FormField>

          <FormField label={t.billPhoto}>
            <ImageUpload value={billPhoto} onChange={setBillPhoto} />
            <p className="text-xs text-slate-400 mt-1">Photo is shown as preview only (not saved to server)</p>
          </FormField>

          {/* Items */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">{t.items}</p>
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 mb-1 px-1">
              {["Item / Saree", "Qty", "Cost ₹", ""].map((h) => (
                <p key={h} className="text-xs font-semibold text-brand-600">{h}</p>
              ))}
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
                  <select
                    value={item.productId}
                    onChange={(e) => onProductSelect(item.id, e.target.value)}
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Select item...</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm text-center shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.costPrice}
                    onChange={(e) => updateItem(item.id, "costPrice", Number(e.target.value))}
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                  <button
                    onClick={() => items.length > 1 ? removeItem(item.id) : undefined}
                    className={`p-2 rounded-xl ${items.length > 1 ? "text-red-400 hover:bg-red-50" : "text-slate-200"}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 font-medium mt-2"
            >
              <Plus className="h-4 w-4" /> Add item
            </button>
          </div>

          <Button className="w-full" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "✅ " + t.recordPurchase}
          </Button>
        </CardContent>
      </Card>

      {/* INVOICE HISTORY */}
      <Card>
        <CardContent className="space-y-3">
          <h3 className="font-bold text-brand-900">{t.purchaseHistory}</h3>

          {history.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">{t.noInvoices}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-brand-100">
                    <th className="pb-2 font-semibold">{t.date}</th>
                    <th className="pb-2 font-semibold">{t.supplier}</th>
                    <th className="pb-2 font-semibold">{t.invoiceNo}</th>
                    <th className="pb-2 font-semibold text-right">{t.items}</th>
                    <th className="pb-2 font-semibold text-right">{t.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t border-brand-50 hover:bg-brand-50/40">
                      <td className="py-2">{new Date(h.purchaseDate).toLocaleDateString("en-IN")}</td>
                      <td className="font-medium">{h.supplier?.name ?? "-"}</td>
                      <td className="text-slate-500">{h.invoiceNo || "-"}</td>
                      <td className="text-right">{h.items.length}</td>
                      <td className="text-right font-semibold text-brand-800">{inr(h.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/invoices-page.tsx
git commit -m "feat: add InvoicesPage — Bills & Invoices with labelled form and history"
```

---

## Task 4: Overview page (Dashboard + Reports combined)

**Files:**
- Create: `apps/web/src/pages/overview-page.tsx`

- [ ] **Step 1: Create overview-page.tsx**

```tsx
// apps/web/src/pages/overview-page.tsx
import { useEffect, useState } from "react";
import {
  AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { AlertTriangle, Download } from "lucide-react";
import api from "@/lib/api";
import { inr } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { useLang } from "@/hooks/use-lang";
import type { DashboardPayload, AnalyticsPayload } from "@/types";

const PIE_COLORS = ["#7f8a44", "#c85a30", "#8ca86a", "#b16f50", "#5e7a7a", "#a48b55"];

export default function OverviewPage() {
  const { t } = useLang();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    Promise.all([api.get("/dashboard"), api.get("/analytics/overview")]).then(([d, a]) => {
      setDashboard(d.data);
      setAnalytics(a.data);
    });
  }, []);

  const download = async (path: string, filename: string) => {
    const response = await api.get(path, { responseType: "blob" });
    const blob = new Blob([response.data]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (!dashboard || !analytics) {
    return <p className="p-8 text-sm text-slate-500">{t.loading}</p>;
  }

  const c = dashboard.cards;
  const alerts = [...(analytics.notifications?.lowStock ?? []), ...(analytics.notifications?.outOfStock ?? [])];

  return (
    <div className="space-y-5">
      {/* KPI CARDS */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.totalInvestment} value={inr(c.totalInvestment)} accent="brand" />
        <StatCard label={t.totalInventoryValue} value={inr(c.totalInventoryValue)} accent="brand" />
        <StatCard label={t.totalRevenue} value={inr(c.totalRevenue)} accent="terra" />
        <StatCard label={t.totalProfit} value={inr(c.totalProfit)} accent="terra" />
        <StatCard label={t.monthlyProfit} value={inr(c.monthlyProfit)} accent="brand" />
        <StatCard label={t.todaysSalesCount} value={String(c.todaysSales)} accent="terra" subtitle={t.transactions} />
        <StatCard label={t.stockRemaining} value={String(c.stockRemaining)} accent="slate" subtitle={t.units} />
        <StatCard label={t.netProfit} value={inr(c.netProfitAfterExpenses)} accent="terra" />
      </section>

      {/* INVESTMENT RECOVERY */}
      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-brand-800">{t.investmentRecovery}</h3>
            <span className="text-sm font-bold text-brand-700">{dashboard.investmentRecovery.progress.toFixed(1)}%</span>
          </div>
          <Progress value={dashboard.investmentRecovery.progress} />
          <p className="text-sm text-slate-500">{t.remaining}: {inr(dashboard.investmentRecovery.remainingInvestment)}</p>
        </CardContent>
      </Card>

      {/* CHARTS */}
      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">Daily Sales</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailySalesTrend}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7f8a44" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#7f8a44" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ecefdf" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [inr(Number(v)), "Sales"]} />
                  <Area type="monotone" dataKey="value" stroke="#7f8a44" strokeWidth={2} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">{t.profit} by Category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.categoryWiseProfit}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ecefdf" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [inr(Number(v)), "Profit"]} />
                  <Bar dataKey="value" fill="#c85a30" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">{t.myStock} Distribution</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.inventoryDistribution} dataKey="value" nameKey="name" outerRadius={110}>
                    {analytics.inventoryDistribution.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">Top Selling</h3>
            <div className="space-y-2">
              {analytics.topSellingProducts.slice(0, 8).map((p, i) => (
                <div key={p.name} className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-xs font-bold text-brand-400">{i + 1}</span>
                    <span className="text-sm">{p.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-brand-700">{p.quantity} sold</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* STOCK ALERTS */}
      {alerts.length > 0 && (
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-terra-500" />
              <h3 className="font-semibold text-terra-600">{t.stockAlerts} ({alerts.length})</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {alerts.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-terra-50 px-3 py-2 text-sm">
                  <span>{item.name}</span>
                  <span className="font-semibold text-terra-600">{item.quantity} {t.left}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DOWNLOAD REPORTS */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-brand-700" />
            <h3 className="font-bold text-brand-900">{t.downloadReports}</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button onClick={() => download("/reports/sales.csv", "sales-report.csv")} variant="secondary">
              📊 {t.salesCsv}
            </Button>
            <Button onClick={() => download("/reports/inventory.xlsx", "inventory-report.xlsx")} variant="secondary">
              📦 {t.inventoryExcel}
            </Button>
            <Button onClick={() => download("/reports/summary.pdf", "business-summary.pdf")} variant="secondary">
              📄 {t.summaryPdf}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/overview-page.tsx
git commit -m "feat: add OverviewPage — Dashboard + Reports combined"
```

---

## Task 5: Fix suppliers — swap Outstanding for Items Supplied

**Files:**
- Modify: `apps/web/src/pages/suppliers-page.tsx`

The `Supplier` type has `outstandingPayments: number` and `productsSupplied` is not in the type. Update both.

- [ ] **Step 1: Update Supplier type and columns**

In `apps/web/src/pages/suppliers-page.tsx`:

Change the `Supplier` type from:
```ts
type Supplier = { id: string; name: string; phone?: string; email?: string; address?: string; outstandingPayments: number };
```
to:
```ts
type Supplier = { id: string; name: string; phone?: string; email?: string; address?: string; productsSupplied?: string };
```

In the `columns` array, replace:
```ts
{ key: "outstandingPayments", label: t.outstanding, render: (s: Supplier) => inr(s.outstandingPayments) },
```
with:
```ts
{ key: "productsSupplied", label: t.itemsSupplied },
```

Also update `openEdit` to populate `productsSupplied` from the supplier record. Change:
```ts
setForm({ supplierName: s.name, phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", productsSupplied: "" });
```
to:
```ts
setForm({ supplierName: s.name, phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", productsSupplied: s.productsSupplied ?? "" });
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/suppliers-page.tsx
git commit -m "fix: replace Outstanding with Items Supplied column in Suppliers"
```

---

## Task 6: Update App.tsx routes

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Add new imports and routes**

Replace `apps/web/src/App.tsx` entirely with:

```tsx
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/components/layout/app-shell";
import SalesPage from "@/pages/sales-page";
import StockPage from "@/pages/stock-page";
import InvoicesPage from "@/pages/invoices-page";
import OverviewPage from "@/pages/overview-page";
import DashboardPage from "@/pages/dashboard-page";
import LoginPage from "@/pages/login-page";
import ProductsPage from "@/pages/products-page";
import PurchasesPage from "@/pages/purchases-page";
import ExpensesPage from "@/pages/expenses-page";
import ReportsPage from "@/pages/reports-page";
import CategoriesPage from "@/pages/categories-page";
import PriceRangesPage from "@/pages/price-ranges-page";
import SuppliersPage from "@/pages/suppliers-page";
import CustomersPage from "@/pages/customers-page";
import AddStockPage from "@/pages/add-stock-page";
import { useAuthStore } from "@/store/auth";

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected><AppShell /></Protected>}>
        {/* Primary nav routes */}
        <Route path="/" element={<SalesPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        {/* Legacy routes — still work, not in nav */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/add-stock" element={<AddStockPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/price-ranges" element={<PriceRangesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat: add /stock /invoices /overview routes, keep legacy routes"
```

---

## Task 7: Update app-shell nav to 6 items

**Files:**
- Modify: `apps/web/src/components/layout/app-shell.tsx`

- [ ] **Step 1: Replace nav array and imports**

In `apps/web/src/components/layout/app-shell.tsx`:

Change the import line from:
```ts
import {
  ShoppingCart, LayoutDashboard, Box, ShoppingBag,
  Truck, Tag, Layers, FileText, Menu, LogOut, Users, PackagePlus
} from "lucide-react";
```
to:
```ts
import {
  ShoppingCart, LayoutDashboard, Box, Receipt,
  Truck, Tag, Menu, LogOut
} from "lucide-react";
```

Replace the entire `nav` array with:
```ts
  const nav = [
    { to: "/", label: t.sell, sub: "అమ్మకం", icon: ShoppingCart },
    { to: "/stock", label: t.myStock, sub: "నా సరుకు", icon: Box },
    { to: "/invoices", label: t.invoices, sub: "బిల్లులు", icon: Receipt },
    { to: "/suppliers", label: t.suppliers, sub: "సరఫరాదారులు", icon: Truck },
    { to: "/categories", label: "Categories", sub: "రకాలు", icon: Tag },
    { to: "/overview", label: t.overview, sub: "సారాంశం", icon: LayoutDashboard },
  ];
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/app-shell.tsx
git commit -m "feat: simplify nav to 6 items — Sell, My Stock, Invoices, Suppliers, Categories, Overview"
```

---

## Task 8: Final check

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no output

- [ ] **Step 2: Verify servers running**

```bash
curl -s http://localhost:5176 2>&1 | head -2 && curl -s http://localhost:4000/api/health 2>&1 | head -1
```
Expected: `<!doctype html>` and `{"message":"Unauthorized"}`

- [ ] **Step 3: Final commit**

```bash
cd /Users/c5365444/development/anufashions
git log --oneline -8
```
Verify 7 commits landed cleanly.
