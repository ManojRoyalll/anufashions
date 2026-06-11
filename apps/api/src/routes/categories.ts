import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const categoriesRouter = Router();

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
});

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

categoriesRouter.post("/", async (req, res, next) => {
  try {
    const body = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data: { name: body.name!, description: body.description, status: body.status } });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

categoriesRouter.put("/:id", async (req, res, next) => {
  try {
    const body = categorySchema.partial().parse(req.body);
    const category = await prisma.category.update({ where: { id: req.params.id }, data: body });
    res.json(category);
  } catch (error) {
    next(error);
  }
});

categoriesRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
