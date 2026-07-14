# Deploy with Hostinger Web Hosting + Vercel

Your Hostinger plan is **Web Hosting** (no Node.js). So you run the app on **Vercel** and use Hostinger only for your **domain** (plainbot.io).

---

## Step 1: Put your code on GitHub

1. Create a repo on [github.com](https://github.com) (e.g. `plainbot`).
2. In your project folder, run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
   (Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name.)

---

## Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use GitHub).
2. Click **Add New** → **Project**.
3. Import your GitHub repo. Click **Import**.
4. **Do not** click Deploy yet. First add environment variables (Step 3).

---

## Step 3: Add environment variables on Vercel

1. In the same Vercel project screen, open **Environment Variables**.
2. Add **every variable** from your `.env.local` (copy name and value):

   - `MYSQL_URL`
   - `AUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL` → set to **`https://plainbot.io`**
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID_PRO_MONTHLY`
   - (Optional: `PINECONE_*`, `CRON_SECRET`)

3. For each variable, leave **Environment** as **Production** (and Preview if you want).
4. Click **Deploy**.

Your app will be live at something like `https://your-project.vercel.app`.

---

## Step 4: Use your domain (plainbot.io) on Vercel

1. In Vercel, open your project → **Settings** → **Domains**.
2. Add **plainbot.io** (and optionally **www.plainbot.io**).
3. Vercel will show you which DNS records to add (e.g. **A** record or **CNAME**). Keep this tab open.

---

## Step 5: Point Hostinger domain to Vercel

1. Log in to **Hostinger hPanel**.
2. Go to **Websites** → select **plainbot.io** → **Manage**.
3. Open **DNS / DNS Zone** (or **Domain** → **DNS Zone**).
4. Add the records Vercel showed you, for example:
   - **A** record: name `@`, value = Vercel’s IP (e.g. `76.76.21.21`), or  
   - **CNAME** record: name `@` or `www`, value = `cname.vercel-dns.com`  
   (Use the **exact** values Vercel gives you.)
5. Remove or change any old **A** record that pointed to Hostinger’s IP (so the domain goes to Vercel, not Hostinger).
6. Save. DNS can take 5–60 minutes to update.

---

## Step 6: Wait for SSL and test

1. In Vercel → **Domains**, wait until **plainbot.io** shows a green check (SSL ready).
2. Open **https://plainbot.io** in the browser. You should see your app.
3. In Stripe Dashboard, set your webhook URL to **`https://plainbot.io/api/webhooks/stripe`** and use the signing secret in Vercel as `STRIPE_WEBHOOK_SECRET` if you didn’t already.

---

## Step 7: Hostinger Web Hosting – what it’s for now

- **Domain**: DNS is managed in Hostinger (Step 5); the domain now points to Vercel.
- **Email**: You can keep using Hostinger email (e.g. hello@plainbot.io) in your app and Resend; no change needed.
- You do **not** upload your Next.js code to Hostinger; the app runs only on Vercel.

---

## Summary

| Where        | What happens |
|-------------|--------------|
| **Vercel**  | Runs your app (Node.js, Next.js, API, Stripe). |
| **Hostinger** | Holds your domain (plainbot.io) and DNS; you only set DNS to point to Vercel. |

**NODE_ENV=production** is set automatically by Vercel for production; you don’t set it in Hostinger.
