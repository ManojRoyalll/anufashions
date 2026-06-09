# Anu Fashions PWA

Progressive Web App for Sarees and Ladies Wear retail management.

## Tech Stack
- Next.js App Router + TypeScript + Tailwind
- NextAuth (credentials)
- PostgreSQL + Prisma
- Zustand
- Recharts
- i18next (English + Telugu)
- PWA via next-pwa

## Run Local
1. Copy `.env.example` to `.env`
2. Ensure PostgreSQL is running
3. Run:
   - `npm run prisma:generate`
   - `npm run prisma:migrate -- --name init_pwa`
   - `npm run prisma:seed`
   - `npm run dev`

Default login:
- owner@anufashions.com
- admin123

## Key Features Included
- Mobile-first dashboard with KPI cards and quick actions
- Sidebar modules for inventory, sales, purchases, expenses, customers, suppliers, reports, analytics, settings
- Dashboard API with break-even progress and trend charts
- Category and product APIs with validation
- PWA manifest and offline page scaffold
- Bilingual labels (English/Telugu) with language switch

## Documentation
See `docs/pwa/` for full deliverables.
