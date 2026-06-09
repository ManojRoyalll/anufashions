import { Router } from "express";
import { prisma } from "../lib/prisma";
import { toNumber } from "../utils/serializers";

export const analyticsRouter = Router();

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

analyticsRouter.get("/overview", async (_req, res, next) => {
  try {
    const [sales, expenses, products, categories] = await Promise.all([
      prisma.sale.findMany({
        include: {
          items: {
            include: {
              product: { include: { category: true } }
            }
          }
        }
      }),
      prisma.expense.findMany(),
      prisma.product.findMany(),
      prisma.category.findMany()
    ]);

    const dailySalesMap = new Map<string, number>();
    const monthlyRevenueMap = new Map<string, number>();
    const categorySalesMap = new Map<string, number>();
    const categoryProfitMap = new Map<string, number>();
    const topProductsMap = new Map<string, number>();

    for (const sale of sales) {
      const d = new Date(sale.saleDate);
      dailySalesMap.set(dateKey(d), (dailySalesMap.get(dateKey(d)) || 0) + toNumber(sale.totalAmount));
      monthlyRevenueMap.set(monthKey(d), (monthlyRevenueMap.get(monthKey(d)) || 0) + toNumber(sale.revenue));

      for (const item of sale.items) {
        const cat = item.product.category.name;
        categorySalesMap.set(cat, (categorySalesMap.get(cat) || 0) + toNumber(item.lineTotal));

        const profit = toNumber(item.lineTotal) - toNumber(item.purchasePrice) * item.quantity;
        categoryProfitMap.set(cat, (categoryProfitMap.get(cat) || 0) + profit);

        topProductsMap.set(item.product.name, (topProductsMap.get(item.product.name) || 0) + item.quantity);
      }
    }

    const expenseBreakdownMap = new Map<string, number>();
    for (const e of expenses) {
      expenseBreakdownMap.set(e.type, (expenseBreakdownMap.get(e.type) || 0) + toNumber(e.amount));
    }

    const inventoryDistribution = categories.map((c) => {
      const qty = products.filter((p) => p.categoryId === c.id).reduce((sum, p) => sum + p.quantity, 0);
      return { name: c.name, value: qty };
    });

    res.json({
      dailySalesTrend: [...dailySalesMap.entries()].map(([date, value]) => ({ date, value })),
      monthlyRevenueTrend: [...monthlyRevenueMap.entries()].map(([month, value]) => ({ month, value })),
      categoryWiseSales: [...categorySalesMap.entries()].map(([name, value]) => ({ name, value })),
      categoryWiseProfit: [...categoryProfitMap.entries()].map(([name, value]) => ({ name, value })),
      inventoryDistribution,
      topSellingProducts: [...topProductsMap.entries()]
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10),
      expenseBreakdown: [...expenseBreakdownMap.entries()].map(([name, value]) => ({ name, value })),
      notifications: {
        lowStock: products
          .filter((p) => p.stockStatus === "LOW_STOCK")
          .map((p) => ({ id: p.id, name: p.name, quantity: p.quantity })),
        outOfStock: products
          .filter((p) => p.stockStatus === "OUT_OF_STOCK")
          .map((p) => ({ id: p.id, name: p.name, quantity: p.quantity }))
      }
    });
  } catch (error) {
    next(error);
  }
});
