# Plainbot Landing Page — Redesign Spec

Source: `Plainbot Landing (standalone).html` (a bundled prototype) plus five reference screenshots.
This file documents the target design only. **No app code has been changed yet.**

Current landing components that this redesign replaces: `components/Navbar.tsx`, `HeroSection.tsx`, `AiDemoSection.tsx`, `LandingChatSection.tsx`, `StatsBar.tsx`, `TestimonialsSection.tsx`, `FoundingOfferBlock.tsx`, `Footer.tsx`, and the pricing block in `app/page.tsx`.

---

## 1. Design tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| `cream` | `#FBF7F2` | Page background |
| `cream-alt` | `#F8F1E9` | Alternate band background (Trust section) |
| `peach` | `#F3E3D6` | Badges, bot bubbles, checkmark chips, gradient start |
| `terracotta` | `#BE5B37` | Primary accent: buttons, links, italic emphasis, "P" avatar |
| `terracotta-dark` | `#9C4A2B` | Hover state, eyebrow labels, badge text |
| `ink` | `#2B221C` | Headings, primary text, customer bubbles, active tab |
| `body` | `#6E5E52` | Paragraph text |
| `list` | `#4A3F37` | Pricing list text |
| `muted` | `#8C7C6E` | Captions, small labels, units |
| `sage` | `#6B8F71` | Online dot, "auto-resolved" numbers, completed step |
| `sage-bg` / `sage-text` | `#EAF0E9` / `#4E6E52` | "Assigned" pills |
| `white` | `#FFFFFF` | Cards |
| `hairline` | `rgba(43,34,28,.08)` | Card borders (`.06` for row dividers, `.1` to `.2` for outlined buttons) |

### Typography
- **Headings:** Instrument Serif, weight 400. Italic is used for emphasis (`<em>` in terracotta) and for the final CTA.
- **Body and UI:** Manrope, weights 400, 500, 600, 700 and 800. Buttons, labels and nav links use 600 to 700.
- Font smoothing: antialiased.
- Sizes:
  - H1: `clamp(38px, 5.4vw, 64px)`, line-height 1.1
  - H2 (standard): `clamp(30px, 4vw, 44px)`
  - H2 (demo and trust): `clamp(28px, 3.6vw, 42px)`
  - Lead paragraph: 19px, line-height 1.6
  - Section paragraph: 16px
  - Card text: 14 to 15px
  - Small print: 12 to 13px
  - Eyebrow: 13px, uppercase, letter-spacing .04em

### Shape, shadow and layout
- Buttons and pills: fully round (`border-radius: 999px`).
- Cards: 20px radius (demo panel 24px). Large tinted panels: 32px radius.
- Card shadow: `0 24px 60px -24px rgba(43,34,28,.2)`. Hero card: `0 30px 70px -24px rgba(43,34,28,.28)`.
- Primary button shadow: `0 14px 28px -12px rgba(190,91,55,.55)`.
- Page gutter: `6vw`. Content max-width: 1120 to 1160px, centered.
- Section vertical padding: 88 to 96px.
- Links: terracotta, no underline, darker on hover.

---

## 2. Sections (top to bottom)

### 2.1 Navbar
- Sticky, `z-index: 50`, padding `18px 6vw`, with backdrop blur.
- **Left:** wordmark "Plainbot" in Instrument Serif italic, 24px, ink.
- **Right (gap 28px):** Pricing (`#pricing`), How it works (`#demo`), Log in, then a **Start free** pill (terracotta fill, cream text, 14px bold, hover darkens).
- **Scroll behaviour:** after 8px of scroll the background goes from `rgba(251,247,242,.85)` to `.96`, the bottom border gets darker, and a soft shadow appears.

### 2.2 Hero
Two columns, wrapping on narrow screens. Text on the left (`flex: 1 1 440px`), floating card on the right (`max-width: 340px`).
- **Badge:** peach pill, terracotta-dark bold 13px text: "For Shopify and WooCommerce stores".
- **H1:** "You didn't start a store to answer the same question *200 times a week.*" The italic part is terracotta. Max width 600px.
- **Sub-copy:** "Plainbot learns your store in minutes and handles the repetitive questions — so you only see the ones that actually need you." 19px, `body` color, max width 520px.
- **Actions:**
  - Primary pill: "Start free, no card needed" (16px, padding `16px 32px`, glow shadow, lifts 1px on hover, scales to .97 on press).
  - Text link: "See how it works" with a 1px underline that turns terracotta on hover.
- **Fine print (13px, muted):** "Free forever, no card required · Flat $79/mo on Pro, no per-resolution fees · Cancel anytime".
- **Floating widget card** (white, 20px radius, 20px padding, max width 310px):
  - Header: a green online dot, "Plainbot", and "Online" pushed to the right.
  - Customer bubble (ink background, cream text, right aligned): "Any update on order #4821?"
  - Bot bubble (peach, with a 22px terracotta "P" avatar): "Shipped yesterday — arriving Thu."
  - Continuous float animation: rotated 2°, bobbing 10px vertically over 6s.
- **Entrance animation:** each element fades in and rises 16px (`plnbRise`), staggered at 0, .08, .16, .24, .32s and .3s for the card.

### 2.2b Logo strip (below the hero)
- Left label: "Built for stores like yours" (13px bold, muted).
- Five 112×36px rounded logo slots at 65% opacity. They are placeholders ("Store logo") in the prototype.

### 2.3 Demo — "See it in action" (`#demo`)
- **Container:** margin `60px 6vw 0`, padding `56px 5vw 64px`, 32px radius, background `radial-gradient(120% 160% at 15% 0%, peach 0%, cream 55%)`.
- **Header:** eyebrow "SEE IT IN ACTION", H2 "One widget, every kind of question.", sub "Real conversations. Real dashboards. No generic UI chrome."
- **Tab pills:** Order Status, Returns & Refunds, Escalation to a Human, Multi-Store Dashboard, Setup. Inactive is white with a light border. Active is ink-filled with cream text.
- **Panel:** white, 24px radius, min height 420px, shadow, content centered vertically. Three views:
  - **Chat view** (Order Status, Returns, Escalation):
    - Messages appear one at a time.
    - Customer bubbles are ink and right aligned. Bot bubbles are peach on the left with a 26px "P" avatar. Bubbles are max 78% wide with 16px radius.
    - A typing indicator shows three bouncing terracotta dots, plus the text "Plainbot is typing…" when the bot is next.
    - A system line such as "Maya has joined the chat." is italic terracotta with no bubble.
  - **Dashboard view:**
    - An italic note reads "Sample data — illustrative dashboard, not live numbers".
    - A 4-column grid with columns Store, Conversations, Auto-resolved (sage, bold) and Escalated.
    - Rows fade and slide in one at a time (380ms apart).
    - Sample rows: Sunny Threads Co. 128/94%/6, Northwind Outdoors 76/88%/8, Casa Botanica 51/91%/4.
  - **Setup view:**
    - Three steps with numbered circles that turn into green ✓ circles one by one (520ms apart).
    - Steps: Connect your store, Plainbot learns your store, Go live.
- **Auto-advance:** after a sequence finishes, wait 2.6s and move to the next tab, looping. This is controlled by an `autoAdvanceDemo` prop. Clicking a tab restarts that tab's sequence.

### 2.4 Steps — "Go live in minutes."
- Centered H2, then three columns joined by 60px dashed connectors (`2px dashed rgba(190,91,55,.35)`).
- Each column: a 52px circle with a 2px terracotta border and a serif numeral (1, 2, 3), a bold 17px title, and a 14px description.
  1. Connect your store: "One-click for Shopify, a quick plugin for WooCommerce."
  2. Plainbot learns your store: "Products, policies, and FAQs — automatic."
  3. Go live: "Widget appears immediately. Free tier, no card."
- Padding `96px 6vw 88px`.

### 2.5 Pricing (`#pricing`)
- Header: "Simple, honest pricing." with sub "No per-resolution fees. No surprise upgrades. What you see is what you pay."
- Two cards in a grid, max width 800px, gap 24px. Cards are white with 20px radius and `36px 32px` padding. On hover they lift 6px and gain a deeper shadow.
- **Free card:** label FREE, price $0 /month, 1px hairline border.
  - 100 conversations/month, 1 store
  - Full AI, same quality as Pro
  - Human escalation included, SLA-backed
  - Plainbot badge on widget
  - No card required
  - Outlined "Start free" button
- **Pro card:** label PRO, price $79 /month, with "2,000 conversations included, then $0.03 each". It has a 2px terracotta border and a "Most popular" pill on the top right edge.
  - Up to 5 stores
  - Tiered AI, escalates hard questions to a stronger model
  - No Plainbot badge
  - Escalation dashboard with SLA alerts
  - Resolution and usage analytics
  - Priority support
  - Filled terracotta "Start free trial" button
- Each list item has an 18px peach circle with a terracotta ✓.
- A `highlightPlan` prop (`free` or `pro`, default `pro`) moves the terracotta border and badge.
- **Comparison footnote (14px, muted, centered):** "Gorgias charges per resolution, and a busy month can run past $500 before anything else. Plainbot Pro includes 2,000 conversations for $79 a month, then $0.03 each after. No per-resolution fee, anywhere."

### 2.6 Trust — escalation queue
- Full-width band in `cream-alt`, padding `88px 6vw`. Two columns (text `1fr`, card `1.1fr`, gap 56px).
- **Left:** H2 "Nothing falls through the cracks. We mean that literally." and the paragraph "Every conversation Plainbot can't answer with confidence routes straight to a human — with full context attached, not a cold handoff. No ticket sits untouched, no customer waits on a bot that's given up."
- **Right card:** heading "ESCALATION QUEUE" (uppercase, muted), then three rows separated by hairlines. Each row has a bold title, a muted "Escalated N min ago" line, and a sage "Name · assigned" pill.
  - #4821 — Delayed shipment, 3rd contact, 4 min ago, Maya
  - #4790 — Refund exception, 1 min ago, Diego
  - #4802 — Custom bulk order, 9 min ago, Priya

### 2.7 Testimonials
- H2 "Store owners who got their time back." Two white cards in a grid (max width 860px), each with an italic quote, a 44px round avatar slot, a bold name and a muted store name.
- **All content is placeholder in the prototype:** "[Placeholder — customer quote…]", "[Name]", "[Store name]", and "Photo" avatar slots.

### 2.8 Final CTA
- Margin `64px 6vw 88px`, padding `80px 6vw`, 32px radius, centered, background `radial-gradient(120% 160% at 50% 0%, peach 0%, cream 60%)`.
- **H2 (italic serif, `clamp(32px, 5vw, 52px)`, max width 640px):** "Your first real day off starts with one link."
- **Sub:** "Free forever. No card. Five minutes to set up."
- **Button:** "Start free, no card needed" (padding `16px 36px`).

### 2.9 Footer
- Top hairline border, max width 1120px, padding `32px 6vw 44px`, flex row that wraps.
- **Left:** "Plainbot — built by **Plaincode**." in muted 14px, with "Plaincode" in ink at weight 600.
- **Right:** Pricing, How it works, Log in (14px, `body` color, terracotta on hover).

---

## 3. Motion and behavior
- **Reveal on scroll:** the demo, steps, pricing, trust, testimonials and final CTA sections start at `opacity: 0` and `translateY(28px)`. They animate to visible over .9s with `cubic-bezier(.16, 1, .3, 1)` when 15% of the section is in view (`IntersectionObserver`). A fallback shows everything after 1.8s.
- **Keyframes:**
  - `plnbRise`: fade in and rise 16px
  - `plnbFloat`: hero card float with a 2° tilt
  - `plnbDot`: typing dots bounce
- **Hover and press:** links and buttons transition in .2s. Primary buttons lift 1px on hover and scale to .97 on press.
- **Smooth scroll:** `html { scroll-behavior: smooth }` for the `#pricing` and `#demo` anchors.
- **Responsive:** every section uses `flex-wrap` or `auto-fit` grids. Page gutters are `6vw`. Only the hero and the trust section stack at narrow widths.

---

## 4. Things to resolve before building
1. **Placeholder content.** The testimonials and logo strip are placeholders. Phase 0 removed fake testimonials and unverified claims on purpose. Either omit those two sections, or fill them only with real content.
2. **Pricing does not match the app.** The design shows two plans (Free and Pro at $79 with 2,000 conversations, then $0.03 each). `lib/plans.ts` and the Stripe setup have four plans (Free, Growth, Pro, Agency), and Pro is 3,000 conversations. The pricing copy and the plan logic need to agree.
3. **Competitor claim.** The Gorgias "past $500" footnote is a factual claim about a named company. It should be verified before it is published.
4. **Demo numbers.** The dashboard is labeled "Sample data", which is good. Keep that label. The "Order #4821" and "Maya" content is illustrative only.
5. **CTA target.** The design's `ctaUrl` should point to `/signup`. "Log in" should point to `/login`.
6. **Fonts.** The prototype bundles Instrument Serif (regular and italic) and Manrope (400 to 800). In Next.js these can be loaded with `next/font/google`.
7. **Tailwind.** The prototype uses inline styles. The build should express the tokens above in `tailwind.config.ts` and use Tailwind classes to match the rest of the app.
