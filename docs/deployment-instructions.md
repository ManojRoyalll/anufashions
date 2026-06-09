# Deployment Instructions

## 1. Prerequisites
- Node.js 20+
- npm 10+
- Docker Desktop

## 2. Environment Setup
- Copy `.env.example` to `.env`
- Update credentials if needed

## 3. Start PostgreSQL
```bash
cd infra
docker compose up -d
```

## 4. Install Dependencies
```bash
cd ..
npm install
```

## 5. Generate Prisma Client + Migrate + Seed
```bash
npm run prisma:generate -w @anufashions/api
npm run prisma:migrate -w @anufashions/api
npm run prisma:seed -w @anufashions/api
```

## 6. Run Applications
```bash
npm run dev
```
- API: `http://localhost:4000`
- Web: `http://localhost:5173`

## 7. Production Build
```bash
npm run build
```

## 8. Suggested Production Hosting
- Web: Vercel / Azure Static Web Apps
- API: Azure App Service or Container Apps
- DB: Azure Database for PostgreSQL
- Storage (future): Azure Blob for product images
- Monitoring: Application Insights / OpenTelemetry
