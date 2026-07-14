# .env.local Analysis & Database Test

## Current .env.local Status

| Variable | Status | Notes |
|----------|--------|-------|
| `DB_HOST` | OK | localhost |
| `DB_PORT` | OK | 3306 |
| `DB_USER` | **Fix needed** | Still `your_mysql_user` → use your MySQL username (e.g. `root`) |
| `DB_PASSWORD` | OK | Set |
| `DB_NAME` | OK | ecommerce_support |
| `AUTH_SECRET` | OK | Fixed (removed leading space) |
| `NEXT_PUBLIC_APP_URL` | OK | http://localhost:3000 |

## Required Fix

In `.env.local`, change:

```
DB_USER=your_mysql_user
```

to your actual MySQL username, for example:

```
DB_USER=root
```

## Test Database Connection

### Option 1: Standalone script

```bash
node scripts/test-db.js
```

### Option 2: API (with dev server running)

1. Start dev server: `npm run dev`
2. Open: http://localhost:3000/api/db-test

## Before Testing

1. **MySQL must be running** (XAMPP, WAMP, or MySQL service)
2. **Database must exist** – run: `mysql -u root -p < database/schema.sql`
3. **DB_USER** must match your MySQL username

## Common Errors

| Error | Fix |
|-------|-----|
| `ECONNREFUSED` | MySQL not running. Start MySQL service. |
| `ER_ACCESS_DENIED_ERROR` | Wrong DB_USER or DB_PASSWORD |
| `ER_BAD_DB_ERROR` | Database doesn't exist. Run schema.sql |
