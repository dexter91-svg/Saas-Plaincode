"use client";

import { useEffect, useState } from "react";

const SHOW_AFTER_PX = 600;
const RING_RADIUS = 21;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Floating "back to top" button in the bottom-right corner. It fades in once you have scrolled down a bit, and a
 * thin ring around it fills up to show how far through the page you are.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(window.scrollY > SHOW_AFTER_PX);
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    // The outer element handles showing and hiding, the button inside handles hover, so the two never compete.
    <div
      className={`fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] z-40 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-90 opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        className="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white text-ink shadow-[0_12px_30px_-10px_rgba(43,34,28,.35)] outline-none transition-[transform,background-color,color] duration-200 hover:-translate-y-0.5 hover:bg-terracotta hover:text-cream focus-visible:ring-2 focus-visible:ring-terracotta/60 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
      >
        {/* progress ring: a faint track with a terracotta arc that grows as you scroll down the page */}
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48" fill="none" aria-hidden>
          <circle cx="24" cy="24" r={RING_RADIUS} stroke="rgba(43,34,28,.1)" strokeWidth="2" />
          <circle
            cx="24"
            cy="24"
            r={RING_RADIUS}
            stroke="#BE5B37"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-150 group-hover:stroke-cream"
          />
        </svg>
        <svg
          className="relative h-4 w-4 transition-transform duration-200 group-hover:-translate-y-px"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
