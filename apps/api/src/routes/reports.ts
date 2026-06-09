import { Router } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { toNumber } from "../utils/serializers";

export const reportsRouter = Router();

reportsRouter.get("/sales.csv", async (_req, res, next) => {
  try {
    const sales = await prisma.sale.findMany();
    const header = "saleDate,totalAmount,revenue,cogs,grossProfit,netProfit,marginPercent\n";
    const rows = sales
      .map(
        (s) =>
          `${new Date(s.saleDate).toISOString()},${toNumber(s.totalAmount)},${toNumber(s.revenue)},${toNumber(s.cogs)},${toNumber(s.grossProfit)},${toNumber(s.netProfit)},${toNumber(s.marginPercent)}`
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
    const products = await prisma.product.findMany({
      include: {
        category: true,
        supplier: true
      }
    });

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

    products.forEach((p) => {
      sheet.addRow({
        code: p.code,
        name: p.name,
        category: p.category.name,
        supplier: p.supplier?.name || "-",
        purchasePrice: toNumber(p.purchasePrice),
        sellingPrice: toNumber(p.sellingPrice),
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
    const [sales, expenses] = await Promise.all([prisma.sale.findMany(), prisma.expense.findMany()]);

    const totalRevenue = sales.reduce((sum, s) => sum + toNumber(s.revenue), 0);
    const totalProfit = sales.reduce((sum, s) => sum + toNumber(s.netProfit), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0);

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
