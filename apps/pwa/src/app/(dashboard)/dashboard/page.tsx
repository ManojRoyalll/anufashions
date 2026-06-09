"use client";

import { useEffect, useState } from "react";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard").then(async (r) => setData(await r.json()));
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <KPICards data={data.cards} />
      <QuickActions />
      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Investment Recovery Progress</span>
            <span>{data.breakEvenProgress.toFixed(1)}%</span>
          </div>
          <Progress value={data.breakEvenProgress} />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChart title="Revenue Trend" data={data.revenueTrend} />
        <AnalyticsChart title="Profit Trend" data={data.profitTrend} />
      </div>
    </div>
  );
}
