import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const n = (v: unknown) => (typeof v === "number" ? v : Number(v || 0));

export async function GET() {
  const [sales, products, expenses, purchases] = await Promise.all([
    prisma.sale.findMany({ orderBy: { saleDate: "asc" } }),
    prisma.product.findMany(),
    prisma.expense.findMany(),
    prisma.purchase.findMany()
  ]);

  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const todaySales = sales.filter((s) => new Date(s.saleDate) >= dayStart);
  const todayExpenses = expenses.filter((e) => new Date(e.date) >= dayStart);

  const cards = {
    todaysSales: todaySales.reduce((a, s) => a + n(s.revenue), 0),
    todaysProfit: todaySales.reduce((a, s) => a + n(s.netProfit), 0),
    todaysExpenses: todayExpenses.reduce((a, e) => a + n(e.amount), 0),
    todaysOrders: todaySales.length,
    totalInvestment: purchases.reduce((a, p) => a + n(p.totalAmount), 0),
    totalRevenue: sales.reduce((a, s) => a + n(s.revenue), 0),
    totalProfit: sales.reduce((a, s) => a + n(s.grossProfit), 0),
    netProfit: sales.reduce((a, s) => a + n(s.netProfit), 0) - expenses.reduce((a, e) => a + n(e.amount), 0),
    inventoryValue: products.reduce((a, p) => a + n(p.purchasePrice) * p.quantity, 0),
    remainingStock: products.reduce((a, p) => a + p.quantity, 0),
    lowStockCount: products.filter((p) => p.stockStatus === "LOW_STOCK").length,
    outOfStockCount: products.filter((p) => p.stockStatus === "OUT_OF_STOCK").length
  };

  const breakEvenProgress = cards.totalInvestment > 0 ? Math.max(0, Math.min(100, (cards.netProfit / cards.totalInvestment) * 100)) : 0;
  const revenueTrend = sales.slice(-12).map((s, i) => ({ label: `${i + 1}`, value: n(s.revenue) }));
  const profitTrend = sales.slice(-12).map((s, i) => ({ label: `${i + 1}`, value: n(s.netProfit) }));

  return NextResponse.json({ cards, breakEvenProgress, revenueTrend, profitTrend });
}
