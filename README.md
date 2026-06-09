# Anu Fashions Retail Business Platform

Production-ready, scalable retail management platform for a Sarees & Ladies Wear business.

## Stack
- Frontend: React + TypeScript + Tailwind CSS + Zustand + Recharts + shadcn-style UI
- Backend: Node.js + Express + Prisma
- Database: PostgreSQL
- Auth: JWT

## What Is Included
- Dashboard with KPI cards and chart analytics
- Inventory and product management
- Category, customer, supplier management
- Purchase management with inventory updates
- POS sales with cart, discount, GST, payment method, and inventory deduction
- Expense management
- Reports export (CSV, Excel, PDF)

## Quick Start
1. `cp .env.example .env`
2. `cd infra && docker compose up -d`
3. `cd .. && npm install`
4. `npm run prisma:generate -w @anufashions/api`
5. `npm run prisma:migrate -w @anufashions/api`
6. `npm run prisma:seed -w @anufashions/api`
7. `npm run dev`

Default admin:
- Email: `admin@anufashions.com`
- Password: `admin123`

## Deliverables
See docs folder:
- `docs/database-schema.md`
- `docs/er-diagram.md`
- `docs/api-design.md`
- `docs/wireframes.md`
- `docs/development-roadmap.md`
- `docs/deployment-instructions.md`
