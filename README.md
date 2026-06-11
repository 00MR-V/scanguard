# ScanGuard

ScanGuard is a Next.js application for event-based barcode scanning, duplicate detection, scanner user management, reporting, and audit logging.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and set real values:

```bash
DATABASE_URL="postgresql://..."
SESSION_SECRET="long-random-secret"
APP_NAME="ScanGuard"
```

3. Run the database schema in Neon:

```bash
database/schema.sql
```

4. Seed the default event if needed:

```bash
database/seed.sql
```

5. Create the first super admin:

```bash
npm run create-super-admin
```

6. Start development:

```bash
npm run dev
```

## Deployment Checklist

- Set `DATABASE_URL` in the hosting environment.
- Set `SESSION_SECRET` to a long random value.
- Run `database/schema.sql` in Neon.
- Create the first super admin with `npm run create-super-admin`.
- Remove test pages before production deployment.
- Enable HTTPS.
- Rotate the database password if it was exposed.
- Deploy to Vercel or a preferred host.
- Run `npm run build` and fix any build errors.

## Useful Commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```
