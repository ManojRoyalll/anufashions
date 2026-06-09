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
        supplier: true
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
    const product = await prisma.product.create({
      data: {
        ...body,
        barcode: body.barcode || null,
        mrp: body.mrp ?? null,
        supplierId: body.supplierId || null,
        datePurchased: body.datePurchased ? new Date(body.datePurchased) : null,
        stockStatus: body.quantity <= 0 ? "OUT_OF_STOCK" : body.quantity <= 5 ? "LOW_STOCK" : "IN_STOCK"
      },
      include: {
        category: true,
        supplier: true
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

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...body,
        datePurchased: body.datePurchased ? new Date(body.datePurchased) : undefined,
        stockStatus
      },
      include: {
        category: true,
        supplier: true
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
