# Development Roadmap

## Phase 1 (Completed in this scaffold)
- Monorepo setup with React + Node + PostgreSQL
- JWT authentication
- Categories, products, suppliers, customers CRUD
- Purchases with automatic inventory increase
- POS sales with automatic inventory reduction
- Expense tracking
- Dashboard KPIs and analytics charts
- CSV/Excel/PDF report exports
- Seed data and Dockerized PostgreSQL

## Phase 2
- Advanced filters and global search indexing
- Notification center (low stock, out of stock, high-selling)
- Full report center with date-range custom exports
- Enhanced role-based access (cashier/manager/accounts)
- Audit logs

## Phase 3 (Ecommerce Expansion Ready)
- Public product catalog API
- Customer app and online checkout
- WhatsApp order capture
- Payment gateway and delivery tracking
- Loyalty and coupons
- Multi-branch inventory sync
- Vendor marketplace module

## Scalability Architecture Path
- Split API into domains (inventory, sales, analytics)
- Add Redis caching and job queue for report generation
- Event-driven inventory sync
- Introduce API gateway for ecommerce channel
