# Sales Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a filterable Sales Analytics section to the Overview page with four charts (category, supplier, item, price-range wise sales), powered by a new `GET /analytics/sales` API endpoint.

**Architecture:** New route handler added to `apps/api/src/routes/analytics.ts`. New `SalesAnalytics` type in `apps/web/src/types/index.ts`. New analytics section injected into `overview-page.tsx` between the investment recovery card and the download reports section. Date filter (`month` | `year` | `all`) controls all four charts simultaneously.

**Tech Stack:** Express, Prisma, React 18, Recharts, TypeScript, Tailwind CSS

---

## File Map

| Action | File |
|---|---|
| Modify | `apps/api/src/routes/analytics.ts` — add `GET /analytics/sales` route |
| Modify | `apps/web/src/types/index.ts` — add `SalesAnalytics` interface |
| Modify | `apps/web/src/pages/overview-page.tsx` — add analytics section with filter + 4 charts |

---

## Task 1: Backend — `GET /analytics/sales` endpoint

**Files:**
- Modify: `apps/api/src/routes/analytics.ts`

- [ ] **Step 1: Add the `/sales` route to `apps/api/src/routes/analytics.ts`**

Append the following to the end of `apps/api/src/routes/analytics.ts` (after the existing `/overview` route, before the closing of the file):

```ts
analyticsRouter.get("/sales", async (req, res, next) => {
  try {
    const period = (req.query.period as string) || "month";
    const now = new Date();
    let fromDate: Date | undefined;

    if (period === "month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "year") {
      fromDate = new Date(now.getFullYear(), 0, 1);
    }
    // "all" — no fromDate filter

    const sales = await prisma.sale.findMany({
      where: fromDate ? { saleDate: { gte: fromDate } } : undefined,
      include: {
        items: {
          include: {
            product: {
              include: { category: true, supplier: true, priceRange: true }
            }
          }
        }
      },
      orderBy: { saleDate: "asc" }
    });

    // Category-wise
    const categoryMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
    // Supplier-wise
    const supplierMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
    // Item-wise
    const itemMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
    // Price-range-wise
    const priceRangeMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
    // Monthly trend
    const monthlyMap = new Map<string, { revenue: number; count: number }>();

    for (const sale of sales) {
      const mk = monthKey(new Date(sale.saleDate));
      const existing = monthlyMap.get(mk) || { revenue: 0, count: 0 };
      monthlyMap.set(mk, { revenue: existing.revenue + toNumber(sale.totalAmount), count: existing.count + 1 });

      for (const item of sale.items) {
        const revenue = toNumber(item.lineTotal);
        const profit = revenue - toNumber(item.purchasePrice) * item.quantity;
        const qty = item.quantity;

        // Category
        const catName = item.product.category.name;
        const cat = categoryMap.get(catName) || { revenue: 0, quantity: 0, profit: 0 };
        categoryMap.set(catName, { revenue: cat.revenue + revenue, quantity: cat.quantity + qty, profit: cat.profit + profit });

        // Supplier
        const supName = item.product.supplier?.name;
        if (supName) {
          const sup = supplierMap.get(supName) || { revenue: 0, quantity: 0, profit: 0 };
          supplierMap.set(supName, { revenue: sup.revenue + revenue, quantity: sup.quantity + qty, profit: sup.profit + profit });
        }

        // Item
        const itemName = item.product.name;
        const itm = itemMap.get(itemName) || { revenue: 0, quantity: 0, profit: 0 };
        itemMap.set(itemName, { revenue: itm.revenue + revenue, quantity: itm.quantity + qty, profit: itm.profit + profit });

        // Price range
        const rangeName = item.product.priceRange?.name || "Unclassified";
        const rng = priceRangeMap.get(rangeName) || { revenue: 0, quantity: 0, profit: 0 };
        priceRangeMap.set(rangeName, { revenue: rng.revenue + revenue, quantity: rng.quantity + qty, profit: rng.profit + profit });
      }
    }

    const toArray = (map: Map<string, { revenue: number; quantity: number; profit: number }>) =>
      [...map.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue);

    res.json({
      categoryWise: toArray(categoryMap),
      supplierWise: toArray(supplierMap),
      topItems: toArray(itemMap).slice(0, 15),
      priceRangeWise: toArray(priceRangeMap),
      monthlySalesTrend: [...monthlyMap.entries()]
        .map(([month, v]) => ({ month, ...v }))
        .sort((a, b) => a.month.localeCompare(b.month))
    });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 2: Build the API to check for TypeScript errors**

```bash
cd /Users/c5365444/development/anufashions/apps/api && npm run build 2>&1 | tail -10
```
Expected: exits cleanly (no TypeScript errors)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/analytics.ts
git commit -m "feat: add GET /analytics/sales endpoint with period filter"
```

---

## Task 2: Add `SalesAnalytics` type

**Files:**
- Modify: `apps/web/src/types/index.ts`

- [ ] **Step 1: Add the type to the end of `apps/web/src/types/index.ts`**

```ts
export interface SalesAnalyticsItem {
  name: string;
  revenue: number;
  quantity: number;
  profit: number;
}

export interface SalesAnalytics {
  categoryWise: SalesAnalyticsItem[];
  supplierWise: SalesAnalyticsItem[];
  topItems: SalesAnalyticsItem[];
  priceRangeWise: SalesAnalyticsItem[];
  monthlySalesTrend: { month: string; revenue: number; count: number }[];
}
```

- [ ] **Step 2: TypeScript check on web**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/types/index.ts
git commit -m "feat: add SalesAnalytics TypeScript types"
```

---

## Task 3: Frontend — Analytics section in Overview page

**Files:**
- Modify: `apps/web/src/pages/overview-page.tsx`

This is the largest change. Replace the entire file with the version below. Key additions:
1. `salesAnalytics` state + `period` state + `loadSalesAnalytics` function
2. Date filter pill buttons
3. Four chart cards inserted between investment recovery and download reports

- [ ] **Step 1: Replace `apps/web/src/pages/overview-page.tsx`**

```tsx
import { useEffect, useState } from "react";
import {
  AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { AlertTriangle, Download } from "lucide-react";
import api from "@/lib/api";
import { inr, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { useLang } from "@/hooks/use-lang";
import type { DashboardPayload, AnalyticsPayload, SalesAnalytics } from "@/types";

const PIE_COLORS = ["#7f8a44", "#c85a30", "#8ca86a", "#b16f50", "#5e7a7a", "#a48b55"];

type Period = "month" | "year" | "all";

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      No sales data for this period
    </div>
  );
}

export default function OverviewPage() {
  const { t } = useLang();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [period, setPeriod] = useState<Period>("month");

  useEffect(() => {
    Promise.all([api.get("/dashboard"), api.get("/analytics/overview")]).then(([d, a]) => {
      setDashboard(d.data);
      setAnalytics(a.data);
    });
    loadSalesAnalytics("month");
  }, []);

  const loadSalesAnalytics = (p: Period) => {
    api.get("/analytics/sales", { params: { period: p } }).then((r) => setSalesAnalytics(r.data));
  };

  const changePeriod = (p: Period) => {
    setPeriod(p);
    setSalesAnalytics(null);
    loadSalesAnalytics(p);
  };

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

  const periodLabels: Record<Period, string> = {
    month: t.thisMonth,
    year: "This Year",
    all: "All Time"
  };

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

      {/* EXISTING CHARTS */}
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

      {/* ── SALES ANALYTICS SECTION ── */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-brand-900">Sales Analytics</h2>
              <p className="text-xs text-slate-500">అమ్మకాల విశ్లేషణ — Detailed breakdown by category, supplier, item and price range</p>
            </div>
            <div className="flex gap-1.5">
              {(["month", "year", "all"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => changePeriod(p)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                    period === p
                      ? "bg-brand-700 text-white"
                      : "bg-white border border-brand-200 text-brand-700 hover:bg-brand-50"
                  )}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>

          {!salesAnalytics ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">{t.loading}</div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">

              {/* Chart 1: Category-wise */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-brand-800">By Category / రకాల వారీగా</h3>
                <div className="h-72">
                  {salesAnalytics.categoryWise.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesAnalytics.categoryWise} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ecefdf" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(v, name) => [
                            name === "revenue" ? inr(Number(v)) : Number(v),
                            name === "revenue" ? "Revenue" : name === "quantity" ? "Qty Sold" : "Profit"
                          ]}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="revenue" fill="#7f8a44" radius={[4, 4, 0, 0]} name="revenue" />
                        <Bar dataKey="quantity" fill="#c85a30" radius={[4, 4, 0, 0]} name="quantity" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 2: Supplier-wise */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-brand-800">By Supplier / సరఫరాదారు వారీగా</h3>
                <div className="h-72">
                  {salesAnalytics.supplierWise.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesAnalytics.supplierWise} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ecefdf" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v) => [inr(Number(v)), "Revenue"]} />
                        <Bar dataKey="revenue" fill="#c85a30" radius={[4, 4, 0, 0]} name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 3: Top Items — horizontal bars */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-brand-800">Top Items Sold / అత్యధికంగా అమ్మిన వస్తువులు</h3>
                <div className="h-80">
                  {salesAnalytics.topItems.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={salesAnalytics.topItems.slice(0, 10).map((i) => ({ ...i, shortName: i.name.length > 22 ? i.name.slice(0, 22) + "…" : i.name }))}
                        layout="vertical"
                        margin={{ top: 4, right: 60, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#ecefdf" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v)} />
                        <YAxis type="category" dataKey="shortName" tick={{ fontSize: 10 }} width={140} />
                        <Tooltip
                          formatter={(v, name) => [
                            name === "quantity" ? `${v} pcs` : inr(Number(v)),
                            name === "quantity" ? "Qty" : "Revenue"
                          ]}
                        />
                        <Bar dataKey="quantity" fill="#8ca86a" radius={[0, 4, 4, 0]} name="quantity" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 4: Price Range pie */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-brand-800">By Price Range / ధర గ్రూప్ వారీగా</h3>
                <div className="h-80">
                  {salesAnalytics.priceRangeWise.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={salesAnalytics.priceRangeWise}
                          dataKey="revenue"
                          nameKey="name"
                          outerRadius={110}
                          innerRadius={50}
                          paddingAngle={2}
                        >
                          {salesAnalytics.priceRangeWise.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [inr(Number(v)), "Revenue"]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Monthly Trend — full width */}
              {salesAnalytics.monthlySalesTrend.length > 1 && (
                <div className="xl:col-span-2 space-y-2">
                  <h3 className="text-sm font-bold text-brand-800">Monthly Sales Trend / నెలవారీ అమ్మకాలు</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesAnalytics.monthlySalesTrend}>
                        <defs>
                          <linearGradient id="monthGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7f8a44" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#7f8a44" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ecefdf" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v, name) => [
                          name === "revenue" ? inr(Number(v)) : Number(v),
                          name === "revenue" ? "Revenue" : "Sales Count"
                        ]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="revenue" stroke="#7f8a44" strokeWidth={2} fill="url(#monthGrad)" name="revenue" />
                        <Bar dataKey="count" fill="#c85a30" radius={[4, 4, 0, 0]} name="count" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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

- [ ] **Step 2: TypeScript check on web**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no output (note: `Bar` is used inside `AreaChart` for the monthly trend — Recharts allows this but TypeScript may warn; if so, replace the `Bar` inside `AreaChart` with a second `Area` using `dataKey="count"` and `fill="#c85a30"`)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/overview-page.tsx
git commit -m "feat: add Sales Analytics section to Overview — 4 charts with period filter"
```

---

## Task 4: Final check

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
cd /Users/c5365444/development/anufashions/apps/api && npm run build 2>&1 | tail -5
```
Expected: no errors on either

- [ ] **Step 2: Verify git log**

```bash
git log --oneline -4
```
Expected: 3 new commits — analytics endpoint, types, overview page

- [ ] **Step 3: Verify servers running**

```bash
curl -s http://localhost:5176 2>&1 | head -2
curl -s "http://localhost:4000/api/analytics/sales?period=month" -H "Authorization: Bearer test" 2>&1 | head -3
```
Expected: Vite HTML response + either JSON data or `{"message":"Unauthorized"}` (route registered correctly)
