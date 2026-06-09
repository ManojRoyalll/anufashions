import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { normalizeData } from "../utils/serializers";

export const suppliersRouter = Router();

const supplierSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  productsSupplied: z.string().optional(),
  outstandingPayments: z.number().nonnegative().optional()
});

suppliersRouter.get("/", async (_req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
    res.json(normalizeData(suppliers));
  } catch (error) {
    next(error);
  }
});

suppliersRouter.post("/", async (req, res, next) => {
  try {
    const body = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({
      data: {
        ...body,
        email: body.email || null,
        outstandingPayments: body.outstandingPayments ?? 0
      }
    });
    res.status(201).json(normalizeData(supplier));
  } catch (error) {
    next(error);
  }
});

suppliersRouter.put("/:id", async (req, res, next) => {
  try {
    const body = supplierSchema.partial().parse(req.body);
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: {
        ...body,
        email: body.email === "" ? null : body.email
      }
    });
    res.json(normalizeData(supplier));
  } catch (error) {
    next(error);
  }
});

suppliersRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
