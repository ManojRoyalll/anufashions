import { Router } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { db } from "../lib/db";
import { sales, products, expenses, categories, suppliers } from "../lib/schema";
import { eq } from "drizzle-orm";

export const reportsRouter = Router();

reportsRouter.get("/sales.csv", async (_req, res, next) => {
  try {
    const allSales = await db.select().from(sales);
    const header = "saleDate,totalAmount,revenue,cogs,grossProfit,netProfit,marginPercent\n";
    const rows = allSales
      .map(
        (s) =>
          `${new Date(s.saleDate).toISOString()},${Number(s.totalAmount)},${Number(s.revenue)},${Number(s.cogs)},${Number(s.grossProfit)},${Number(s.netProfit)},${Number(s.marginPercent)}`
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=sales-report.csv");
    res.send(header + rows);
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/inventory.xlsx", async (_req, res, next) => {
  try {
    const rows = await db
      .select({ product: products, category: categories, supplier: suppliers })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inventory");
    sheet.columns = [
      { header: "Code", key: "code", width: 15 },
      { header: "Name", key: "name", width: 30 },
      { header: "Category", key: "category", width: 20 },
      { header: "Supplier", key: "supplier", width: 20 },
      { header: "Purchase", key: "purchasePrice", width: 12 },
      { header: "Selling", key: "sellingPrice", width: 12 },
      { header: "Qty", key: "quantity", width: 8 },
      { header: "Stock Status", key: "stockStatus", width: 16 }
    ];

    rows.forEach(({ product: p, category, supplier }) => {
      sheet.addRow({
        code: p.code,
        name: p.name,
        category: category?.name ?? "-",
        supplier: supplier?.name ?? "-",
        purchasePrice: Number(p.purchasePrice),
        sellingPrice: Number(p.sellingPrice),
        quantity: p.quantity,
        stockStatus: p.stockStatus
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=inventory-report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/summary.pdf", async (_req, res, next) => {
  try {
    const [allSales, allExpenses] = await Promise.all([
      db.select().from(sales),
      db.select().from(expenses)
    ]);

    const totalRevenue = allSales.reduce((sum, s) => sum + Number(s.revenue), 0);
    const totalProfit = allSales.reduce((sum, s) => sum + Number(s.netProfit), 0);
    const totalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=business-summary.pdf");

    const doc = new PDFDocument();
    doc.pipe(res);
    doc.fontSize(18).text("Anu Fashions Business Summary", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Revenue: INR ${totalRevenue.toFixed(2)}`);
    doc.text(`Total Profit: INR ${totalProfit.toFixed(2)}`);
    doc.text(`Total Expenses: INR ${totalExpenses.toFixed(2)}`);
    doc.text(`Net Profit After Expenses: INR ${(totalProfit - totalExpenses).toFixed(2)}`);
    doc.end();
  } catch (error) {
    next(error);
  }
});
