import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { toNumber } from "../utils/serializers";

export const priceRangesRouter = Router();

const schema = z.object({
  name: z.string().min(1),
  minPrice: z.number().nonnegative(),
  maxPrice: z.number().nonnegative()
});

priceRangesRouter.get("/", async (_req, res, next) => {
  try {
    const ranges = await prisma.priceRange.findMany({ orderBy: { minPrice: "asc" } });
    const counts = await prisma.product.groupBy({
      by: ["priceRangeId"],
      _count: { id: true }
    });
    const countMap = new Map(counts.map((c) => [c.priceRangeId, c._count.id]));
    res.json(ranges.map((r) => ({ ...r, minPrice: toNumber(r.minPrice), maxPrice: toNumber(r.maxPrice), itemCount: countMap.get(r.id) ?? 0 })));
  } catch (err) { next(err); }
});

priceRangesRouter.post("/", async (req, res, next) => {
  try {
    const body = schema.parse(req.body);
    const range = await prisma.$transaction(async (tx) => {
      const r = await tx.priceRange.create({ data: { name: body.name, minPrice: body.minPrice, maxPrice: body.maxPrice } });
      await tx.product.updateMany({ where: { sellingPrice: { gte: body.minPrice, lte: body.maxPrice } }, data: { priceRangeId: r.id } });
      return r;
    });
    res.status(201).json({ ...range, minPrice: toNumber(range.minPrice), maxPrice: toNumber(range.maxPrice) });
  } catch (err) { next(err); }
});

priceRangesRouter.put("/:id", async (req, res, next) => {
  try {
    const body = schema.parse(req.body);
    const range = await prisma.$transaction(async (tx) => {
      const r = await tx.priceRange.update({ where: { id: req.params.id }, data: { name: body.name, minPrice: body.minPrice, maxPrice: body.maxPrice } });
      await tx.product.updateMany({ where: { sellingPrice: { gte: body.minPrice, lte: body.maxPrice } }, data: { priceRangeId: r.id } });
      return r;
    });
    res.json({ ...range, minPrice: toNumber(range.minPrice), maxPrice: toNumber(range.maxPrice) });
  } catch (err) { next(err); }
});

priceRangesRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.product.updateMany({ where: { priceRangeId: req.params.id }, data: { priceRangeId: null } });
    await prisma.priceRange.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});
