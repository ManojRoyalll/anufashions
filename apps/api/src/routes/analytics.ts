import { Router } from "express";
import { db } from "../lib/db";
import { sales, saleItems, products, expenses, categories } from "../lib/schema";
import { eq, gte, asc } from "drizzle-orm";

export const analyticsRouter = Router();

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

analyticsRouter.get("/overview", async (_req, res, next) => {
  try {
    const [allSales, allExpenses, allProducts, allCategories] = await Promise.all([
      db.select().from(sales),
      db.select().from(expenses),
      db.select().from(products),
      db.select().from(categories)
    ]);

    // Fetch all sale items with product + category
    const itemRows = await db
      .select({ item: saleItems, product: products, category: categories })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id));

    const itemsBySale = new Map<string, typeof itemRows>();
    for (const row of itemRows) {
      const sid = row.item.saleId;
      if (!itemsBySale.has(sid)) itemsBySale.set(sid, []);
      itemsBySale.get(sid)!.push(row);
    }

    const dailySalesMap = new Map<string, number>();
    const monthlyRevenueMap = new Map<string, number>();
    const categorySalesMap = new Map<string, number>();
    const categoryProfitMap = new Map<string, number>();
    const topProductsMap = new Map<string, number>();

    for (const sale of allSales) {
      const d = new Date(sale.saleDate);
      dailySalesMap.set(dateKey(d), (dailySalesMap.get(dateKey(d)) || 0) + Number(sale.totalAmount));
      monthlyRevenueMap.set(monthKey(d), (monthlyRevenueMap.get(monthKey(d)) || 0) + Number(sale.revenue));

      const items = itemsBySale.get(sale.id) ?? [];
      for (const { item, product, category } of items) {
        const cat = category?.name ?? "Unknown";
        categorySalesMap.set(cat, (categorySalesMap.get(cat) || 0) + Number(item.lineTotal));

        const profit = Number(item.lineTotal) - Number(item.purchasePrice) * item.quantity;
        categoryProfitMap.set(cat, (categoryProfitMap.get(cat) || 0) + profit);

        const productName = product?.name ?? "Unknown";
        topProductsMap.set(productName, (topProductsMap.get(productName) || 0) + item.quantity);
      }
    }

    const expenseBreakdownMap = new Map<string, number>();
    for (const e of allExpenses) {
      expenseBreakdownMap.set(e.type, (expenseBreakdownMap.get(e.type) || 0) + Number(e.amount));
    }

    const inventoryDistribution = allCategories.map((c) => {
      const qty = allProducts.filter((p) => p.categoryId === c.id).reduce((sum, p) => sum + p.quantity, 0);
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
        lowStock: allProducts
          .filter((p) => p.stockStatus === "LOW_STOCK")
          .map((p) => ({ id: p.id, name: p.name, quantity: p.quantity })),
        outOfStock: allProducts
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

    const allSales = fromDate
      ? await db.select().from(sales).where(gte(sales.saleDate, fromDate)).orderBy(asc(sales.saleDate))
      : await db.select().from(sales).orderBy(asc(sales.saleDate));

    // Fetch items with product, category, supplier, priceRange
    const { suppliers, priceRanges } = await import("../lib/schema");
    const itemRows = await db
      .select({
        item: saleItems,
        product: products,
        category: categories,
        supplier: suppliers,
        priceRange: priceRanges
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .leftJoin(priceRanges, eq(products.priceRangeId, priceRanges.id));

    const saleIds = new Set(allSales.map((s) => s.id));
    const filteredItemRows = itemRows.filter((r) => saleIds.has(r.item.saleId));

    const itemsBySale = new Map<string, typeof filteredItemRows>();
    for (const row of filteredItemRows) {
      const sid = row.item.saleId;
      if (!itemsBySale.has(sid)) itemsBySale.set(sid, []);
      itemsBySale.get(sid)!.push(row);
    }

    const categoryMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
    const supplierMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
    const itemMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
    const priceRangeMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
    const monthlyMap = new Map<string, { revenue: number; count: number }>();

    for (const sale of allSales) {
      const mk = monthKey(new Date(sale.saleDate));
      const existing = monthlyMap.get(mk) || { revenue: 0, count: 0 };
      monthlyMap.set(mk, { revenue: existing.revenue + Number(sale.totalAmount), count: existing.count + 1 });

      const items = itemsBySale.get(sale.id) ?? [];
      for (const { item, product, category, supplier: sup, priceRange } of items) {
        const revenue = Number(item.lineTotal);
        const profit = revenue - Number(item.purchasePrice) * item.quantity;
        const qty = item.quantity;

        const catName = category?.name ?? "Unknown";
        const cat = categoryMap.get(catName) || { revenue: 0, quantity: 0, profit: 0 };
        categoryMap.set(catName, { revenue: cat.revenue + revenue, quantity: cat.quantity + qty, profit: cat.profit + profit });

        const supName = sup?.name;
        if (supName) {
          const s = supplierMap.get(supName) || { revenue: 0, quantity: 0, profit: 0 };
          supplierMap.set(supName, { revenue: s.revenue + revenue, quantity: s.quantity + qty, profit: s.profit + profit });
        }

        const itemName = product?.name ?? "Unknown";
        const itm = itemMap.get(itemName) || { revenue: 0, quantity: 0, profit: 0 };
        itemMap.set(itemName, { revenue: itm.revenue + revenue, quantity: itm.quantity + qty, profit: itm.profit + profit });

        const rangeName = priceRange?.name || "Unclassified";
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
