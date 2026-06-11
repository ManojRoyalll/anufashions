import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { priceRanges, products } from "../lib/schema";
import { eq, asc, and, gte, lte, isNotNull, sql } from "drizzle-orm";

export const priceRangesRouter = Router();

const schema = z.object({
  name: z.string().min(1),
  minPrice: z.number().nonnegative(),
  maxPrice: z.number().nonnegative()
});

priceRangesRouter.get("/", async (_req, res, next) => {
  try {
    const ranges = await db.select().from(priceRanges).orderBy(asc(priceRanges.minPrice));
    // Get item counts per price range
    const countRows = await db
      .select({ priceRangeId: products.priceRangeId, count: sql<number>`count(*)::int` })
      .from(products)
      .where(isNotNull(products.priceRangeId))
      .groupBy(products.priceRangeId);
    const countMap = new Map(countRows.map((c) => [c.priceRangeId, c.count]));
    res.json(
      ranges.map((r) => ({
        ...r,
        minPrice: Number(r.minPrice),
        maxPrice: Number(r.maxPrice),
        itemCount: countMap.get(r.id) ?? 0
      }))
    );
  } catch (err) { next(err); }
});

priceRangesRouter.post("/", async (req, res, next) => {
  try {
    const body = schema.parse(req.body);
    const range = await db.transaction(async (tx) => {
      const [r] = await tx.insert(priceRanges).values({
        id: crypto.randomUUID(),
        name: body.name,
        minPrice: String(body.minPrice),
        maxPrice: String(body.maxPrice),
        updatedAt: new Date()
      }).returning();
      await tx.update(products)
        .set({ priceRangeId: r.id })
        .where(
          and(
            gte(products.sellingPrice, String(body.minPrice)),
            lte(products.sellingPrice, String(body.maxPrice))
          )
        );
      return r;
    });
    res.status(201).json({ ...range, minPrice: Number(range.minPrice), maxPrice: Number(range.maxPrice) });
  } catch (err) { next(err); }
});

priceRangesRouter.put("/:id", async (req, res, next) => {
  try {
    const body = schema.parse(req.body);
    const range = await db.transaction(async (tx) => {
      const [r] = await tx.update(priceRanges)
        .set({
          name: body.name,
          minPrice: String(body.minPrice),
          maxPrice: String(body.maxPrice),
          updatedAt: new Date()
        })
        .where(eq(priceRanges.id, req.params.id))
        .returning();
      await tx.update(products)
        .set({ priceRangeId: r.id })
        .where(
          and(
            gte(products.sellingPrice, String(body.minPrice)),
            lte(products.sellingPrice, String(body.maxPrice))
          )
        );
      return r;
    });
    res.json({ ...range, minPrice: Number(range.minPrice), maxPrice: Number(range.maxPrice) });
  } catch (err) { next(err); }
});

priceRangesRouter.delete("/:id", async (req, res, next) => {
  try {
    await db.update(products).set({ priceRangeId: null }).where(eq(products.priceRangeId, req.params.id));
    await db.delete(priceRanges).where(eq(priceRanges.id, req.params.id));
    res.status(204).send();
  } catch (err) { next(err); }
});
