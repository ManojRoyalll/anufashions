# API Design (Next.js Route Handlers)

Base: `/api`

## Auth
- `GET/POST /api/auth/[...nextauth]`

## Dashboard
- `GET /api/dashboard`

## Masters
- `GET/POST /api/categories`
- `GET/POST /api/products`

## Transaction Modules (scaffolded)
- `GET /api/sales`
- `GET /api/purchases`
- `GET /api/expenses`
- `GET /api/customers`
- `GET /api/suppliers`
- `GET /api/reports`

All mutating APIs follow Zod validation and can be extended into full CRUD.
