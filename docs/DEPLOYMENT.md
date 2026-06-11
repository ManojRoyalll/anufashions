# Deployment Guide — Anu Fashions

## Architecture
- **Frontend (React/Vite)** → Vercel
- **Backend (Express API)** → Railway or Render (free tier)
- **Database (PostgreSQL)** → Supabase

---

## Step 1: Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `anufashions` | Region: `Asia South (Mumbai)`
3. Set a strong database password — save it
4. Once created, go to **Settings → Database**
5. Copy the **Connection string (URI)** — looks like:
   `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

6. Run the migration to create all tables:
```bash
DATABASE_URL="your-supabase-connection-string" npx prisma migrate deploy
```
Run from `/apps/api/` directory.

7. Create the admin user:
```bash
DATABASE_URL="your-supabase-connection-string" npx prisma db seed
```

---

## Step 2: Backend API — Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select `ManojRoyalll/anufashions` repo
3. Set **Root Directory** to `apps/api`
4. Set **Build Command**: `npm run build`
5. Set **Start Command**: `node dist/index.js`

### Environment Variables (Railway):
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
JWT_SECRET=generate-a-strong-random-secret-here
PORT=4000
```

6. Deploy → copy the Railway URL (e.g. `https://anufashions-api.railway.app`)

---

## Step 3: Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select `ManojRoyalll/anufashions`
3. Set **Root Directory** to `apps/web`
4. **Framework**: Vite (auto-detected)
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`

### Environment Variables (Vercel):
```
VITE_API_URL=https://anufashions-api.railway.app/api
```

7. Deploy → your app is live at `https://anufashions.vercel.app`

---

## Step 4: Update Login Credentials

After deploying, change the default admin password:
- Login with: `admin@anufashions.com` / `admin123`
- Go to Supabase → SQL Editor and run:
```sql
UPDATE "User" SET "passwordHash" = 'new-bcrypt-hash' WHERE email = 'admin@anufashions.com';
```
Or add a change-password feature in the app.

---

## Notes

- The `seed.ts` only creates the admin user + category list — no sample data
- All migrations are in `apps/api/prisma/migrations/` — Supabase will apply them all
- Images are stored as base64 in the database (no separate file storage needed)
- WhatsApp bill sharing works via `wa.me` URL — no server needed
