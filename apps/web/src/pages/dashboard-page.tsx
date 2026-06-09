import { useEffect, useState } from "react";
import {
  AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { inr } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { useLang } from "@/hooks/use-lang";
import type { DashboardPayload, AnalyticsPayload } from "@/types";

const PIE_COLORS = ["#7f8a44", "#c85a30", "#8ca86a", "#b16f50", "#5e7a7a", "#a48b55"];

export default function DashboardPage() {
  const { t } = useLang();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    Promise.all([api.get("/dashboard"), api.get("/analytics/overview")]).then(([d, a]) => {
      setDashboard(d.data);
      setAnalytics(a.data);
    });
  }, []);

  if (!dashboard || !analytics) {
    return <p className="p-8 text-sm text-slate-500">{t.loading}</p>;
  }

  const c = dashboard.cards;
  const alerts = [...(analytics.notifications?.lowStock ?? []), ...(analytics.notifications?.outOfStock ?? [])];

  return (
    <div className="space-y-5">
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

      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-brand-800">{t.investmentRecovery}</h3>
            <span className="text-sm font-bold text-brand-700">{dashboard.investmentRecovery.progress.toFixed(1)}%</span>
          </div>
          <Progress value={dashboard.investmentRecovery.progress} />
          <p className="text-sm text-slate-500">{t.remaining + ":"} {inr(dashboard.investmentRecovery.remainingInvestment)}</p>
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
            <h3 className="mb-3 font-semibold">{t.profit}</h3>
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
            <h3 className="mb-3 font-semibold">{t.myStock}</h3>
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
            <h3 className="mb-3 font-semibold">{t.myStock} – Top</h3>
            <div className="space-y-2">
              {analytics.topSellingProducts.slice(0, 8).map((p, i) => (
                <div key={p.name} className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-xs font-bold text-brand-400">{i + 1}</span>
                    <span className="text-sm">{p.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-brand-700">{p.quantity} {t.sell}</span>
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
    </div>
  );
}
