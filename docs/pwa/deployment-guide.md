# Deployment Guide (Vercel)

1. Push repository to GitHub.
2. Import `apps/pwa` into Vercel as Next.js project.
3. Add env vars:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
4. Build command: `npm run build`
5. Run Prisma migration in CI/CD or deployment hook.
6. Seed optional demo data for non-production environments.
