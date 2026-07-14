# Resend setup (emails + inbound webhook)

## Environment variables

Set these in your host (Hostinger, Vercel, etc.) and in `.env.local` for local dev:

- **RESEND_API_KEY** – Your Resend API key (Dashboard → API Keys).
- **EMAIL_FROM** – Sender address for all emails, e.g. `hello@plainbot.io`. Must be a verified domain in Resend.
- **NEXT_PUBLIC_APP_URL** – Full public URL of your app, e.g. `https://app.plainbot.io` or `https://your-domain.com`. Used in welcome emails and for the webhook URL below.

## Inbound webhook URL (for ticket replies by email)

When support replies by email (e.g. from Gmail), Resend sends the event to your app so the reply appears in the chat and can be emailed to the customer.

**In Resend Dashboard:** go to **Inbound** → add your domain/address → set **Webhook URL** to:

```
https://YOUR_DOMAIN/api/webhooks/resend-inbound
```

Replace `YOUR_DOMAIN` with your actual app URL (same as **NEXT_PUBLIC_APP_URL** without the protocol if needed, or the full URL).

**Examples:**

- If `NEXT_PUBLIC_APP_URL=https://app.plainbot.io`, use:
  ```
  https://app.plainbot.io/api/webhooks/resend-inbound
  ```
- If you deploy on Hostinger at `https://plainbot.io`, use:
  ```
  https://plainbot.io/api/webhooks/resend-inbound
  ```

Forwarded conversation emails must be sent **from** the inbound address you configure in Resend so replies are received and sent to this webhook.

## What uses Resend

- **Welcome email (Free)** – Sent when a user signs up on the Free plan.
- **Pro welcome email** – Sent when a Pro user completes the payment step (Calendly link to schedule a call).
- **Forward to support** – When a conversation is forwarded, the summary is emailed to the store’s forward address.
- **Reply to customer** – When support replies via email, the reply is sent to the customer and shown in the chat (via the inbound webhook above).

---

## Hostinger deployment

For Hostinger (or any host that expects an `index.html` at the root), the repo includes **`public/index.html`**. It redirects to `/` so the Next.js app loads. Deploy the full Next.js build (e.g. `npm run build && npm start` or the host’s Node setup). If the host only supports static files, you’ll need a Node-compatible plan or a different host for API routes and auth.
