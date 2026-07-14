# Railway MySQL – Step by step (ek ek step)

**Manually tables create karne ki zaroorat NAHI.** Aap ek script chalayenge, woh saari tables khud bana dega.

---

## Step 1: Railway se MYSQL_URL copy karo

1. Railway dashboard kholo.
2. Left side **MySQL** service par click karo.
3. Upar **Variables** tab par click karo.
4. List mein **MYSQL_URL** dikhega – uski **value** (purri line) copy karo.  
   Value kuch aisi hogi: `mysql://root:xxxxx@containers-us-west-xxx.railway.app:6xxx/railway`  
   Copy button use karo ya select karke Ctrl+C.

---

## Step 2: Apne project folder mein file banao

1. Apna project folder kholo (jahan `package.json` hai – Saas-Plaincode wala folder).
2. Wahi folder ke andar **nayi file** banao naam: **`.env.railway`** (dot se start, bina .txt).
3. Us file mein **sirf ye ek line** likho (jo value Step 1 mein copy ki thi):

   ```
   MYSQL_URL=yahaan_woh_puri_value_paste_karo
   ```

   Example (apni real value paste karo):

   ```
   MYSQL_URL=mysql://root:AbCdEf123@containers-us-west-xx.railway.app:6123/railway
   ```

4. File **save** karo.

---

## Step 3: Script chalao – tables khud ban jayenge

1. Terminal kholo (VS Code / Cursor ka Terminal ya PowerShell).
2. Project folder mein jao:

   ```bash
   cd c:\Users\Muzahir\Desktop\Saas-Plaincode
   ```

3. Ye command type karo aur Enter dabao:

   ```bash
   node scripts/init-railway-db.js
   ```

4. Agar sab theek ho to message aayega: **"Done. All tables created."**
5. Ab Railway par jao → MySQL → **Database** tab → **Data** – wahan ab tables dikhni chahiye. **Manually "Create table" nahi dabana.**

---

## Step 4: Vercel par MYSQL_URL set karo (taake live app DB use kare)

1. [Vercel](https://vercel.com) par apna project kholo.
2. **Settings** → **Environment Variables**.
3. **Add New**:
   - **Name:** `MYSQL_URL`
   - **Value:** wohi value jo Step 1 mein copy ki thi (Railway Variables se).
4. **Save** karo.
5. **Deployments** → latest deployment par **Redeploy** karo.

Iske baad aapka live app Railway MySQL use karega aur signup/login kaam karega.

---

## Short answers

| Sawal | Jawab |
|--------|--------|
| Kya mujhe manually tables create karni hain? | **Nahi.** Step 3 ki script saari tables bana degi. |
| Railway par "Create table" button dabana hai? | **Nahi.** Sirf script chalao (Step 3). |
| .env.railway kahan banani hai? | Project ke **root** folder mein (jahan `package.json` hai). |

Agar kisi step par error aaye to error ka exact message bhejo, phir usi hisaab se bata sakte hain.
