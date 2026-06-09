import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { normalizeData } from "../utils/serializers";

export const purchasesRouter = Router();

const purchaseSchema = z.object({
  purchaseDate: z.string().datetime(),
  supplierId: z.string(),
  invoiceNo: z.string().min(1),
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
    const purchases = await prisma.purchase.findMany({
      include: {
        supplier: true,
        items: { include: { product: true } }
      },
      orderBy: { purchaseDate: "desc" }
    });

    res.json(normalizeData(purchases));
  } catch (error) {
    next(error);
  }
});

purchasesRouter.post("/", async (req, res, next) => {
  try {
    const body = purchaseSchema.parse(req.body);
    const totalAmount = body.items.reduce((acc, i) => acc + i.quantity * i.costPrice, 0);

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          purchaseDate: new Date(body.purchaseDate),
          supplierId: body.supplierId,
          invoiceNo: body.invoiceNo,
          totalAmount,
          items: {
            create: body.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              costPrice: item.costPrice,
              lineTotal: item.quantity * item.costPrice
            }))
          }
        },
        include: {
          supplier: true,
          items: { include: { product: true } }
        }
      });

      for (const item of body.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error("Product not found");

        const newQty = product.quantity + item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: newQty,
            purchasePrice: item.costPrice,
            stockStatus: newQty <= 0 ? "OUT_OF_STOCK" : newQty <= 5 ? "LOW_STOCK" : "IN_STOCK"
          }
        });
      }

      await tx.businessMetric.upsert({
        where: { id: "singleton" },
        update: { totalInvestment: { increment: totalAmount } },
        create: {
          id: "singleton",
          totalInvestment: totalAmount,
          totalProfit: 0,
          totalRevenue: 0
        }
      });

      return created;
    });

    res.status(201).json(normalizeData(purchase));
  } catch (error) {
    next(error);
  }
});
