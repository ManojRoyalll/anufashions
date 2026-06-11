import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { normalizeData } from "../utils/serializers";

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
    // Items cost from individual item prices
    const itemsCost = body.items.reduce((acc, i) => acc + i.quantity * i.costPrice, 0);
    // Transport cost to be distributed
    const transportCost = body.transportCost ?? 0;
    // Invoice bill amount (what was actually paid on the invoice — may include GST)
    const invoiceBillAmount = body.invoiceBillAmount ?? null;
    // True total investment = invoice bill + transport (if invoice provided), else items cost + transport
    const actualInvestment = (invoiceBillAmount ?? itemsCost) + transportCost;
    // totalAmount stored = actual investment (true cost to business)
    const totalAmount = actualInvestment;

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          purchaseDate: new Date(body.purchaseDate),
          supplierId: body.supplierId,
          invoiceNo: body.invoiceNo,
          totalAmount,
          invoiceBillAmount: invoiceBillAmount ?? null,
          transportCost,
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

      // Update total investment with ACTUAL money spent (invoice + transport)
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

purchasesRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.purchaseItem.deleteMany({ where: { purchaseId: req.params.id } });
    await prisma.purchase.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
