# Testing Strategy

1. Unit Tests
- Utility functions (profit, margin, break-even)
- Zod schema validation

2. Integration Tests
- API route handlers with Prisma test DB
- Auth flows with valid/invalid credentials

3. E2E Tests
- Mobile viewport workflows: Login -> Add sale -> Dashboard update
- Language switching (English/Telugu)

4. PWA Validation
- Lighthouse PWA score checks
- Offline page and cache checks
- Installability checks on Android/iOS
