"use client";

import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

// TODO(testimonials): these are the design's visible placeholders (design.md §2.7), NOT real customers.
// Replace each entry with a real, approved quote (and a photo, if wanted) before this goes live.
const TESTIMONIALS = [
  {
    quote: "[Placeholder — customer quote about time saved on repetitive questions]",
    name: "[Name]",
    store: "[Store name]",
  },
  {
    quote: "[Placeholder — customer quote about escalation or trust]",
    name: "[Name]",
    store: "[Store name]",
  },
] as const;

// Entrance timeline (ms after the section scrolls into view): heading, then each card and its author line.
const CARD_START_MS = 200;
const CARD_GAP_MS = 180;

/** "Store owners who got their time back." (design.md §2.7): two quote cards that rise in one after another. */
export default function LandingTestimonials() {
  const [ref, visible] = useRevealOnScroll<HTMLElement>(0.3);

  /** Fade + gentle rise into place after `delay` ms once visible. */
  const enter = (delay: number, duration = 700) => ({
    className: `transition-[opacity,transform] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
      visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
    }`,
    style: { transitionDuration: `${duration}ms`, transitionDelay: visible ? `${delay}ms` : "0ms" },
  });

  return (
    <section ref={ref} className="bg-cream px-[6vw] py-[88px]">
      <div className="mx-auto max-w-[1120px]">
        <h2
          className={`m-0 mb-11 text-center font-display text-[clamp(28px,3.6vw,42px)] font-bold text-ink ${enter(0).className}`}
          style={enter(0).style}
        >
          Store owners who got their time back.
        </h2>

        <div className="mx-auto grid max-w-[860px] grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
          {TESTIMONIALS.map((t, i) => {
            const start = CARD_START_MS + i * CARD_GAP_MS;
            return (
              // The outer element runs the entrance; the inner card handles the hover lift, so the two
              // transitions never compete.
              <div key={i} className={`h-full ${enter(start).className}`} style={enter(start).style}>
                <div className="flex h-full flex-col rounded-[20px] border border-ink/[.08] bg-white p-8 font-manrope transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(43,34,28,.22)]">
                  <p className="m-0 text-base italic leading-[1.6] text-ink">“{t.quote}”</p>
                  <div
                    className={`mt-auto flex items-center gap-3 pt-[22px] ${enter(start + 250, 600).className}`}
                    style={enter(start + 250, 600).style}
                  >
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-dashed border-ink/25 bg-cream/60 text-[10px] text-warm-muted">
                      Photo
                    </div>
                    <div>
                      <div className="text-sm font-bold text-ink">{t.name}</div>
                      <div className="text-[13px] text-warm-muted">{t.store}</div>
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
