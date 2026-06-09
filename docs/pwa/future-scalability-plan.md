# Future Scalability Plan

Phase 2 architecture support:
- Multi-branch data model (`Branch`, `BranchInventory`)
- Role-based access model (`Employee`, `RolePermission`)
- Event-driven sync for online orders
- Customer app APIs (`Catalog`, `Cart`, `Order`, `Payment`)
- AI services layer for demand forecast and stock suggestions

Deployment and operations:
- Vercel + managed PostgreSQL
- Background jobs for reports and notifications
- CDN image optimization for catalog
- Observability with logs, traces, and alerts
