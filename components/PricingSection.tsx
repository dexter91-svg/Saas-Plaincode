"use client";

import Link from "next/link";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

// Pricing copy from the landing design (design.md §2.5).
// TODO(pricing): this does NOT match what the app bills today. The backend sells Growth $79 (1,000 conversations,
// 3 stores) and Pro $149 (3,000 conversations, 5 stores), and has no per-conversation overage. The paid card's
// button goes to `growth` so the price shown ($79) is the price charged. Update these when pricing is decided.
const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    note: null,
    features: [
      "100 conversations/month, 1 store",
      "Full AI, same quality as Pro",
      "Human escalation included, SLA-backed",
      "Plainbot badge on widget",
      "No card required",
    ],
    cta: "Start free",
    href: "/signup?plan=free",
    popular: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$79",
    note: "2,000 conversations included, then $0.03 each",
    features: [
      "Up to 5 stores",
      "Tiered AI, escalates hard questions to a stronger model",
      "No Plainbot badge",
      "Escalation dashboard with SLA alerts",
      "Resolution and usage analytics",
      "Priority support",
    ],
    cta: "Start free trial",
    href: "/signup?plan=growth",
    popular: true,
  },
] as const;

// Entrance timeline (ms after the section scrolls into view): header, then each card, its list, its button.
const CARD_START_MS = 250;
const CARD_GAP_MS = 180;
const ITEM_STEP_MS = 55;

/** "Simple, honest pricing." (design.md §2.5): two plan cards that build in one after another on scroll. */
export default function PricingSection() {
  const [ref, visible] = useRevealOnScroll<HTMLElement>(0.25);

  /** Fade + rise into place after `delay` ms once visible; `duration` in ms. */
  const enter = (delay: number, duration = 700) => ({
    className: `transition-[opacity,transform] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
      visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
    }`,
    style: { transitionDuration: `${duration}ms`, transitionDelay: visible ? `${delay}ms` : "0ms" },
  });

  return (
    <section ref={ref} id="pricing" className="bg-cream px-[6vw] py-[88px]">
      <div className="mx-auto max-w-[1120px]">
        <div className="mx-auto mb-12 max-w-[600px] text-center">
          <h2
            className={`m-0 font-display text-[clamp(30px,4vw,44px)] font-bold text-ink ${enter(0).className}`}
            style={enter(0).style}
          >
            Simple, honest pricing.
          </h2>
          <p
            className={`mt-3.5 font-manrope text-base text-warm-body ${enter(120).className}`}
            style={enter(120).style}
          >
            No per-resolution fees. No surprise upgrades. What you see is what you pay.
          </p>
        </div>

        <div className="mx-auto grid max-w-[800px] grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
          {PLANS.map((plan, p) => {
            const start = CARD_START_MS + p * CARD_GAP_MS;
            return (
              // The outer element runs the entrance; the inner card handles the hover lift, so the two
              // transitions never compete.
              <div key={plan.key} className={`h-full ${enter(start).className}`} style={enter(start).style}>
                <div
                  className={`relative flex h-full flex-col rounded-[20px] bg-white px-8 py-9 font-manrope transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-24px_rgba(43,34,28,.25)] ${
                    plan.popular ? "border-2 border-terracotta" : "border border-ink/10"
                  }`}
                >
                  {plan.popular && (
                    <div
                      className={`absolute -top-[13px] right-7 rounded-full bg-terracotta px-3.5 py-[5px] text-xs font-bold text-cream transition-[opacity,transform] duration-500 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
                        visible ? "scale-100 opacity-100" : "scale-75 opacity-0"
                      }`}
                      style={{ transitionDelay: visible ? `${start + 450}ms` : "0ms" }}
                    >
                      Most popular
                    </div>
                  )}

                  <div className="text-sm font-bold uppercase tracking-[.04em] text-warm-muted">{plan.name}</div>
                  <div className="mt-2.5 flex items-baseline gap-1.5">
                    <span className="font-display text-[44px] leading-none text-ink">{plan.price}</span>
                    <span className="text-sm text-warm-muted">/month</span>
                  </div>
                  {plan.note && <div className="mt-1.5 text-[13px] text-warm-muted">{plan.note}</div>}
                  <div className="my-6 h-px bg-ink/[.08]" />

                  <ul className="m-0 flex flex-1 list-none flex-col gap-3.5 p-0 text-[15px] text-[#4A3F37]">
                    {plan.features.map((feature, f) => (
                      <li
                        key={feature}
                        className={`flex items-start gap-2.5 ${enter(start + 250 + f * ITEM_STEP_MS, 500).className}`}
                        style={enter(start + 250 + f * ITEM_STEP_MS, 500).style}
                      >
                        <span className="mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-peach text-[11px] font-bold text-terracotta-dark">
                          ✓
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    className={`mt-7 block rounded-full py-3 text-center text-[15px] font-bold transition-colors duration-200 ${
                      plan.popular
                        ? "bg-terracotta text-cream hover:bg-terracotta-dark hover:text-cream"
                        : "border border-ink/20 text-ink hover:border-ink"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <p
          className={`mx-auto mt-8 max-w-[640px] text-center font-manrope text-sm text-warm-muted ${enter(CARD_START_MS + 2 * CARD_GAP_MS + 500).className}`}
          style={enter(CARD_START_MS + 2 * CARD_GAP_MS + 500).style}
        >
          Gorgias charges per resolution, and a busy month can run past $500 before anything else. Plainbot Pro includes
          2,000 conversations for $79 a month, then $0.03 each after. No per-resolution fee, anywhere.
        </p>
      </div>
    </section>
  );
}
