"use client";

import Link from "next/link";
import { useState } from "react";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

// Copy carried over from the previous landing page FAQ.
// TODO(faq): the Shopify answer promises a one-click App Store install. Check that against the Shopify listing
// status (Phase 0.6) before this goes live.
const FAQS = [
  {
    q: "How long does setup take?",
    a: "Most stores are live in under 10 minutes. Paste your URL, we read your store automatically, add one script tag to your site, done.",
  },
  {
    q: "Does it work with Shopify and WooCommerce?",
    a: "Yes. Both platforms fully supported. One-click install for Shopify via the App Store. One script tag for WooCommerce.",
  },
  {
    q: "What happens when the bot can't answer something?",
    a: "It creates a support ticket automatically and forwards the full conversation to your email. Your team only sees what actually needs a human.",
  },
  {
    q: "Can I customise the chatbot's personality and tone?",
    a: "Yes. Set your tone, add custom FAQs, match your brand colours — all from your dashboard in minutes.",
  },
  {
    q: "What happens when I hit my conversation limit?",
    a: "You get an in-app notification before you hit the limit. Upgrade in one click, no call required, instant access.",
  },
  {
    q: "Is there a contract?",
    a: "No. Monthly subscription. Cancel anytime from your dashboard.",
  },
  {
    q: "Will it really learn my whole store?",
    a: "Yes. Paste your store URL and Plainbot reads every product page, your returns policy, shipping info, FAQs — everything publicly visible on your site. Takes under 2 minutes.",
  },
  {
    q: "Can I upgrade or downgrade anytime?",
    a: "Yes. You can switch plans or cancel your subscription anytime directly from your dashboard in one click.",
  },
] as const;

// Entrance timeline (ms after the section scrolls into view): heading and side text, then the questions in turn.
const FIRST_ITEM_MS = 200;
const ITEM_GAP_MS = 70;

/** "Common questions": an accordion (one answer open at a time) whose items rise in one after another on scroll. */
export default function FaqSection() {
  // A tall section, so trigger as soon as a bit of it is on screen.
  const [ref, visible] = useRevealOnScroll<HTMLElement>(0.12);
  const [open, setOpen] = useState<number | null>(0);

  /** Fade + gentle rise into place after `delay` ms once visible. */
  const enter = (delay: number, duration = 700) => ({
    className: `transition-[opacity,transform] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
      visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
    }`,
    style: { transitionDuration: `${duration}ms`, transitionDelay: visible ? `${delay}ms` : "0ms" },
  });

  return (
    <section ref={ref} id="faq" className="bg-cream-alt px-[6vw] py-[96px]">
      <div className="mx-auto grid max-w-[1120px] items-start gap-10 md:grid-cols-[minmax(240px,.8fr)_minmax(0,1.5fr)] md:gap-16">
        {/* sticky on desktop so the heading stays in view while the questions scroll past */}
        <div className="md:sticky md:top-28">
          <h2
            className={`m-0 font-display text-[clamp(28px,3.6vw,42px)] font-bold leading-[1.15] text-ink ${enter(0).className}`}
            style={enter(0).style}
          >
            Common questions
          </h2>
          <p
            className={`mt-[18px] font-manrope text-base leading-[1.6] text-warm-body ${enter(120).className}`}
            style={enter(120).style}
          >
            Everything you&apos;d want to know before you start. Can&apos;t find your answer?{" "}
            <Link
              href="/contact"
              className="font-bold text-terracotta underline decoration-terracotta/30 underline-offset-4 transition-colors hover:text-terracotta-dark hover:decoration-terracotta-dark"
            >
              Get in touch
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            const start = FIRST_ITEM_MS + i * ITEM_GAP_MS;
            const buttonId = `faq-q-${i}`;
            const panelId = `faq-a-${i}`;
            return (
              // The outer element runs the entrance; the inner card handles hover and open styling, so the two
              // transitions never compete.
              <div key={item.q} className={enter(start, 600).className} style={enter(start, 600).style}>
                <div
                  className={`rounded-2xl border bg-white font-manrope transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none ${
                    isOpen
                      ? "border-terracotta/30 shadow-[0_18px_40px_-28px_rgba(43,34,28,.3)]"
                      : "border-ink/[.08] hover:border-ink/20"
                  }`}
                >
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl px-6 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
                  >
                    <span className="text-base font-bold text-ink">{item.q}</span>
                    <span
                      aria-hidden
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors duration-300 motion-reduce:transition-none ${
                        isOpen ? "bg-terracotta text-cream" : "bg-peach text-terracotta-dark"
                      }`}
                    >
                      {/* plus that turns into a minus: the vertical bar scales away */}
                      <span className="relative block h-3 w-3">
                        <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-current" />
                        <span
                          className={`absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-current transition-transform duration-300 motion-reduce:transition-none ${
                            isOpen ? "scale-y-0" : "scale-y-100"
                          }`}
                        />
                      </span>
                    </span>
                  </button>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    aria-hidden={!isOpen}
                    className={`grid transition-[grid-template-rows,opacity] duration-[400ms] ease-out motion-reduce:transition-none ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="m-0 px-6 pb-6 text-[15px] leading-[1.65] text-warm-body">{item.a}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
