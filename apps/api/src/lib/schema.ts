import { pgTable, text, decimal, integer, timestamp, pgEnum, boolean, real } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("UserRole", ["ADMIN"]);
export const statusEnum = pgEnum("Status", ["ACTIVE", "INACTIVE"]);
export const stockStatusEnum = pgEnum("StockStatus", ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]);
export const paymentMethodEnum = pgEnum("PaymentMethod", ["CASH", "UPI", "CARD"]);
export const expenseTypeEnum = pgEnum("ExpenseType", ["RENT", "ELECTRICITY", "TRANSPORT", "MARKETING", "SALARY", "PACKAGING", "MISC"]);

export const users = pgTable("User", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  role: userRoleEnum("role").default("ADMIN").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const categories = pgTable("Category", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  status: statusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const priceRanges = pgTable("PriceRange", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  minPrice: decimal("minPrice", { precision: 12, scale: 2 }).notNull(),
  maxPrice: decimal("maxPrice", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const suppliers = pgTable("Supplier", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  productsSupplied: text("productsSupplied"),
  outstandingPayments: decimal("outstandingPayments", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const customers = pgTable("Customer", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").unique(),
  address: text("address"),
  favoriteCategories: text("favoriteCategories"),
  totalSpend: decimal("totalSpend", { precision: 12, scale: 2 }).default("0").notNull(),
  lifetimeValue: decimal("lifetimeValue", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const products = pgTable("Product", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  barcode: text("barcode").unique(),
  name: text("name").notNull(),
  categoryId: text("categoryId").notNull().references(() => categories.id),
  supplierId: text("supplierId").references(() => suppliers.id),
  priceRangeId: text("priceRangeId").references(() => priceRanges.id),
  purchasePrice: decimal("purchasePrice", { precision: 12, scale: 2 }).notNull(),
  sellingPrice: decimal("sellingPrice", { precision: 12, scale: 2 }).notNull(),
  mrp: decimal("mrp", { precision: 12, scale: 2 }),
  color: text("color"),
  size: text("size"),
  material: text("material"),
  quantity: integer("quantity").default(0).notNull(),
  imageUrl: text("imageUrl"),
  datePurchased: timestamp("datePurchased"),
  stockStatus: stockStatusEnum("stockStatus").default("IN_STOCK").notNull(),
  discountLimit: real("discountLimit"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const purchases = pgTable("Purchase", {
  id: text("id").primaryKey(),
  purchaseDate: timestamp("purchaseDate").notNull(),
  supplierId: text("supplierId").notNull().references(() => suppliers.id),
  invoiceNo: text("invoiceNo").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  invoiceBillAmount: decimal("invoiceBillAmount", { precision: 12, scale: 2 }),
  transportCost: decimal("transportCost", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const purchaseItems = pgTable("PurchaseItem", {
  id: text("id").primaryKey(),
  purchaseId: text("purchaseId").notNull().references(() => purchases.id),
  productId: text("productId").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  costPrice: decimal("costPrice", { precision: 12, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const sales = pgTable("Sale", {
  id: text("id").primaryKey(),
  saleDate: timestamp("saleDate").notNull(),
  customerId: text("customerId").references(() => customers.id),
  paymentMethod: paymentMethodEnum("paymentMethod").notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0").notNull(),
  gst: decimal("gst", { precision: 12, scale: 2 }).default("0").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).notNull(),
  cogs: decimal("cogs", { precision: 12, scale: 2 }).notNull(),
  grossProfit: decimal("grossProfit", { precision: 12, scale: 2 }).notNull(),
  netProfit: decimal("netProfit", { precision: 12, scale: 2 }).notNull(),
  marginPercent: decimal("marginPercent", { precision: 7, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const saleItems = pgTable("SaleItem", {
  id: text("id").primaryKey(),
  saleId: text("saleId").notNull().references(() => sales.id),
  productId: text("productId").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  purchasePrice: decimal("purchasePrice", { precision: 12, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const expenses = pgTable("Expense", {
  id: text("id").primaryKey(),
  date: timestamp("date").notNull(),
  type: expenseTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const businessMetrics = pgTable("BusinessMetric", {
  id: text("id").primaryKey(),
  totalInvestment: decimal("totalInvestment", { precision: 12, scale: 2 }).default("0").notNull(),
  totalProfit: decimal("totalProfit", { precision: 12, scale: 2 }).default("0").notNull(),
  totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});
