import { useEffect, useState } from "react";
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import api from "@/lib/api";
import { inr } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardPayload } from "@/types";

type CardKey = keyof DashboardPayload["cards"];

const cardOrder: Array<{ key: CardKey; label: string }> = [
  { key: "totalInvestment", label: "Total Investment" },
  { key: "totalInventoryValue", label: "Total Inventory Value" },
  { key: "totalSales", label: "Total Sales" },
  { key: "totalRevenue", label: "Total Revenue" },
  { key: "totalProfit", label: "Total Profit" },
  { key: "monthlyProfit", label: "Monthly Profit" },
  { key: "todaysSales", label: "Today's Sales" },
  { key: "stockRemaining", label: "Stock Remaining" }
];

const countKeys: CardKey[] = ["totalSales", "todaysSales", "stockRemaining"];

const pieColors = ["#7f8a44", "#c85a30", "#8ca86a", "#b16f50", "#5e7a7a", "#a48b55"];

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    Promise.all([api.get("/dashboard"), api.get("/analytics/overview")]).then(([d, a]) => {
      setDashboard(d.data);
      setAnalytics(a.data);
    });
  }, []);

  if (!dashboard || !analytics) {
    return <p className="p-8 text-sm">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cardOrder.map((item) => (
          <Card key={String(item.key)}>
            <CardContent>
              <p className="text-xs text-slate-600">{item.label}</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {countKeys.includes(item.key)
                  ? Number(dashboard.cards[item.key])
                  : inr(Number(dashboard.cards[item.key]))}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Investment Recovery Progress</h3>
            <span className="text-sm text-brand-700">{dashboard.investmentRecovery.progress.toFixed(1)}%</span>
          </div>
          <Progress value={dashboard.investmentRecovery.progress} />
          <p className="text-sm text-slate-600">Remaining Investment: {inr(dashboard.investmentRecovery.remainingInvestment)}</p>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">Daily Sales Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailySalesTrend}>
                  <defs>
                    <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7f8a44" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#7f8a44" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#7f8a44" fill="url(#sales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">Category Wise Profit</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.categoryWiseProfit}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#c85a30" radius={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">Inventory Distribution</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.inventoryDistribution} dataKey="value" nameKey="name" outerRadius={110}>
                    {analytics.inventoryDistribution.map((_: any, idx: number) => (
                      <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
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
            <h3 className="mb-3 font-semibold">Top Selling Products</h3>
            <div className="space-y-2">
              {analytics.topSellingProducts.slice(0, 6).map((product: any) => (
                <div key={product.name} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                  <span className="text-sm">{product.name}</span>
                  <span className="text-sm font-semibold text-brand-700">{product.quantity} sold</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
