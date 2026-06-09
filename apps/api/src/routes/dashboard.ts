import { Router } from "express";
import { prisma } from "../lib/prisma";
import { calculateBreakEven } from "../utils/finance";
import { toNumber } from "../utils/serializers";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res, next) => {
  try {
    const [metrics, products, sales, expenses] = await Promise.all([
      prisma.businessMetric.findUnique({ where: { id: "singleton" } }),
      prisma.product.findMany(),
      prisma.sale.findMany(),
      prisma.expense.findMany()
    ]);

    const totalInvestment = toNumber(metrics?.totalInvestment || 0);
    const totalInventoryValue = products.reduce((sum, p) => sum + toNumber(p.purchasePrice) * p.quantity, 0);
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + toNumber(s.revenue), 0);
    const totalProfit = sales.reduce((sum, s) => sum + toNumber(s.netProfit), 0);
    const stockRemaining = products.reduce((sum, p) => sum + p.quantity, 0);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaysSales = sales.filter((s) => new Date(s.saleDate) >= today).length;

    const monthlyProfit = sales
      .filter((s) => {
        const d = new Date(s.saleDate);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, s) => sum + toNumber(s.netProfit), 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0);
    const netProfitAfterExpenses = totalProfit - totalExpenses;

    const investmentRecovery = calculateBreakEven(totalInvestment, totalProfit);

    res.json({
      cards: {
        totalInvestment,
        totalInventoryValue,
        totalSales,
        totalRevenue,
        totalProfit,
        monthlyProfit,
        todaysSales,
        stockRemaining,
        netProfitAfterExpenses
      },
      investmentRecovery
    });
  } catch (error) {
    next(error);
  }
});
