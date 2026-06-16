# Authentication Flow

- NextAuth Credentials provider is used.
- User enters email/password on `/login`.
- Credentials validated against `User` in PostgreSQL using bcrypt hash.
- JWT session is issued by NextAuth.
- Dashboard route group checks session server-side and redirects unauthenticated users.
