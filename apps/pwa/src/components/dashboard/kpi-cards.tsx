"use client";

import { useTranslation } from "react-i18next";
import type { DashboardCards } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { inr } from "@/lib/utils";

export function KPICards({ data }: { data: DashboardCards }) {
  const { t } = useTranslation();

  const cards = [
    { k: "todaySales", v: inr(data.todaysSales) },
    { k: "todayProfit", v: inr(data.todaysProfit) },
    { k: "todayExpenses", v: inr(data.todaysExpenses) },
    { k: "todayOrders", v: data.todaysOrders },
    { k: "totalInvestment", v: inr(data.totalInvestment) },
    { k: "totalRevenue", v: inr(data.totalRevenue) },
    { k: "totalProfit", v: inr(data.totalProfit) },
    { k: "netProfit", v: inr(data.netProfit) },
    { k: "inventoryValue", v: inr(data.inventoryValue) },
    { k: "remainingStock", v: data.remainingStock },
    { k: "lowStockCount", v: data.lowStockCount },
    { k: "outOfStockCount", v: data.outOfStockCount }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.k}>
          <CardContent>
            <p className="text-sm text-slate-500">{t(card.k)}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{card.v}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
