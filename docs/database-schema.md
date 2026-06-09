# Database Schema (PostgreSQL + Prisma)

Core entities:
- users
- categories
- suppliers
- customers
- products
- purchases / purchase_items
- sales / sale_items
- expenses
- business_metrics

## Key Tables

### users
- id (PK)
- name
- email (unique)
- password_hash
- role
- created_at, updated_at

### categories
- id (PK)
- name (unique)
- description
- status
- created_at, updated_at

### suppliers
- id (PK)
- name
- phone, email, address
- products_supplied
- outstanding_payments
- created_at, updated_at

### customers
- id (PK)
- name
- phone (unique)
- address
- favorite_categories
- total_spend
- lifetime_value
- created_at, updated_at

### products
- id (PK)
- code (unique)
- barcode (unique, nullable)
- name
- category_id (FK)
- supplier_id (FK, nullable)
- purchase_price
- selling_price
- mrp
- color, size, material
- quantity
- image_url
- date_purchased
- stock_status
- notes
- created_at, updated_at

### purchases
- id (PK)
- purchase_date
- supplier_id (FK)
- invoice_no
- total_amount
- created_at, updated_at

### purchase_items
- id (PK)
- purchase_id (FK)
- product_id (FK)
- quantity
- cost_price
- line_total
- created_at

### sales
- id (PK)
- sale_date
- customer_id (FK, nullable)
- payment_method
- discount
- gst
- total_amount
- revenue
- cogs
- gross_profit
- net_profit
- margin_percent
- created_at, updated_at

### sale_items
- id (PK)
- sale_id (FK)
- product_id (FK)
- quantity
- unit_price
- purchase_price
- line_total
- created_at

### expenses
- id (PK)
- date
- type
- amount
- description
- created_at, updated_at

### business_metrics
- id (singleton PK)
- total_investment
- total_profit
- total_revenue
- updated_at

## Business Formulas

- Margin = selling_price - purchase_price
- Profit % = ((selling_price - purchase_price) / purchase_price) * 100
- Break-even remaining = total_investment - total_profit
- Investment recovery progress = (total_profit / total_investment) * 100
