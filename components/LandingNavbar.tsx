"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Colour shift plus a thin underline that draws in from the left on hover (and keyboard focus).
const NAV_LINK =
  "relative inline-block font-manrope text-sm font-semibold text-ink transition-colors duration-200 hover:text-terracotta after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-terracotta after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none";

/** Landing-page navbar (cream theme, see design.md §2.1). Always pinned to the top of the viewport. */
export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 flex items-center justify-between px-[6vw] py-[18px] bg-cream transition-[box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-b border-ink/[.12] shadow-[0_4px_20px_-8px_rgba(43,34,28,.12)]"
          : "border-b border-ink/[.08]"
      }`}
    >
      <Link href="/" className="font-display text-2xl italic text-ink no-underline hover:text-ink">
        Plainbot
      </Link>
      <div className="flex items-center gap-4 sm:gap-7">
        <Link href="/#pricing" className={`${NAV_LINK} hidden sm:inline-block`}>
          Pricing
        </Link>
        <Link href="/#demo" className={`${NAV_LINK} hidden sm:inline-block`}>
          How it works
        </Link>
        <Link href="/login" className={NAV_LINK}>
          Log in
        </Link>
        <Link
          href="/signup?plan=free"
          className="rounded-full bg-terracotta px-5 py-[9px] font-manrope text-sm font-bold text-cream transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-terracotta-dark hover:text-cream hover:shadow-[0_10px_20px_-10px_rgba(190,91,55,.6)] active:scale-[.97] motion-reduce:transition-none"
        >
          Start free
        </Link>
      </div>
    </nav>
  );
}
