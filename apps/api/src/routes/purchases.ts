import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { purchases, purchaseItems, products, suppliers, businessMetrics } from "../lib/schema";
import { eq, desc, sql } from "drizzle-orm";

export const purchasesRouter = Router();

const purchaseSchema = z.object({
  purchaseDate: z.string().datetime(),
  supplierId: z.string(),
  invoiceNo: z.string().min(1),
  invoiceBillAmount: z.number().nonnegative().optional(),
  transportCost: z.number().nonnegative().default(0),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      costPrice: z.number().positive()
    })
  )
});

purchasesRouter.get("/", async (_req, res, next) => {
  try {
    const allPurchases = await db.select().from(purchases).orderBy(desc(purchases.purchaseDate));
    const allItems = await db.select({ item: purchaseItems, product: products }).from(purchaseItems)
      .leftJoin(products, eq(purchaseItems.productId, products.id));
    const allSuppliers = await db.select().from(suppliers);

    const supplierMap = new Map(allSuppliers.map((s) => [s.id, s]));
    const itemsByPurchase = new Map<string, typeof allItems>();
    for (const row of allItems) {
      const pid = row.item.purchaseId;
      if (!itemsByPurchase.has(pid)) itemsByPurchase.set(pid, []);
      itemsByPurchase.get(pid)!.push(row);
    }

    const result = allPurchases.map((p) => ({
      ...p,
      totalAmount: Number(p.totalAmount),
      invoiceBillAmount: p.invoiceBillAmount !== null ? Number(p.invoiceBillAmount) : null,
      transportCost: Number(p.transportCost),
      supplier: supplierMap.get(p.supplierId) ?? null,
      items: (itemsByPurchase.get(p.id) ?? []).map(({ item, product }) => ({
        ...item,
        costPrice: Number(item.costPrice),
        lineTotal: Number(item.lineTotal),
        product
      }))
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

purchasesRouter.post("/", async (req, res, next) => {
  try {
    const body = purchaseSchema.parse(req.body);
    const itemsCost = body.items.reduce((acc, i) => acc + i.quantity * i.costPrice, 0);
    const transportCost = body.transportCost ?? 0;
    const invoiceBillAmount = body.invoiceBillAmount ?? null;
    const actualInvestment = (invoiceBillAmount ?? itemsCost) + transportCost;
    const totalAmount = actualInvestment;

    const purchase = await db.transaction(async (tx) => {
      const purchaseId = crypto.randomUUID();
      const [created] = await tx.insert(purchases).values({
        id: purchaseId,
        purchaseDate: new Date(body.purchaseDate),
        supplierId: body.supplierId,
        invoiceNo: body.invoiceNo,
        totalAmount: String(totalAmount),
        invoiceBillAmount: invoiceBillAmount !== null ? String(invoiceBillAmount) : null,
        transportCost: String(transportCost),
        updatedAt: new Date()
      }).returning();

      for (const item of body.items) {
        await tx.insert(purchaseItems).values({
          id: crypto.randomUUID(),
          purchaseId,
          productId: item.productId,
          quantity: item.quantity,
          costPrice: String(item.costPrice),
          lineTotal: String(item.quantity * item.costPrice)
        });
      }

      for (const item of body.items) {
        const productRows = await tx.select().from(products).where(eq(products.id, item.productId));
        const product = productRows[0];
        if (!product) throw new Error("Product not found");

        const newQty = product.quantity + item.quantity;
        const status = newQty <= 0 ? "OUT_OF_STOCK" : newQty <= 5 ? "LOW_STOCK" : "IN_STOCK";
        await tx.update(products)
          .set({
            quantity: newQty,
            purchasePrice: String(item.costPrice),
            stockStatus: status,
            updatedAt: new Date()
          })
          .where(eq(products.id, item.productId));
      }

      // Upsert businessMetric singleton
      const existing = await tx.select().from(businessMetrics).where(eq(businessMetrics.id, "singleton"));
      if (existing.length > 0) {
        await tx.update(businessMetrics)
          .set({
            totalInvestment: sql`${businessMetrics.totalInvestment} + ${String(totalAmount)}`,
            updatedAt: new Date()
          })
          .where(eq(businessMetrics.id, "singleton"));
      } else {
        await tx.insert(businessMetrics).values({
          id: "singleton",
          totalInvestment: String(totalAmount),
          totalProfit: "0",
          totalRevenue: "0",
          updatedAt: new Date()
        });
      }

      return created;
    });

    // Fetch full result with supplier and items
    const supplierRows = await db.select().from(suppliers).where(eq(suppliers.id, purchase.supplierId));
    const itemRows = await db
      .select({ item: purchaseItems, product: products })
      .from(purchaseItems)
      .leftJoin(products, eq(purchaseItems.productId, products.id))
      .where(eq(purchaseItems.purchaseId, purchase.id));

    res.status(201).json({
      ...purchase,
      totalAmount: Number(purchase.totalAmount),
      invoiceBillAmount: purchase.invoiceBillAmount !== null ? Number(purchase.invoiceBillAmount) : null,
      transportCost: Number(purchase.transportCost),
      supplier: supplierRows[0] ?? null,
      items: itemRows.map(({ item, product }) => ({
        ...item,
        costPrice: Number(item.costPrice),
        lineTotal: Number(item.lineTotal),
        product
      }))
    });
  } catch (error) {
    next(error);
  }
});

purchasesRouter.delete("/:id", async (req, res, next) => {
  try {
    await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, req.params.id));
    await db.delete(purchases).where(eq(purchases.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
