import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { normalizeData } from "../utils/serializers";

export const expensesRouter = Router();

const schema = z.object({
  date: z.string().datetime(),
  type: z.enum(["RENT", "ELECTRICITY", "TRANSPORT", "MARKETING", "SALARY", "PACKAGING", "MISC"]),
  amount: z.number().positive(),
  description: z.string().optional()
});

expensesRouter.get("/", async (_req, res, next) => {
  try {
    const data = await prisma.expense.findMany({ orderBy: { date: "desc" } });
    res.json(normalizeData(data));
  } catch (error) {
    next(error);
  }
});

expensesRouter.post("/", async (req, res, next) => {
  try {
    const body = schema.parse(req.body);
    const data = await prisma.expense.create({
      data: {
        date: new Date(body.date),
        type: body.type,
        amount: body.amount,
        description: body.description
      }
    });
    res.status(201).json(normalizeData(data));
  } catch (error) {
    next(error);
  }
});
