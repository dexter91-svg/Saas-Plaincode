"use client";

import { Fragment } from "react";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

// Copy from the landing design (design.md §2.4).
const STEPS = [
  { title: "Connect your store", body: "One-click for Shopify, a quick plugin for WooCommerce." },
  { title: "Plainbot learns your store", body: "Products, policies, and FAQs — automatic." },
  { title: "Go live", body: "Widget appears immediately. Free tier, no card." },
] as const;

const HEADING = "Go live in minutes.".split(" ");

// Entrance timeline (ms after the section scrolls into view). It reads as a chain:
// heading words, then step 1, its connector, step 2, its connector, step 3.
const WORD_STEP_MS = 70;
const FIRST_STEP_MS = 350;
const STEP_GAP_MS = 650;
const CONNECTOR_AFTER_MS = 300;
const stepStart = (i: number) => FIRST_STEP_MS + i * STEP_GAP_MS;

/** "Go live in minutes." (design.md §2.4): three numbered steps that build up one after another on scroll. */
export default function StepsSection() {
  const [ref, visible] = useRevealOnScroll<HTMLElement>(0.3);

  /** Fade + rise (or pop) into place after `delay` ms once visible. */
  const enter = (delay: number, kind: "up" | "pop" = "up") => ({
    className: `transition-[opacity,transform] duration-[700ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
      visible ? "translate-y-0 scale-100 opacity-100" : kind === "pop" ? "scale-75 opacity-0" : "translate-y-4 opacity-0"
    }`,
    style: { transitionDelay: visible ? `${delay}ms` : "0ms" },
  });

  return (
    <section ref={ref} id="how-it-works" className="bg-cream px-[6vw] pb-[88px] pt-[96px]">
      <div className="mx-auto max-w-[1120px]">
        <h2 className="mb-14 text-center font-display text-[clamp(30px,4vw,44px)] font-bold text-ink">
          {HEADING.map((word, i) => (
            <Fragment key={i}>
              <span className={`inline-block ${enter(i * WORD_STEP_MS).className}`} style={enter(i * WORD_STEP_MS).style}>
                {word}
              </span>
              {i < HEADING.length - 1 && " "}
            </Fragment>
          ))}
        </h2>

        <ol className="flex flex-col items-center gap-10 md:flex-row md:items-start md:justify-center md:gap-0">
          {STEPS.map((step, i) => {
            const start = stepStart(i);
            return (
              <Fragment key={step.title}>
                <li className="w-full max-w-[280px] flex-1 px-4 text-center md:min-w-[220px]">
                  {/* Outer element runs the entrance; the inner circle only handles the hover colour, so the two
                      transitions never compete. */}
                  <div className={`mx-auto mb-[18px] w-fit ${enter(start, "pop").className}`} style={enter(start, "pop").style}>
                    <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-terracotta font-display text-[22px] text-terracotta transition-colors duration-300 hover:bg-terracotta hover:text-cream">
                      {i + 1}
                    </div>
                  </div>
                  <div
                    className={`mb-1.5 font-manrope text-[17px] font-bold text-ink ${enter(start + 120).className}`}
                    style={enter(start + 120).style}
                  >
                    {step.title}
                  </div>
                  <div
                    className={`font-manrope text-sm leading-[1.55] text-warm-body ${enter(start + 220).className}`}
                    style={enter(start + 220).style}
                  >
                    {step.body}
                  </div>
                </li>
                {i < STEPS.length - 1 && (
                  <div
                    aria-hidden
                    className={`mt-[26px] hidden h-0 w-[60px] flex-none origin-left border-t-2 border-dashed border-terracotta/35 transition-transform duration-[350ms] ease-out motion-reduce:transition-none md:block ${
                      visible ? "scale-x-100" : "scale-x-0"
                    }`}
                    style={{ transitionDelay: visible ? `${start + CONNECTOR_AFTER_MS}ms` : "0ms" }}
                  />
                )}
              </Fragment>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
