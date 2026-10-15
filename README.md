# Plainbot

AI customer-support agent for Shopify and WooCommerce stores. Next.js 16 (App Router), React 19, Tailwind CSS, MySQL.

## Local setup

Requires Node 24 and a MySQL 8 database.

```bash
npm install
cp .env.example .env.local   # fill in the values
mysql -u root -p < database/schema.sql
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

`database/schema.sql` creates the base tables. `scripts/migrate.js` (`npm run db:migrate`) adds every later table and column, checks before each change, and is safe to re-run. `npm start` runs it before the server starts, so a deploy migrates the database automatically.

## Deploying on Render

A Node web service with:

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Environment: the variables in `.env.example`. `NEXT_PUBLIC_*` values are baked in at build time, so change them and redeploy.

The database is the `plainbot-db` private service (MySQL 8 with a persistent disk), reached at host `plainbot-db`, port `3306`.

Escalation alerts (every 5 minutes) and ticket SLA reminders (every 10 minutes) are scheduled inside the server by `instrumentation.ts`. They run only in production and only when `CRON_SECRET` is set, and they need an always-on instance.
