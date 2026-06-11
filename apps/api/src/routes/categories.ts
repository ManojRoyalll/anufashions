import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { categories } from "../lib/schema";
import { eq, asc } from "drizzle-orm";

export const categoriesRouter = Router();

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
});

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    const result = await db.select().from(categories).orderBy(asc(categories.name));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

categoriesRouter.post("/", async (req, res, next) => {
  try {
    const body = categorySchema.parse(req.body);
    const [category] = await db.insert(categories).values({
      id: crypto.randomUUID(),
      name: body.name,
      description: body.description,
      status: body.status,
      updatedAt: new Date()
    }).returning();
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

categoriesRouter.put("/:id", async (req, res, next) => {
  try {
    const body = categorySchema.partial().parse(req.body);
    const [category] = await db.update(categories)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(categories.id, req.params.id))
      .returning();
    res.json(category);
  } catch (error) {
    next(error);
  }
});

categoriesRouter.delete("/:id", async (req, res, next) => {
  try {
    await db.delete(categories).where(eq(categories.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
