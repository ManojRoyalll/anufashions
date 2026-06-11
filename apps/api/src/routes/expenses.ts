import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { expenses } from "../lib/schema";
import { desc } from "drizzle-orm";

export const expensesRouter = Router();

const schema = z.object({
  date: z.string().datetime(),
  type: z.enum(["RENT", "ELECTRICITY", "TRANSPORT", "MARKETING", "SALARY", "PACKAGING", "MISC"]),
  amount: z.number().positive(),
  description: z.string().optional()
});

expensesRouter.get("/", async (_req, res, next) => {
  try {
    const data = await db.select().from(expenses).orderBy(desc(expenses.date));
    res.json(data.map((e) => ({ ...e, amount: Number(e.amount) })));
  } catch (error) {
    next(error);
  }
});

expensesRouter.post("/", async (req, res, next) => {
  try {
    const body = schema.parse(req.body);
    const [expense] = await db.insert(expenses).values({
      id: crypto.randomUUID(),
      date: new Date(body.date),
      type: body.type,
      amount: String(body.amount),
      description: body.description,
      updatedAt: new Date()
    }).returning();
    res.status(201).json({ ...expense, amount: Number(expense.amount) });
  } catch (error) {
    next(error);
  }
});
