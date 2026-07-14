# Stripe integration (Pro plan $500/month)

## .env / .env.local keys

Add these to your `.env.local` (and to Vercel/hosting env for production):

```env
# Stripe (required for Pro plan payment)
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID_PRO_MONTHLY=price_xxxxx
```

| Variable | Description |
|----------|-------------|
| **STRIPE_SECRET_KEY** | Server-side secret key (Dashboard → Developers → API keys). Use `sk_test_...` for test, `sk_live_...` for production. |
| **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** | Client-side publishable key (`pk_test_...` or `pk_live_...`). |
| **STRIPE_WEBHOOK_SECRET** | Webhook signing secret. Create a webhook in Dashboard → Developers → Webhooks, endpoint `https://your-domain.com/api/webhooks/stripe`, events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.paid`. Copy the "Signing secret". |
| **STRIPE_PRICE_ID_PRO_MONTHLY** | Price ID for the Pro plan ($500/month recurring). Create in Dashboard → Products → Add product "Pro Plan" → Add price $500/month recurring → copy the `price_...` ID. |

## Create the Pro price in Stripe

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products).
2. Click **Add product**.
3. Name: **Pro Plan**, description optional.
4. Under **Pricing**: choose **Recurring**, **Monthly**, **$500.00** USD.
5. Save and copy the **Price ID** (starts with `price_`). Put it in `STRIPE_PRICE_ID_PRO_MONTHLY`.

## Webhook (production)

1. Developers → Webhooks → Add endpoint.
2. URL: `https://your-domain.com/api/webhooks/stripe`
3. Events to send: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.paid`.
4. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

For **local testing**, use the Stripe CLI to forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## Flow

- **Pro signup** → User goes to `/signup/payment` → clicks "Pay with Stripe" → Stripe Checkout (subscription $500/month) → after payment, redirect to dashboard. Webhook sets user to `plan=pro`, `conversation_limit=500`.
- **Every month** Stripe charges the card automatically. We use monthly `conversation_usage`, so the user gets 500 conversations each month without any extra logic.
- **If subscription is canceled** → webhook `customer.subscription.deleted` → user is set back to `plan=free`, `conversation_limit=100`.

## Fees

Customer pays $500. Stripe fee (~3.4% + $0.30) ≈ $17.30. You receive ≈ $482.70 per month. Stripe deducts this automatically.
