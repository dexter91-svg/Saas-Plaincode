# Production / go-live checklist

Use this before making the app live (e.g. plainbot.io).

---

## 1. Environment

- [ ] **.env / .env.local** (or host env) has all required vars (see `.env.example`).
- [ ] **AUTH_SECRET** is set and at least 16 characters (required in production).
- [ ] **NEXT_PUBLIC_APP_URL** is your live URL with `https://` (e.g. `https://plainbot.io`), no trailing slash.
- [ ] **Stripe**: Use live keys (`sk_live_`, `pk_live_`) and set **STRIPE_WEBHOOK_SECRET** for your production webhook URL.
- [ ] **Never commit** `.env.local` or any file containing secrets (`.env.local` should be in `.gitignore`).

---

## 2. Security

- **Auth**: Cookie is `httpOnly`, `secure` in production, `sameSite: lax`. JWT uses AUTH_SECRET.
- **Headers**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` are set (next.config + middleware).
- **HTTPS**: Middleware redirects HTTP → HTTPS in production when `x-forwarded-proto` is `http`.
- **Mock auth**: Disabled in production (middleware ignores `mock-auth` cookie when `NODE_ENV === "production"`).
- **Rate limiting**: Auth (15/min), chat (60/min), scrape (5/min), upload (10/min), Stripe checkout (10/min) per IP.
- **Sensitive routes**: `/api/db-test` disabled in production. Manual preview (`/manual-preview`) redirects to `/` in production.
- **Stripe webhook**: Signature verified with `STRIPE_WEBHOOK_SECRET`; do not skip verification.

---

## 3. Compliance & data

- **Data retention**: See `docs/DATA_RETENTION.md`. No automatic purge by default.
- **Delete my data**: Users can call `POST /api/account/delete-my-data` when logged in. Account and all related data are permanently deleted (GDPR-style right to erasure). Error message points to hello@plainbot.io.
- **Contact**: Contact page and footer use hello@plainbot.io for support and delete requests.
- **Privacy / Terms**: Link to your privacy policy and terms from signup/footer if required in your jurisdiction.

---

## 4. Database

- [ ] Run **`npm run db:migrate`** on the production DB so all tables/columns exist (including Stripe, conversation_usage, user_external_endpoints, etc.).
- [ ] **MYSQL_URL** (or DB_*) points to the production database. Use SSL if your provider requires it.

---

## 5. Stripe (Pro plan)

- [ ] **Product & Price**: Pro plan $500/month recurring created in Stripe; **STRIPE_PRICE_ID_PRO_MONTHLY** set.
- [ ] **Webhook**: In Stripe Dashboard add endpoint `https://plainbot.io/api/webhooks/stripe`, events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.paid`. Set **STRIPE_WEBHOOK_SECRET** to the signing secret.
- [ ] Test a live payment (small amount or use Stripe test mode first).

---

## 6. Email (Resend)

- [ ] **RESEND_API_KEY** and **EMAIL_FROM** (e.g. hello@plainbot.io) set.
- [ ] Domain verified in Resend if you use a custom sender.
- [ ] Inbound webhook (if used) set to `https://plainbot.io/api/webhooks/resend-inbound`.

---

## 7. Hosting

- [ ] **NODE_ENV=production** in production.
- [ ] App is served over HTTPS (host or CDN handles SSL; middleware redirects HTTP → HTTPS if needed).
- [ ] Cron for upgrade reminders (optional): if you use it, call `/api/cron/upgrade-reminders` with **CRON_SECRET** once per day.

---

## 8. Quick verification

- Visit `https://plainbot.io` → redirects to HTTPS if you came via HTTP.
- Sign up (Free) → can access dashboard after onboarding.
- Sign up (Pro) → payment page → Stripe Checkout → after payment, dashboard shows Pro and 500 conversations.
- Sign up (Custom) → dashboard shows “live in 7 days” and no payment.
- Delete my data: from account/settings (or POST to delete-my-data) → account removed, logged out.
- Manual preview and `/api/db-test` are not available in production (404 or redirect).

Once these are done, the app is in a good state for production use.
