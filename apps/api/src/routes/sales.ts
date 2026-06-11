import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { sales, saleItems, products, customers, businessMetrics } from "../lib/schema";
import { eq, desc, sql } from "drizzle-orm";

export const salesRouter = Router();

const saleSchema = z.object({
  saleDate: z.string().datetime(),
  customerId: z.string().optional(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD"]),
  discount: z.number().min(0).default(0),
  gst: z.number().min(0).default(0),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive()
    })
  )
});

salesRouter.get("/", async (_req, res, next) => {
  try {
    const allSales = await db.select().from(sales).orderBy(desc(sales.saleDate));
    const allItems = await db
      .select({ item: saleItems, product: products })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id));
    const allCustomers = await db.select().from(customers);

    const customerMap = new Map(allCustomers.map((c) => [c.id, c]));
    const itemsBySale = new Map<string, typeof allItems>();
    for (const row of allItems) {
      const sid = row.item.saleId;
      if (!itemsBySale.has(sid)) itemsBySale.set(sid, []);
      itemsBySale.get(sid)!.push(row);
    }

    const result = allSales.map((s) => ({
      ...s,
      totalAmount: Number(s.totalAmount),
      revenue: Number(s.revenue),
      cogs: Number(s.cogs),
      grossProfit: Number(s.grossProfit),
      netProfit: Number(s.netProfit),
      marginPercent: Number(s.marginPercent),
      discount: Number(s.discount),
      gst: Number(s.gst),
      customer: s.customerId ? (customerMap.get(s.customerId) ?? null) : null,
      items: (itemsBySale.get(s.id) ?? []).map(({ item, product }) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        purchasePrice: Number(item.purchasePrice),
        lineTotal: Number(item.lineTotal),
        product
      }))
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

salesRouter.post("/", async (req, res, next) => {
  try {
    const body = saleSchema.parse(req.body);

    const sale = await db.transaction(async (tx) => {
      let revenue = 0;
      let cogs = 0;
      const purchaseMap = new Map<string, number>();

      for (const item of body.items) {
        const productRows = await tx.select().from(products).where(eq(products.id, item.productId));
        const product = productRows[0];
        if (!product) throw new Error("Product not found");
        if (product.quantity < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);

        revenue += item.unitPrice * item.quantity;
        const purchasePrice = Number(product.purchasePrice);
        cogs += purchasePrice * item.quantity;
        purchaseMap.set(item.productId, purchasePrice);
      }

      const grossProfit = revenue - cogs;
      const netProfit = grossProfit - body.discount;
      const totalAmount = revenue - body.discount + body.gst;
      const marginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      const saleId = crypto.randomUUID();
      const [created] = await tx.insert(sales).values({
        id: saleId,
        saleDate: new Date(body.saleDate),
        customerId: body.customerId || null,
        paymentMethod: body.paymentMethod,
        discount: String(body.discount),
        gst: String(body.gst),
        totalAmount: String(totalAmount),
        revenue: String(revenue),
        cogs: String(cogs),
        grossProfit: String(grossProfit),
        netProfit: String(netProfit),
        marginPercent: String(marginPercent),
        updatedAt: new Date()
      }).returning();

      for (const item of body.items) {
        await tx.insert(saleItems).values({
          id: crypto.randomUUID(),
          saleId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          purchasePrice: String(purchaseMap.get(item.productId) ?? 0),
          lineTotal: String(item.quantity * item.unitPrice)
        });
      }

      for (const item of body.items) {
        const productRows = await tx.select().from(products).where(eq(products.id, item.productId));
        const product = productRows[0];
        if (!product) throw new Error("Product not found");

        const newQty = product.quantity - item.quantity;
        const status = newQty <= 0 ? "OUT_OF_STOCK" : newQty <= 5 ? "LOW_STOCK" : "IN_STOCK";
        await tx.update(products)
          .set({ quantity: newQty, stockStatus: status, updatedAt: new Date() })
          .where(eq(products.id, item.productId));
      }

      if (body.customerId) {
        await tx.update(customers)
          .set({
            totalSpend: sql`${customers.totalSpend} + ${String(totalAmount)}`,
            lifetimeValue: sql`${customers.lifetimeValue} + ${String(totalAmount)}`,
            updatedAt: new Date()
          })
          .where(eq(customers.id, body.customerId));
      }

      // Upsert businessMetric singleton
      const existing = await tx.select().from(businessMetrics).where(eq(businessMetrics.id, "singleton"));
      if (existing.length > 0) {
        await tx.update(businessMetrics)
          .set({
            totalRevenue: sql`${businessMetrics.totalRevenue} + ${String(revenue)}`,
            totalProfit: sql`${businessMetrics.totalProfit} + ${String(netProfit)}`,
            updatedAt: new Date()
          })
          .where(eq(businessMetrics.id, "singleton"));
      } else {
        await tx.insert(businessMetrics).values({
          id: "singleton",
          totalInvestment: "0",
          totalRevenue: String(revenue),
          totalProfit: String(netProfit),
          updatedAt: new Date()
        });
      }

      return created;
    });

    // Fetch full result with customer and items
    const customerRows = sale.customerId
      ? await db.select().from(customers).where(eq(customers.id, sale.customerId))
      : [];
    const itemRows = await db
      .select({ item: saleItems, product: products })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.saleId, sale.id));

    res.status(201).json({
      ...sale,
      totalAmount: Number(sale.totalAmount),
      revenue: Number(sale.revenue),
      cogs: Number(sale.cogs),
      grossProfit: Number(sale.grossProfit),
      netProfit: Number(sale.netProfit),
      marginPercent: Number(sale.marginPercent),
      discount: Number(sale.discount),
      gst: Number(sale.gst),
      customer: customerRows[0] ?? null,
      items: itemRows.map(({ item, product }) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        purchasePrice: Number(item.purchasePrice),
        lineTotal: Number(item.lineTotal),
        product
      }))
    });
  } catch (error) {
    next(error);
  }
});

salesRouter.delete("/:id", async (req, res, next) => {
  try {
    await db.delete(saleItems).where(eq(saleItems.saleId, req.params.id));
    await db.delete(sales).where(eq(sales.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
