"use client";

import Link from "next/link";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

// Only links to pages that exist. No Terms/Privacy links until those pages exist.
const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#demo" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Agency plan", href: "/pricing/agency" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Support",
    links: [{ label: "Contact us", href: "/contact" }],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Start free", href: "/signup?plan=free" },
    ],
  },
] as const;

// Entrance timeline (ms after the footer scrolls into view): brand, each link column, then the bottom bar.
const COLUMN_STEP_MS = 100;

/** Landing page footer: brand and tagline, three short link columns, and a copyright bar. */
export default function LandingFooter() {
  const [ref, visible] = useRevealOnScroll<HTMLElement>(0.2);

  /** Fade + gentle rise into place after `delay` ms once visible. */
  const enter = (delay: number, duration = 700) => ({
    className: `transition-[opacity,transform] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
      visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
    }`,
    style: { transitionDuration: `${duration}ms`, transitionDelay: visible ? `${delay}ms` : "0ms" },
  });

  // Thin underline that draws in from the left on hover.
  const linkClass =
    "relative inline-block font-manrope text-sm text-warm-body transition-colors duration-200 hover:text-terracotta after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-terracotta after:transition-transform after:duration-300 hover:after:scale-x-100 motion-reduce:after:transition-none";

  return (
    <footer ref={ref} className="border-t border-ink/[.08] bg-cream px-[6vw] pb-10 pt-14">
      <div className="mx-auto max-w-[1120px]">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className={`col-span-2 md:col-span-1 ${enter(0).className}`} style={enter(0).style}>
            <Link href="/" className="font-display text-2xl italic text-ink no-underline hover:text-ink">
              Plainbot
            </Link>
            <p className="mt-3 max-w-[280px] font-manrope text-sm leading-[1.6] text-warm-muted">
              AI customer support for Shopify and WooCommerce stores.
            </p>
          </div>

          {COLUMNS.map((col, i) => (
            <nav
              key={col.title}
              aria-label={col.title}
              className={enter((i + 1) * COLUMN_STEP_MS).className}
              style={enter((i + 1) * COLUMN_STEP_MS).style}
            >
              <div className="font-manrope text-[13px] font-bold uppercase tracking-[.04em] text-warm-muted">
                {col.title}
              </div>
              <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div
          className={`mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-ink/[.08] pt-6 font-manrope text-sm text-warm-muted ${enter((COLUMNS.length + 1) * COLUMN_STEP_MS + 100).className}`}
          style={enter((COLUMNS.length + 1) * COLUMN_STEP_MS + 100).style}
        >
          <div>
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> Plainbot — built by{" "}
            <span className="font-semibold text-ink">Plaincode</span>.
          </div>
        </div>
      </div>
    </footer>
  );
}
