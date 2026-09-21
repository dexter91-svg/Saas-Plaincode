"use client";

import { useEffect, useState } from "react";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

// Illustrative example content (design.md §2.6), not real tickets or people.
const QUEUE = [
  { title: "#4821 — Delayed shipment, 3rd contact", meta: "Escalated 4 min ago", agent: "Maya" },
  { title: "#4790 — Refund exception", meta: "Escalated 1 min ago", agent: "Diego" },
  { title: "#4802 — Custom bulk order", meta: "Escalated 9 min ago", agent: "Priya" },
] as const;

// Entrance timeline (ms after the section scrolls into view): text and card fade in, the tickets appear as
// "waiting", then each one is picked up at a steady pace.
const CARD_MS = 150;
const FIRST_ROW_MS = 400;
const ROW_GAP_MS = 120;
const FIRST_ASSIGN_MS = 1300;
const ASSIGN_GAP_MS = 800;

/** Everything that changes state does so by fading colours in place, never by popping in and out. */
const SMOOTH = "transition-colors duration-500 motion-reduce:transition-none";
const FADE = "transition-opacity duration-500 motion-reduce:transition-none";

/** "Nothing falls through the cracks." (design.md §2.6): an escalation queue where every waiting ticket gets picked up. */
export default function TrustSection() {
  const [ref, visible] = useRevealOnScroll<HTMLElement>(0.25);
  const [assigned, setAssigned] = useState(0);

  // Once the section is on screen, assign the queue one ticket at a time (all at once for reduced motion).
  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAssigned(QUEUE.length);
      return;
    }
    const timers = QUEUE.map((_, i) => setTimeout(() => setAssigned(i + 1), FIRST_ASSIGN_MS + i * ASSIGN_GAP_MS));
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  const waiting = QUEUE.length - assigned;

  /** Fade + gentle rise into place after `delay` ms once visible. */
  const enter = (delay: number, duration = 700) => ({
    className: `transition-[opacity,transform] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
      visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
    }`,
    style: { transitionDuration: `${duration}ms`, transitionDelay: visible ? `${delay}ms` : "0ms" },
  });

  return (
    <section ref={ref} className="overflow-hidden bg-cream-alt px-[6vw] py-[96px]">
      <div className="mx-auto grid max-w-[1120px] items-center gap-10 md:grid-cols-[minmax(300px,508px)_minmax(0,1fr)] md:gap-12">
        <div>
          <h2
            className={`m-0 font-display text-[clamp(28px,3.6vw,42px)] font-bold leading-[1.15] text-ink ${enter(0).className}`}
            style={enter(0).style}
          >
            Nothing falls through the cracks.
            <br className="max-md:hidden" /> We mean that literally.
          </h2>
          <p
            className={`mt-[18px] max-w-[508px] font-manrope text-base leading-[1.6] text-warm-body ${enter(120).className}`}
            style={enter(120).style}
          >
            Every conversation Plainbot can&apos;t answer with confidence routes straight to a human — with full context
            attached, not a cold handoff. No ticket sits untouched, no customer waits on a bot that&apos;s given up.
          </p>
        </div>

        <div className={enter(CARD_MS).className} style={enter(CARD_MS).style}>
          <div className="rounded-[20px] border border-ink/[.08] bg-white p-6 font-manrope shadow-[0_24px_60px_-24px_rgba(43,34,28,.2)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[13px] font-bold uppercase tracking-[.04em] text-warm-muted">Escalation queue</div>
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${SMOOTH} ${
                  waiting > 0 ? "bg-peach text-terracotta-dark" : "bg-[#EAF0E9] text-[#4E6E52]"
                }`}
              >
                {waiting > 0 ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta motion-safe:animate-pulse" />
                    {visible ? waiting : QUEUE.length} waiting
                  </>
                ) : (
                  <>
                    <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.5l2.3 2.3L9.5 3.5" />
                    </svg>
                    All assigned
                  </>
                )}
              </span>
            </div>

            {QUEUE.map((item, i) => {
              const start = FIRST_ROW_MS + i * ROW_GAP_MS;
              const done = i < assigned;
              const last = i === QUEUE.length - 1;
              return (
                <div key={item.title} className={enter(start, 600).className} style={enter(start, 600).style}>
                <div
                  className={`-mx-2 flex items-center gap-3.5 rounded-xl px-2 py-4 ${SMOOTH} ${
                    done ? "bg-[#F7FAF6]" : "bg-transparent"
                  }`}
                >
                  {/* Avatar: an empty dashed circle that fills with the assignee's initial. Both labels share one
                      grid cell, so nothing jumps while they cross-fade. */}
                  <div
                    className={`grid h-9 w-9 flex-none place-items-center rounded-full border text-sm font-bold ${SMOOTH} ${
                      done
                        ? "border-transparent bg-[#EAF0E9] text-[#4E6E52]"
                        : "border-dashed border-ink/25 bg-white text-warm-muted"
                    }`}
                  >
                    <span className={`col-start-1 row-start-1 ${FADE} ${done ? "opacity-0" : "opacity-100"}`}>?</span>
                    <span className={`col-start-1 row-start-1 ${FADE} ${done ? "opacity-100" : "opacity-0"}`}>
                      {item.agent[0]}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-ink">{item.title}</div>
                    <div className="mt-0.5 text-[13px] text-warm-muted">{item.meta}</div>
                  </div>

                  <div
                    className={`hidden flex-none place-items-center rounded-full px-2.5 py-[5px] text-xs font-bold sm:grid ${SMOOTH} ${
                      done ? "bg-[#EAF0E9] text-[#4E6E52]" : "bg-peach text-terracotta-dark"
                    }`}
                  >
                    <span className={`col-start-1 row-start-1 whitespace-nowrap ${FADE} ${done ? "opacity-0" : "opacity-100"}`}>
                      Waiting for a person
                    </span>
                    <span className={`col-start-1 row-start-1 whitespace-nowrap ${FADE} ${done ? "opacity-100" : "opacity-0"}`}>
                      {item.agent} · assigned
                    </span>
                  </div>

                </div>
                {!last && <div className="h-px bg-ink/[.06]" />}
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-right font-manrope text-[11px] italic text-warm-muted">Illustrative example</div>
        </div>
      </div>
    </section>
  );
}
