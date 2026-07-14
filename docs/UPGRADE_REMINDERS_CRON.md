# Upgrade reminder emails (24h follow-up)

When a user hits their conversation limit (free: 100/month, pro: 500/month), they get:

1. **Immediately**: One "limit reached" email (free: upgrade to Pro; pro: renew your plan).
2. **Every 24 hours**: A follow-up reminder until they upgrade or renew.

Reminders stop once the user upgrades (or renews) via the dashboard or when the next month starts (new period).

## Cron endpoint

Call this endpoint **once per day** (e.g. morning) so users who hit the limit get at most one reminder per 24h:

- **URL**: `GET /api/cron/upgrade-reminders`
- **Auth**: Set `CRON_SECRET` in the environment, then call with:
  - Header: `Authorization: Bearer <CRON_SECRET>`, or
  - Query: `?secret=<CRON_SECRET>`

Example (Vercel Cron in `vercel.json`):

```json
{
  "crons": [
    {
      "url": "https://your-app.vercel.app/api/cron/upgrade-reminders",
      "schedule": "0 9 * * *"
    }
  }
}
```

Vercel will send the request; to pass the secret you can set it as an env var and use a rewrite or call the URL with `?secret=...` (prefer header in production).

If `CRON_SECRET` is not set, the route accepts unauthenticated requests (useful for local testing).
