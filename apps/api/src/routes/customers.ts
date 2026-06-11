import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { customers } from "../lib/schema";
import { eq, asc, like, or } from "drizzle-orm";

export const customersRouter = Router();

const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  favoriteCategories: z.string().optional()
});

customersRouter.get("/", async (req, res, next) => {
  try {
    const q = req.query.q?.toString();
    const result = q
      ? await db.select().from(customers).where(
          or(
            like(customers.name, `%${q}%`),
            like(customers.phone, `%${q}%`)
          )
        ).orderBy(asc(customers.name))
      : await db.select().from(customers).orderBy(asc(customers.name));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/", async (req, res, next) => {
  try {
    const body = customerSchema.parse(req.body);
    const [customer] = await db.insert(customers).values({
      id: crypto.randomUUID(),
      name: body.name,
      phone: body.phone,
      address: body.address,
      favoriteCategories: body.favoriteCategories,
      updatedAt: new Date()
    }).returning();
    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
});

customersRouter.put("/:id", async (req, res, next) => {
  try {
    const body = customerSchema.partial().parse(req.body);
    const [customer] = await db.update(customers)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(customers.id, req.params.id))
      .returning();
    res.json(customer);
  } catch (error) {
    next(error);
  }
});

customersRouter.delete("/:id", async (req, res, next) => {
  try {
    await db.delete(customers).where(eq(customers.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
