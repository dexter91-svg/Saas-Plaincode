# Forward to email & how replies show in chat

## What happens when a customer asks for something the AI can’t do (e.g. cancel order)

1. The AI says it can’t do that and a **form** appears (name, email, order number).
2. The customer fills it and clicks **“Send to support”**.
3. The app sends an **email** to your support address (the one you set in onboarding).
4. The customer sees: **“Wait, our team is reviewing your request. You’ll see their reply here when they respond.”**
5. When you **reply**, the customer sees that reply **inside the chat** (no need to email them separately).

---

## Two ways you can reply (support sees the same forward email)

### Option A – Reply from the Dashboard (easiest, works straight away)

1. Log in to your app.
2. Open **Dashboard** → **Forwarded conversations**.
3. Find the row for that customer.
4. Type your reply in the box and click **Add reply** (or **Send**).
5. The customer sees your reply in the chat within about 15 seconds (the chat checks for new replies automatically).

No extra setup. Use this if you’re fine replying from the app only.

---

### Option B – Reply from Gmail (so replies from your inbox show in chat)

Here you **reply in Gmail** as usual; the app still saves that reply and shows it in the customer’s chat.

**In short:**

- Your app sends the “forward” email **from** an address that Resend can receive mail for (e.g. `support@yourdomain.com`).
- When you **reply** to that email in Gmail, the reply goes back to that same address.
- Resend receives it and calls your app’s **webhook** (a special URL).
- The webhook saves the reply. The chat already checks for new replies every ~15 seconds, so the customer then sees your Gmail reply in the chat.

**What you need to do:**

1. **Resend Inbound**
   - In [Resend](https://resend.com) go to **Inbound** (or Receiving).
   - Add an email address (e.g. `support@yourdomain.com`) on a domain you’ve verified in Resend.
   - This is the address that will **receive** replies when you answer from Gmail.

2. **Send forward emails from that address**
   - In your app’s `.env.local` set:
     - `EMAIL_FROM=support@yourdomain.com`
   - Use the **same** address you set up in step 1. Then every “forward” email is sent from this address, so when you reply in Gmail, the reply goes back to Resend.

3. **Tell Resend where to send the reply (webhook URL)**
   - In Resend’s Inbound settings, set the **Webhook URL** to:
     - `https://your-domain.com/api/webhooks/resend-inbound`
   - Replace `your-domain.com` with the real domain where your app is running (e.g. `yourapp.vercel.app` or `support.yourstore.com`).
   - **Events:** Select the **`email.received`** event. That is the event Resend sends when an email is received at your inbound address (e.g. when support replies from Gmail). If you don’t select it, Resend won’t call your URL when replies arrive.
   - Resend will call this URL when someone (e.g. you from Gmail) replies to a forward email. Your app then saves that reply so it shows in the chat.

4. **If you’re testing on your own computer (localhost)**  
   See **[Using ngrok for local testing](#using-ngrok-for-local-testing)** below.

---

## Summary

| You reply…           | What you need                          | Customer sees reply in chat?      |
|----------------------|----------------------------------------|-----------------------------------|
| In the **Dashboard**  | Nothing extra                          | Yes (within ~15 seconds)          |
| From **Gmail**        | Resend Inbound + same `EMAIL_FROM` + webhook URL | Yes (within ~15 seconds)          |

So: **“Use your real app URL”** = use the actual address where your app is live (e.g. `https://yourapp.vercel.app`).  
**“For local testing you’d need something like ngrok”** = so Resend can call your `localhost` app via a public URL like `https://xyz.ngrok.io`.

If you only reply from the **Dashboard**, you can ignore the Gmail/Resend Inbound setup; replies will still show in the chat.

---

## No manual tunnel: deploy the app (recommended)

If you don’t want to run ngrok (or any tunnel) yourself, **deploy the app** so it has a real URL 24/7. Then Resend can call your webhook anytime—no manual steps.

1. **Deploy** (e.g. [Vercel](https://vercel.com) free tier):
   - Push your project to GitHub.
   - Sign up at vercel.com → New Project → Import your repo → Deploy.
   - Add env vars in Vercel (Dashboard → Project → Settings → Environment Variables): same as `.env.local` (e.g. `DB_*`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `AUTH_SECRET`, etc.).
2. After deploy you get a URL like `https://your-app.vercel.app`.
3. In **Resend** set the webhook to:  
   `https://your-app.vercel.app/api/webhooks/resend-inbound`
4. Done. Gmail replies will hit your app whenever they’re sent—no need to start ngrok or anything else.

---

## Using ngrok for local testing

Use this when your app runs on your PC (`npm run dev`) and you want Resend’s webhook to reach it.

### 1. Start your app and ngrok (one command)

From the project folder run:

```bash
npm run dev:tunnel
```

This starts both the Next.js app and ngrok in one terminal. You’ll see the ngrok URL in the output (e.g. `https://abc123.ngrok-free.app`).

**Or** use two terminals: in one run `npm run dev`, in the other run `ngrok http 3000`.

ngrok will show something like:

```
Forwarding   https://abc123xyz.ngrok-free.app -> http://localhost:3000
```

Copy the **https** URL (e.g. `https://abc123xyz.ngrok-free.app`). That’s your public URL while ngrok is running.

### 3. Set the webhook in Resend

1. Open [Resend Dashboard](https://resend.com) → **Webhooks** (or **Inbound** → your address → Webhook).
2. **Endpoint URL:**  
   `https://YOUR-NGROK-URL/api/webhooks/resend-inbound`  
   Example: `https://abc123xyz.ngrok-free.app/api/webhooks/resend-inbound`
3. Select the **email.received** (or equivalent) event so replies trigger the webhook.
4. Save.

### 4. Test

1. In your app, trigger a “forward to email” (e.g. ask to cancel order, fill the form, send).
2. In Gmail, open the forward email and **reply**.
3. Resend will call your ngrok URL → your app saves the reply → the chat will show it within ~15 seconds.

**Notes:**

- If you use `npm run dev:tunnel`, one terminal runs both the app and ngrok. Keep it open.
- The ngrok URL changes each time you restart (free plan). If it changes, update the webhook URL in Resend.
- For no manual step at all, deploy the app (e.g. Vercel) and use that URL in Resend—then the webhook is always reachable.
