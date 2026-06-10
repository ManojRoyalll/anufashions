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

analyticsRouter.get("/sales", async (req, res, next) => {
  try {
    const period = (req.query.period as string) || "month";
    const now = new Date();
    let fromDate: Date | undefined;

    if (period === "month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "year") {
      fromDate = new Date(now.getFullYear(), 0, 1);
    }

    const sales = await prisma.sale.findMany({
      where: fromDate ? { saleDate: { gte: fromDate } } : undefined,
      include: {
        items: {
          include: {
            product: {
              include: { category: true, supplier: true, priceRange: true }
            }
          }
        }
      },
      orderBy: { saleDate: "asc" }
    });

    const categoryMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
    const supplierMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
    const itemMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
    const priceRangeMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
    const monthlyMap = new Map<string, { revenue: number; count: number }>();

    for (const sale of sales) {
      const mk = monthKey(new Date(sale.saleDate));
      const existing = monthlyMap.get(mk) || { revenue: 0, count: 0 };
      monthlyMap.set(mk, { revenue: existing.revenue + toNumber(sale.totalAmount), count: existing.count + 1 });

      for (const item of sale.items) {
        const revenue = toNumber(item.lineTotal);
        const profit = revenue - toNumber(item.purchasePrice) * item.quantity;
        const qty = item.quantity;

        const catName = item.product.category.name;
        const cat = categoryMap.get(catName) || { revenue: 0, quantity: 0, profit: 0 };
        categoryMap.set(catName, { revenue: cat.revenue + revenue, quantity: cat.quantity + qty, profit: cat.profit + profit });

        const supName = item.product.supplier?.name;
        if (supName) {
          const sup = supplierMap.get(supName) || { revenue: 0, quantity: 0, profit: 0 };
          supplierMap.set(supName, { revenue: sup.revenue + revenue, quantity: sup.quantity + qty, profit: sup.profit + profit });
        }

        const itemName = item.product.name;
        const itm = itemMap.get(itemName) || { revenue: 0, quantity: 0, profit: 0 };
        itemMap.set(itemName, { revenue: itm.revenue + revenue, quantity: itm.quantity + qty, profit: itm.profit + profit });

        const rangeName = item.product.priceRange?.name || "Unclassified";
        const rng = priceRangeMap.get(rangeName) || { revenue: 0, quantity: 0, profit: 0 };
        priceRangeMap.set(rangeName, { revenue: rng.revenue + revenue, quantity: rng.quantity + qty, profit: rng.profit + profit });
      }
    }

    const toArray = (map: Map<string, { revenue: number; quantity: number; profit: number }>) =>
      [...map.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue);

    res.json({
      categoryWise: toArray(categoryMap),
      supplierWise: toArray(supplierMap),
      topItems: toArray(itemMap).slice(0, 15),
      priceRangeWise: toArray(priceRangeMap),
      monthlySalesTrend: [...monthlyMap.entries()]
        .map(([month, v]) => ({ month, ...v }))
        .sort((a, b) => a.month.localeCompare(b.month))
    });
  } catch (error) {
    next(error);
  }
});
