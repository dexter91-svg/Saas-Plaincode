"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Button from "./Button";

function entranceClass(reduceMotion: boolean, delayMs: number, duration = "0.65s") {
  if (reduceMotion) return "";
  return `opacity-0 animate-fade-in-up [animation-duration:${duration}] [animation-delay:${delayMs}ms] [animation-fill-mode:both]`;
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollShift, setScrollShift] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const h = el.offsetHeight || 1;
      const t = Math.min(1, Math.max(0, -rect.top / (h * 0.5)));
      setScrollShift(t);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduceMotion]);

  const scrollStyle =
    reduceMotion || scrollShift === 0
      ? undefined
      : {
          transform: `translate3d(0, ${scrollShift * 40}px, 0) scale(${1 - scrollShift * 0.04})`,
          opacity: Math.max(0.3, 1 - scrollShift * 0.58),
        };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[calc(100vh-0px)] border-b border-slate-800 bg-black px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28 flex flex-col justify-center overflow-hidden"
    >
      {/* Soft vignette + subtle radial lift */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(249,115,22,0.08),transparent_55%)]"
        aria-hidden
      />

      <div
        className="relative mx-auto w-full max-w-3xl text-center will-change-transform"
        style={scrollStyle}
      >
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl md:text-5xl lg:text-6xl text-balance">
          <span className={`block ${entranceClass(reduceMotion, 60, "0.72s")}`}>
            Your Shopify store is losing sales to unanswered questions.
          </span>
          <span className={`mt-2 block sm:mt-3 ${entranceClass(reduceMotion, 200, "0.7s")}`}>
            <span
              className={
                reduceMotion
                  ? "bg-gradient-to-r from-primary-400 to-primary-500 bg-clip-text text-transparent"
                  : "inline-block bg-gradient-to-r from-primary-500 via-primary-300 to-primary-500 bg-[length:200%_100%] bg-clip-text text-transparent animate-plainbot-shimmer"
              }
            >
              Plainbot
            </span>{" "}
            fixes that in 10 minutes.
          </span>
        </h1>

        <p
          className={`mt-6 text-lg leading-relaxed text-slate-400 ${entranceClass(
            reduceMotion,
            380,
            "0.62s"
          )}`}
        >
          AI chatbot trained on your store. Handles support, recovers carts, creates tickets. Works 24/7
          automatically.
        </p>

        <div className={`mt-10 flex justify-center ${entranceClass(reduceMotion, 520, "0.58s")}`}>
          <Link href="/signup?plan=free">
            <Button
              variant="primary"
              className="min-w-[240px] rounded-full shadow-lg shadow-primary-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Start free, no card needed
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
