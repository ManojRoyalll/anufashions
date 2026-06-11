import { Router } from "express";
import { prisma } from "../lib/prisma";
import { calculateBreakEven } from "../utils/finance";
import { toNumber } from "../utils/serializers";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res, next) => {
  try {
    const [products, sales, expenses, purchases] = await Promise.all([
      prisma.product.findMany(),
      prisma.sale.findMany(),
      prisma.expense.findMany(),
      prisma.purchase.findMany({ include: { items: true } })
    ]);

    // ── TRUE TOTAL INVESTMENT ──
    // Sum of all purchases: invoice bill amount (if provided) + transport cost,
    // otherwise items cost + transport cost. This is actual money spent.
    const totalInvestment = purchases.reduce((sum, p) => {
      const invoiceAmt = p.invoiceBillAmount ? toNumber(p.invoiceBillAmount) : null;
      const itemsCost = p.items.reduce((s, i) => s + toNumber(i.costPrice) * i.quantity, 0);
      const transport = toNumber(p.transportCost);
      return sum + (invoiceAmt ?? itemsCost) + transport;
    }, 0);

    // ── CURRENT INVENTORY VALUE ──
    // What remaining stock is worth at purchase price
    const totalInventoryValue = products.reduce(
      (sum, p) => sum + toNumber(p.purchasePrice) * p.quantity, 0
    );

    // ── ESTIMATED REVENUE & PROFIT ──
    // If all current stock is sold at listed selling price
    const estimatedRevenue = products.reduce(
      (sum, p) => sum + toNumber(p.sellingPrice) * p.quantity, 0
    );
    const estimatedProfit = products.reduce(
      (sum, p) => sum + (toNumber(p.sellingPrice) - toNumber(p.purchasePrice)) * p.quantity, 0
    );

    // ── ACTUAL SALES FIGURES ──
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

    // ── TRANSPORT COSTS TOTAL ──
    const totalTransportCost = purchases.reduce(
      (sum, p) => sum + toNumber(p.transportCost), 0
    );

    // ── INVESTMENT RECOVERY ──
    // Progress = how much of total investment has been recovered through actual sales revenue
    const investmentRecovery = calculateBreakEven(totalInvestment, totalRevenue);

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
        netProfitAfterExpenses,
        // New fields
        estimatedRevenue,
        estimatedProfit,
        totalTransportCost
      },
      investmentRecovery
    });
  } catch (error) {
    next(error);
  }
});
