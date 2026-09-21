"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

// Copy from the landing design (design.md §2.8).
const HEADING = "Your first real day off starts with one link.".split(" ");

// Entrance timeline (ms after the section scrolls into view): panel, heading words, sub line, button.
const WORDS_START_MS = 150;
const WORD_STEP_MS = 70;
const SUB_MS = WORDS_START_MS + HEADING.length * WORD_STEP_MS + 60;
const BUTTON_MS = SUB_MS + 150;

/** Closing call to action (design.md §2.8): a soft peach panel whose heading builds up word by word. */
export default function FinalCta() {
  const [ref, visible] = useRevealOnScroll<HTMLElement>(0.35);

  /** Fade + gentle rise into place after `delay` ms once visible. */
  const enter = (delay: number, duration = 700) => ({
    className: `transition-[opacity,transform] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
      visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 opacity-0"
    }`,
    style: { transitionDuration: `${duration}ms`, transitionDelay: visible ? `${delay}ms` : "0ms" },
  });

  return (
    <section ref={ref} className="bg-cream px-[6vw] pb-[88px] pt-16">
      <div
        className={`rounded-[32px] bg-[radial-gradient(120%_160%_at_50%_0%,#F3E3D6_0%,#FBF7F2_60%)] px-[6vw] py-20 text-center ${enter(0, 900).className}`}
        style={enter(0, 900).style}
      >
        <h2 className="m-0 mx-auto max-w-[640px] font-display text-[clamp(32px,5vw,52px)] font-bold italic leading-[1.15] text-ink">
          {HEADING.map((word, i) => (
            <Fragment key={i}>
              <span className={`inline-block ${enter(WORDS_START_MS + i * WORD_STEP_MS).className}`} style={enter(WORDS_START_MS + i * WORD_STEP_MS).style}>
                {word}
              </span>
              {i < HEADING.length - 1 && " "}
            </Fragment>
          ))}
        </h2>

        <p
          className={`mt-4 font-manrope text-base text-warm-body ${enter(SUB_MS).className}`}
          style={enter(SUB_MS).style}
        >
          Free forever. No card. Five minutes to set up.
        </p>

        {/* The outer element runs the entrance; the link handles the hover lift, so the two never compete. */}
        <div className={`mt-8 ${enter(BUTTON_MS).className}`} style={enter(BUTTON_MS).style}>
          <Link
            href="/signup?plan=free"
            className="inline-block rounded-full bg-terracotta px-9 py-4 font-manrope text-base font-bold text-cream transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-terracotta-dark hover:text-cream active:scale-[.97]"
          >
            Start free, no card needed
          </Link>
        </div>
      </div>
    </section>
  );
}
