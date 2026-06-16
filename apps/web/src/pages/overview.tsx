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

  const loadSalesAnalytics = (p: Period) => {
    api.get("/analytics/sales", { params: { period: p } }).then((r) => setSalesAnalytics(r.data));
  };

  useEffect(() => {
    Promise.all([api.get("/dashboard"), api.get("/analytics/overview")]).then(([d, a]) => {
      setDashboard(d.data);
      setAnalytics(a.data);
    });
    loadSalesAnalytics("month");
  }, []);

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
      {/* ── FINANCIAL SUMMARY ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Money In */}
        <div className="lg:col-span-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">💰 Money Spent (Investment)</p>
        </div>
        <StatCard label="Total Investment" value={inr(c.totalInvestment)} accent="brand"
          subtitle={c.totalTransportCost > 0 ? `incl. transport ${inr(c.totalTransportCost)}` : undefined} />
        <StatCard label="Inventory Value (at cost)" value={inr(c.totalInventoryValue)} accent="brand"
          subtitle="remaining stock at purchase price" />
        <StatCard label={t.stockRemaining} value={String(c.stockRemaining)} accent="slate" subtitle={t.units} />

        {/* Estimated (if all stock sold) */}
        <div className="lg:col-span-3 mt-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">📊 Estimated (if all stock sold at listed price)</p>
        </div>
        <StatCard label="Estimated Revenue" value={inr(c.estimatedRevenue)} accent="brand"
          subtitle="if all current stock sold" />
        <StatCard label="Estimated Profit" value={inr(c.estimatedProfit)} accent="brand"
          subtitle={c.totalInvestment > 0 ? `${((c.estimatedProfit / c.totalInvestment) * 100).toFixed(1)}% return on investment` : undefined} />
        <StatCard label="Estimated Margin %" value={c.totalInventoryValue > 0 ? `${((c.estimatedProfit / c.totalInventoryValue) * 100).toFixed(1)}%` : "0%"} accent="brand"
          subtitle="on current stock" />

        {/* Actual sales */}
        <div className="lg:col-span-3 mt-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">✅ Actual Sales So Far</p>
        </div>
        <StatCard label={t.totalRevenue} value={inr(c.totalRevenue)} accent="terra"
          subtitle={`from ${c.totalSales} sales`} />
        <StatCard label={t.totalProfit} value={inr(c.totalProfit)} accent="terra"
          subtitle="gross profit from sales" />
        <StatCard label={t.netProfit} value={inr(c.netProfitAfterExpenses)} accent="terra"
          subtitle="after all expenses" />
        <StatCard label={t.monthlyProfit} value={inr(c.monthlyProfit)} accent="brand" />
        <StatCard label={t.todaysSalesCount} value={String(c.todaysSales)} accent="terra" subtitle={t.transactions} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      </section>

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

      {/* ── SALES ANALYTICS ── */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-brand-900">Sales Analytics</h2>
              <p className="text-xs text-slate-500">అమ్మకాల విశ్లేషణ — by category, supplier, item and price range</p>
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

              {/* Category-wise */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-brand-800">By Category / రకాల వారీగా</h3>
                <div className="h-72">
                  {salesAnalytics.categoryWise.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesAnalytics.categoryWise} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ecefdf" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v, name) => [name === "revenue" ? inr(Number(v)) : Number(v), name === "revenue" ? "Revenue" : "Qty Sold"]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="revenue" fill="#7f8a44" radius={[4, 4, 0, 0]} name="revenue" />
                        <Bar dataKey="quantity" fill="#c85a30" radius={[4, 4, 0, 0]} name="quantity" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Supplier-wise */}
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

              {/* Top Items */}
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
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="shortName" tick={{ fontSize: 10 }} width={140} />
                        <Tooltip formatter={(v, name) => [name === "quantity" ? `${v} pcs` : inr(Number(v)), name === "quantity" ? "Qty" : "Revenue"]} />
                        <Bar dataKey="quantity" fill="#8ca86a" radius={[0, 4, 4, 0]} name="quantity" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Price Range Pie */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-brand-800">By Price Range / ధర గ్రూప్ వారీగా</h3>
                <div className="h-80">
                  {salesAnalytics.priceRangeWise.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={salesAnalytics.priceRangeWise} dataKey="revenue" nameKey="name" outerRadius={110} innerRadius={50} paddingAngle={2}>
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

              {/* Monthly Trend — full width, only if multiple months */}
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
                        <Tooltip formatter={(v, name) => [name === "revenue" ? inr(Number(v)) : Number(v), name === "revenue" ? "Revenue" : "Sales Count"]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="revenue" stroke="#7f8a44" strokeWidth={2} fill="url(#monthGrad)" name="revenue" />
                        <Area type="monotone" dataKey="count" stroke="#c85a30" strokeWidth={2} fill="none" name="count" />
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
            <Button onClick={() => download("/reports/sales.csv", "sales-report.csv")} variant="secondary">📊 {t.salesCsv}</Button>
            <Button onClick={() => download("/reports/inventory.xlsx", "inventory-report.xlsx")} variant="secondary">📦 {t.inventoryExcel}</Button>
            <Button onClick={() => download("/reports/summary.pdf", "business-summary.pdf")} variant="secondary">📄 {t.summaryPdf}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
