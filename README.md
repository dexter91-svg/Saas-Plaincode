# Plainbot

Production-ready Next.js frontend (Tailwind CSS) for the SaaS product **Plainbot** — AI customer support for e-commerce.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Logo

Place your logo image at **`public/logo.png`**. The app will use it in the navbar and on the login/signup pages. If the file is missing, a gradient icon fallback is shown.

## Pages

- **`/`** — Landing (hero, how it works, features, pricing, CTA, footer)
- **`/login`** — Login (email, password, Continue with Google)
- **`/signup`** — Sign up (full name, business email, company, password, checkbox, Create Account / Google)
- **`/dashboard`** — Placeholder (empty for now)

## Structure

```
/app
  layout.tsx, page.tsx, globals.css
  /login, /signup, /dashboard, /api (empty)
/components
  Navbar.tsx, Footer.tsx, Logo.tsx
  Button.tsx, Input.tsx, Card.tsx
/public
  logo.png  ← add your logo here
```

## Build

```bash
npm run build
npm start
```

UI only; no backend logic. Use reusable `Button`, `Input`, and `Card`; design is light theme, rounded-xl, soft shadows, responsive.
"# Ecom-chatbot" 
