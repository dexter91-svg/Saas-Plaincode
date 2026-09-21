"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_LINK =
  "font-manrope text-sm font-semibold text-ink transition-colors hover:text-terracotta";

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
        <Link href="/#pricing" className={`${NAV_LINK} hidden sm:inline`}>
          Pricing
        </Link>
        <Link href="/#demo" className={`${NAV_LINK} hidden sm:inline`}>
          How it works
        </Link>
        <Link href="/login" className={NAV_LINK}>
          Log in
        </Link>
        <Link
          href="/signup?plan=free"
          className="rounded-full bg-terracotta px-5 py-[9px] font-manrope text-sm font-bold text-cream transition-colors hover:bg-terracotta-dark hover:text-cream"
        >
          Start free
        </Link>
      </div>
    </nav>
  );
}
