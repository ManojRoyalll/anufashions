import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { normalizeData } from "../utils/serializers";

export const customersRouter = Router();

const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  favoriteCategories: z.string().optional()
});

customersRouter.get("/", async (_req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
    res.json(normalizeData(customers));
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/", async (req, res, next) => {
  try {
    const body = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({ data: { name: body.name!, phone: body.phone, address: body.address, favoriteCategories: body.favoriteCategories } });
    res.status(201).json(normalizeData(customer));
  } catch (error) {
    next(error);
  }
});

customersRouter.put("/:id", async (req, res, next) => {
  try {
    const body = customerSchema.partial().parse(req.body);
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: body });
    res.json(normalizeData(customer));
  } catch (error) {
    next(error);
  }
});

customersRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
