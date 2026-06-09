import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { authRouter } from "./auth";
import { analyticsRouter } from "./analytics";
import { categoriesRouter } from "./categories";
import { customersRouter } from "./customers";
import { dashboardRouter } from "./dashboard";
import { expensesRouter } from "./expenses";
import { productsRouter } from "./products";
import { purchasesRouter } from "./purchases";
import { reportsRouter } from "./reports";
import { salesRouter } from "./sales";
import { suppliersRouter } from "./suppliers";

export const router = Router();

router.use("/auth", authRouter);
router.use(authMiddleware);

router.use("/categories", categoriesRouter);
router.use("/products", productsRouter);
router.use("/suppliers", suppliersRouter);
router.use("/customers", customersRouter);
router.use("/purchases", purchasesRouter);
router.use("/sales", salesRouter);
router.use("/expenses", expensesRouter);
router.use("/dashboard", dashboardRouter);
router.use("/analytics", analyticsRouter);
router.use("/reports", reportsRouter);
