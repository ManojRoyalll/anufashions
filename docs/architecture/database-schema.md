# PWA Database Schema

Source of truth: `apps/pwa/prisma/schema.prisma`

Core domains:
- Authentication/User
- Catalog (Categories, Products)
- Procurement (Purchases, PurchaseItems)
- Billing (Sales, SaleItems)
- Parties (Customers, Suppliers)
- Finance (Expenses)
- Settings and Metrics

Business formulas:
- Margin Amount = Selling Price - Purchase Price
- Margin % = ((Selling - Purchase) / Purchase) * 100
- Net Profit = Total Sale Net Profit - Total Expenses
- Break-even Remaining = Total Investment - Net Profit
