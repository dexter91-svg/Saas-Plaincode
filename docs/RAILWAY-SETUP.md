# Railway MySQL – app se connect karna

## 1. Railway par MySQL ready karo

- Railway project mein **MySQL** service add karo (already hai agar screenshot jaisa).
- **Connect to MySQL** modal kholo (Private Network tab).

## 2. App / Vercel ko connection do

Railway **ek hi variable** deta hai: `MYSQL_URL`.

- **Vercel** (ya jahan app deploy hai):
  - Project → **Settings** → **Environment Variables**
  - Naya variable: **Name** = `MYSQL_URL`
  - **Value** = Railway se copy karo: `${{ MySQL.MYSQL_URL }}`  
    (ya Railway MySQL service → **Variables** tab se `MYSQL_URL` ki value copy karo)
  - Save karo, phir **Redeploy** karo.

Agar aap **individual** variables use karna chahte ho (host, user, password, database):

- Railway MySQL → **Variables** tab se `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT` copy karo.
- Vercel par set karo: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` (values Railway wali).

App pehle `MYSQL_URL` (ya `DATABASE_URL`) check karta hai; agar nahi mile to `DB_*` use karta hai.

## 3. Tables create karo (sirf ek baar)

Database empty hai to pehli baar tables banana zaroori hai.

**Option A – MYSQL_URL use karke (Railway se copy)**

1. Railway MySQL service → **Variables** → `MYSQL_URL` ki value copy karo.
2. Project root par `.env.railway` banao (ya `.env.local`), andar sirf ye line:
   ```env
   MYSQL_URL=mysql://user:password@host:port/railway
   ```
   (value paste karo jo Railway se mili.)
3. Terminal se chalao:
   ```bash
   node scripts/init-railway-db.js
   ```
4. Jab "Done. All tables created." aaye to tables ready hain.

**Option B – DB_* variables**

`.env.railway` (ya `.env.local`) mein set karo:

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`

Phir same command: `node scripts/init-railway-db.js`

## 4. Deploy / test

- Vercel par env save karo, redeploy karo.
- Signup / login try karo – ab `ECONNREFUSED 127.0.0.1:3306` nahi aana chahiye; data Railway MySQL mein jayega.

---

**Note:** `.env.railway` mein secrets hote hain – isko git mein commit mat karo. `.gitignore` mein `.env.railway` add karna better hai.
