import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { calculateMargin } from "../utils/finance";
import { normalizeData, toNumber } from "../utils/serializers";

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

productsRouter.get("/", async (req, res, next) => {
  try {
    const q = req.query.q?.toString();
    const categoryId = req.query.categoryId?.toString();
    const supplierId = req.query.supplierId?.toString();

    const products = await prisma.product.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
                { barcode: { contains: q, mode: "insensitive" } }
              ]
            }
          : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(supplierId ? { supplierId } : {})
      },
      include: {
        category: true,
        supplier: true,
        priceRange: true
      },
      orderBy: { createdAt: "desc" }
    });

    const response = products.map((p) => {
      const purchasePrice = toNumber(p.purchasePrice);
      const sellingPrice = toNumber(p.sellingPrice);
      const metrics = calculateMargin(sellingPrice, purchasePrice);
      return {
        ...normalizeData(p),
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
      const matchingRange = await prisma.priceRange.findFirst({
        where: {
          minPrice: { lte: body.sellingPrice },
          maxPrice: { gte: body.sellingPrice }
        }
      });
      if (matchingRange) priceRangeId = matchingRange.id;
    }

    const product = await prisma.product.create({
      data: {
        code: body.code,
        name: body.name,
        categoryId: body.categoryId,
        supplierId: body.supplierId || null,
        priceRangeId,
        purchasePrice: body.purchasePrice,
        sellingPrice: body.sellingPrice,
        mrp: body.mrp ?? null,
        color: body.color,
        size: body.size,
        material: body.material,
        quantity: body.quantity,
        imageUrl: body.imageUrl,
        discountLimit: body.discountLimit ?? null,
        barcode: body.barcode || null,
        notes: body.notes,
        datePurchased: body.datePurchased ? new Date(body.datePurchased) : null,
        stockStatus: body.quantity <= 0 ? "OUT_OF_STOCK" : body.quantity <= 5 ? "LOW_STOCK" : "IN_STOCK"
      },
      include: {
        category: true,
        supplier: true,
        priceRange: true
      }
    });

    res.status(201).json(normalizeData(product));
  } catch (error) {
    next(error);
  }
});

productsRouter.put("/:id", async (req, res, next) => {
  try {
    const body = productSchema.partial().parse(req.body);
    const stockStatus =
      body.quantity !== undefined
        ? body.quantity <= 0
          ? "OUT_OF_STOCK"
          : body.quantity <= 5
            ? "LOW_STOCK"
            : "IN_STOCK"
        : undefined;

    // Auto-assign price range when selling price changes and no explicit range given
    let priceRangeId: string | null | undefined = body.priceRangeId !== undefined ? body.priceRangeId || null : undefined;
    if (body.sellingPrice !== undefined && body.priceRangeId === undefined) {
      const matchingRange = await prisma.priceRange.findFirst({
        where: {
          minPrice: { lte: body.sellingPrice },
          maxPrice: { gte: body.sellingPrice }
        }
      });
      priceRangeId = matchingRange ? matchingRange.id : null;
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...body,
        datePurchased: body.datePurchased ? new Date(body.datePurchased) : undefined,
        priceRangeId,
        discountLimit: body.discountLimit !== undefined ? body.discountLimit : undefined,
        stockStatus
      },
      include: {
        category: true,
        supplier: true,
        priceRange: true
      }
    });

    res.json(normalizeData(product));
  } catch (error) {
    next(error);
  }
});

productsRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Re-assign all products to their correct price range based on current selling price
productsRouter.post("/reassign-price-ranges", async (_req, res, next) => {
  try {
    const [products, ranges] = await Promise.all([
      prisma.product.findMany({ select: { id: true, sellingPrice: true } }),
      prisma.priceRange.findMany()
    ]);
    let updated = 0;
    for (const product of products) {
      const sell = Number(product.sellingPrice);
      const match = ranges.find((r) => Number(r.minPrice) <= sell && Number(r.maxPrice) >= sell);
      await prisma.product.update({
        where: { id: product.id },
        data: { priceRangeId: match ? match.id : null }
      });
      updated++;
    }
    res.json({ updated });
  } catch (error) {
    next(error);
  }
});
