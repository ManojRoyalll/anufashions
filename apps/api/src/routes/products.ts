import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { products, categories, suppliers, priceRanges } from "../lib/schema";
import { eq, and, gte, lte, desc, ilike, or } from "drizzle-orm";
import { calculateMargin } from "../utils/finance";

export const productsRouter = Router();

const productSchema = z.object({
  code: z.string().min(2),
  barcode: z.string().optional(),
  name: z.string().min(2),
  categoryId: z.string().min(1),
  purchasePrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  mrp: z.number().nonnegative().optional(),
  supplierId: z.string().optional(),
  priceRangeId: z.string().optional(),
  discountLimit: z.number().min(0).max(100).optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  quantity: z.number().int().nonnegative(),
  imageUrl: z.string().optional(),
  datePurchased: z.string().optional(),
  notes: z.string().optional()
});

function stockStatus(qty: number): "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" {
  if (qty <= 0) return "OUT_OF_STOCK";
  if (qty <= 5) return "LOW_STOCK";
  return "IN_STOCK";
}

productsRouter.get("/", async (req, res, next) => {
  try {
    const q = req.query.q?.toString();
    const categoryId = req.query.categoryId?.toString();
    const supplierId = req.query.supplierId?.toString();

    const conditions = [];
    if (q) {
      conditions.push(
        or(
          ilike(products.name, `%${q}%`),
          ilike(products.code, `%${q}%`),
          ilike(products.barcode, `%${q}%`)
        )
      );
    }
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (supplierId) conditions.push(eq(products.supplierId, supplierId));

    const rows = await db
      .select({
        product: products,
        category: categories,
        supplier: suppliers,
        priceRange: priceRanges
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .leftJoin(priceRanges, eq(products.priceRangeId, priceRanges.id))
      .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>, ...ReturnType<typeof eq>[]])) : undefined)
      .orderBy(desc(products.createdAt));

    const response = rows.map(({ product: p, category, supplier, priceRange }) => {
      const purchasePrice = Number(p.purchasePrice);
      const sellingPrice = Number(p.sellingPrice);
      const metrics = calculateMargin(sellingPrice, purchasePrice);
      return {
        ...p,
        purchasePrice,
        sellingPrice,
        mrp: p.mrp !== null ? Number(p.mrp) : null,
        category,
        supplier,
        priceRange,
        margin: metrics.margin,
        profitPercentage: metrics.profitPercentage
      };
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/", async (req, res, next) => {
  try {
    const body = productSchema.parse(req.body);

    // Auto-assign price range based on selling price if not explicitly set
    let priceRangeId = body.priceRangeId || null;
    if (!priceRangeId && body.sellingPrice > 0) {
      const ranges = await db
        .select()
        .from(priceRanges)
        .where(
          and(
            lte(priceRanges.minPrice, String(body.sellingPrice)),
            gte(priceRanges.maxPrice, String(body.sellingPrice))
          )
        );
      if (ranges.length > 0) priceRangeId = ranges[0].id;
    }

    const [product] = await db.insert(products).values({
      id: crypto.randomUUID(),
      code: body.code,
      name: body.name,
      categoryId: body.categoryId,
      supplierId: body.supplierId || null,
      priceRangeId,
      purchasePrice: String(body.purchasePrice),
      sellingPrice: String(body.sellingPrice),
      mrp: body.mrp !== undefined ? String(body.mrp) : null,
      color: body.color,
      size: body.size,
      material: body.material,
      quantity: body.quantity,
      imageUrl: body.imageUrl,
      discountLimit: body.discountLimit ?? null,
      barcode: body.barcode || null,
      notes: body.notes,
      datePurchased: body.datePurchased ? new Date(body.datePurchased) : null,
      stockStatus: stockStatus(body.quantity),
      updatedAt: new Date()
    }).returning();

    // Fetch with joins
    const [row] = await db
      .select({
        product: products,
        category: categories,
        supplier: suppliers,
        priceRange: priceRanges
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .leftJoin(priceRanges, eq(products.priceRangeId, priceRanges.id))
      .where(eq(products.id, product.id));

    res.status(201).json({
      ...row.product,
      purchasePrice: Number(row.product.purchasePrice),
      sellingPrice: Number(row.product.sellingPrice),
      mrp: row.product.mrp !== null ? Number(row.product.mrp) : null,
      category: row.category,
      supplier: row.supplier,
      priceRange: row.priceRange
    });
  } catch (error) {
    next(error);
  }
});

productsRouter.put("/:id", async (req, res, next) => {
  try {
    const body = productSchema.partial().parse(req.body);
    const status = body.quantity !== undefined ? stockStatus(body.quantity) : undefined;

    // Auto-assign price range when selling price changes and no explicit range given
    let priceRangeId: string | null | undefined =
      body.priceRangeId !== undefined ? body.priceRangeId || null : undefined;
    if (body.sellingPrice !== undefined && body.priceRangeId === undefined) {
      const ranges = await db
        .select()
        .from(priceRanges)
        .where(
          and(
            lte(priceRanges.minPrice, String(body.sellingPrice)),
            gte(priceRanges.maxPrice, String(body.sellingPrice))
          )
        );
      priceRangeId = ranges.length > 0 ? ranges[0].id : null;
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };
    if (body.code !== undefined) updateData.code = body.code;
    if (body.barcode !== undefined) updateData.barcode = body.barcode || null;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.supplierId !== undefined) updateData.supplierId = body.supplierId || null;
    if (priceRangeId !== undefined) updateData.priceRangeId = priceRangeId;
    if (body.purchasePrice !== undefined) updateData.purchasePrice = String(body.purchasePrice);
    if (body.sellingPrice !== undefined) updateData.sellingPrice = String(body.sellingPrice);
    if (body.mrp !== undefined) updateData.mrp = body.mrp !== null ? String(body.mrp) : null;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.size !== undefined) updateData.size = body.size;
    if (body.material !== undefined) updateData.material = body.material;
    if (body.quantity !== undefined) updateData.quantity = body.quantity;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.discountLimit !== undefined) updateData.discountLimit = body.discountLimit;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.datePurchased !== undefined) updateData.datePurchased = body.datePurchased ? new Date(body.datePurchased) : null;
    if (status !== undefined) updateData.stockStatus = status;

    await db.update(products).set(updateData).where(eq(products.id, req.params.id));

    const [row] = await db
      .select({
        product: products,
        category: categories,
        supplier: suppliers,
        priceRange: priceRanges
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .leftJoin(priceRanges, eq(products.priceRangeId, priceRanges.id))
      .where(eq(products.id, req.params.id));

    res.json({
      ...row.product,
      purchasePrice: Number(row.product.purchasePrice),
      sellingPrice: Number(row.product.sellingPrice),
      mrp: row.product.mrp !== null ? Number(row.product.mrp) : null,
      category: row.category,
      supplier: row.supplier,
      priceRange: row.priceRange
    });
  } catch (error) {
    next(error);
  }
});

productsRouter.delete("/:id", async (req, res, next) => {
  try {
    await db.delete(products).where(eq(products.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Re-assign all products to their correct price range based on current selling price
productsRouter.post("/reassign-price-ranges", async (_req, res, next) => {
  try {
    const [allProducts, ranges] = await Promise.all([
      db.select({ id: products.id, sellingPrice: products.sellingPrice }).from(products),
      db.select().from(priceRanges)
    ]);
    let updated = 0;
    for (const product of allProducts) {
      const sell = Number(product.sellingPrice);
      const match = ranges.find((r) => Number(r.minPrice) <= sell && Number(r.maxPrice) >= sell);
      await db.update(products)
        .set({ priceRangeId: match ? match.id : null })
        .where(eq(products.id, product.id));
      updated++;
    }
    res.json({ updated });
  } catch (error) {
    next(error);
  }
});
