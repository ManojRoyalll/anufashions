import { Router } from "express";
import { db } from "../lib/db";
import { products, sales, expenses, purchases, purchaseItems } from "../lib/schema";
import { calculateBreakEven } from "../utils/finance";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res, next) => {
  try {
    const [allProducts, allSales, allExpenses, allPurchases, allPurchaseItems] = await Promise.all([
      db.select().from(products),
      db.select().from(sales),
      db.select().from(expenses),
      db.select().from(purchases),
      db.select().from(purchaseItems)
    ]);

    // Build items by purchase map
    const itemsByPurchase = new Map<string, typeof allPurchaseItems>();
    for (const item of allPurchaseItems) {
      const pid = item.purchaseId;
      if (!itemsByPurchase.has(pid)) itemsByPurchase.set(pid, []);
      itemsByPurchase.get(pid)!.push(item);
    }

    // ── TRUE TOTAL INVESTMENT ──
    const totalInvestment = allPurchases.reduce((sum, p) => {
      const invoiceAmt = p.invoiceBillAmount ? Number(p.invoiceBillAmount) : null;
      const items = itemsByPurchase.get(p.id) ?? [];
      const itemsCost = items.reduce((s, i) => s + Number(i.costPrice) * i.quantity, 0);
      const transport = Number(p.transportCost);
      return sum + (invoiceAmt ?? itemsCost) + transport;
    }, 0);

    // ── CURRENT INVENTORY VALUE ──
    const totalInventoryValue = allProducts.reduce(
      (sum, p) => sum + Number(p.purchasePrice) * p.quantity, 0
    );

    // ── ESTIMATED REVENUE & PROFIT ──
    const estimatedRevenue = allProducts.reduce(
      (sum, p) => sum + Number(p.sellingPrice) * p.quantity, 0
    );
    const estimatedProfit = allProducts.reduce(
      (sum, p) => sum + (Number(p.sellingPrice) - Number(p.purchasePrice)) * p.quantity, 0
    );

    // ── ACTUAL SALES FIGURES ──
    const totalSales = allSales.length;
    const totalRevenue = allSales.reduce((sum, s) => sum + Number(s.revenue), 0);
    const totalProfit = allSales.reduce((sum, s) => sum + Number(s.netProfit), 0);
    const stockRemaining = allProducts.reduce((sum, p) => sum + p.quantity, 0);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaysSales = allSales.filter((s) => new Date(s.saleDate) >= today).length;

    const monthlyProfit = allSales
      .filter((s) => {
        const d = new Date(s.saleDate);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, s) => sum + Number(s.netProfit), 0);

    const totalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfitAfterExpenses = totalProfit - totalExpenses;

    // ── TRANSPORT COSTS TOTAL ──
    const totalTransportCost = allPurchases.reduce(
      (sum, p) => sum + Number(p.transportCost), 0
    );

    // ── INVESTMENT RECOVERY ──
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
