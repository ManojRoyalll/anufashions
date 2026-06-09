import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { normalizeData, toNumber } from "../utils/serializers";

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
    const sales = await prisma.sale.findMany({
      include: {
        customer: true,
        items: { include: { product: true } }
      },
      orderBy: { saleDate: "desc" }
    });
    res.json(normalizeData(sales));
  } catch (error) {
    next(error);
  }
});

salesRouter.post("/", async (req, res, next) => {
  try {
    const body = saleSchema.parse(req.body);

    const sale = await prisma.$transaction(async (tx) => {
      let revenue = 0;
      let cogs = 0;
      const purchaseMap = new Map<string, number>();

      for (const item of body.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error("Product not found");
        if (product.quantity < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);

        revenue += item.unitPrice * item.quantity;
        const purchasePrice = toNumber(product.purchasePrice);
        cogs += purchasePrice * item.quantity;
        purchaseMap.set(item.productId, purchasePrice);
      }

      const grossProfit = revenue - cogs;
      const netProfit = grossProfit - body.discount;
      const totalAmount = revenue - body.discount + body.gst;
      const marginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      const created = await tx.sale.create({
        data: {
          saleDate: new Date(body.saleDate),
          customerId: body.customerId || null,
          paymentMethod: body.paymentMethod,
          discount: body.discount,
          gst: body.gst,
          totalAmount,
          revenue,
          cogs,
          grossProfit,
          netProfit,
          marginPercent,
          items: {
            create: body.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              purchasePrice: purchaseMap.get(item.productId) || 0,
              lineTotal: item.quantity * item.unitPrice
            }))
          }
        },
        include: {
          customer: true,
          items: { include: { product: true } }
        }
      });

      for (const item of body.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error("Product not found");

        const newQty = product.quantity - item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: newQty,
            stockStatus: newQty <= 0 ? "OUT_OF_STOCK" : newQty <= 5 ? "LOW_STOCK" : "IN_STOCK"
          }
        });
      }

      if (body.customerId) {
        await tx.customer.update({
          where: { id: body.customerId },
          data: {
            totalSpend: { increment: totalAmount },
            lifetimeValue: { increment: totalAmount }
          }
        });
      }

      await tx.businessMetric.upsert({
        where: { id: "singleton" },
        update: {
          totalRevenue: { increment: revenue },
          totalProfit: { increment: netProfit }
        },
        create: {
          id: "singleton",
          totalInvestment: 0,
          totalRevenue: revenue,
          totalProfit: netProfit
        }
      });

      return created;
    });

    res.status(201).json(normalizeData(sale));
  } catch (error) {
    next(error);
  }
});
