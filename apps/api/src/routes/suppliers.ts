import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { suppliers } from "../lib/schema";
import { eq, asc } from "drizzle-orm";

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
    const result = await db.select().from(suppliers).orderBy(asc(suppliers.name));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

suppliersRouter.post("/", async (req, res, next) => {
  try {
    const body = supplierSchema.parse(req.body);
    const [supplier] = await db.insert(suppliers).values({
      id: crypto.randomUUID(),
      name: body.name,
      phone: body.phone,
      address: body.address,
      email: body.email || null,
      productsSupplied: body.productsSupplied,
      outstandingPayments: String(body.outstandingPayments ?? 0),
      updatedAt: new Date()
    }).returning();
    res.status(201).json(supplier);
  } catch (error) {
    next(error);
  }
});

suppliersRouter.put("/:id", async (req, res, next) => {
  try {
    const body = supplierSchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.email === "") updateData.email = null;
    if (body.outstandingPayments !== undefined) {
      updateData.outstandingPayments = String(body.outstandingPayments);
    }
    const [supplier] = await db.update(suppliers)
      .set(updateData)
      .where(eq(suppliers.id, req.params.id))
      .returning();
    res.json(supplier);
  } catch (error) {
    next(error);
  }
});

suppliersRouter.delete("/:id", async (req, res, next) => {
  try {
    await db.delete(suppliers).where(eq(suppliers.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
