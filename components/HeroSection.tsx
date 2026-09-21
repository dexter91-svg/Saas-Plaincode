import Link from "next/link";

const RISE = "motion-safe:animate-plnb-rise";

// Generic placeholder marks (no real brands). Replace with approved customer logos.
const PLACEHOLDER_LOGOS = [
  { key: "circle", shape: <circle cx="12" cy="12" r="10" />, text: "font-display italic" },
  { key: "square", shape: <rect x="3" y="3" width="18" height="18" rx="4" />, text: "font-manrope font-extrabold tracking-tight" },
  { key: "triangle", shape: <path d="M12 3 22 21H2z" />, text: "font-display" },
  { key: "diamond", shape: <path d="M12 2 22 12 12 22 2 12z" />, text: "font-manrope font-semibold" },
  { key: "hexagon", shape: <path d="M12 2 21 7v10l-9 5-9-5V7z" />, text: "font-display italic" },
] as const;

/** Landing hero + logo strip (design.md §2.2). Cream background to match the navbar. */
export default function HeroSection() {
  return (
    <section className="bg-cream pb-16">
      <header id="hero" className="mx-auto max-w-[1160px] px-[6vw] pt-[76px]">
        <div className="flex flex-wrap items-center gap-10">
          <div className="min-w-0 flex-[1_1_440px]">
            <div
              className={`${RISE} inline-flex items-center gap-2 rounded-full bg-peach px-[15px] py-[7px] font-manrope text-[13px] font-bold tracking-[.02em] text-terracotta-dark`}
            >
              For Shopify and WooCommerce stores
            </div>
            <h1
              className={`${RISE} mt-6 max-w-[600px] font-display text-[clamp(38px,5.4vw,64px)] font-normal leading-[1.1] text-ink`} style={{ animationDelay: "80ms" }}>
              You didn&apos;t start a store to answer the same question{" "}
              <em className="italic text-terracotta">200 times a week.</em>
            </h1>
            <p
              className={`${RISE} mt-[22px] max-w-[520px] font-manrope text-[19px] leading-[1.6] text-warm-body`} style={{ animationDelay: "160ms" }}>
              Plainbot learns your store in minutes and handles the repetitive questions — so you only see the
              ones that actually need you.
            </p>
            <div
              className={`${RISE} mt-[34px] flex flex-wrap items-center gap-5`} style={{ animationDelay: "240ms" }}>
              <Link
                href="/signup?plan=free"
                className="inline-block rounded-full bg-terracotta px-8 py-4 font-manrope text-base font-bold text-cream shadow-[0_14px_28px_-12px_rgba(190,91,55,.55)] transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-terracotta-dark hover:text-cream active:scale-[.97]"
              >
                Start free, no card needed
              </Link>
              <Link
                href="/#demo"
                className="border-b border-ink/30 pb-[3px] font-manrope text-base font-bold text-ink transition-colors duration-200 hover:border-terracotta hover:text-terracotta"
              >
                See how it works
              </Link>
            </div>
            <p
              className={`${RISE} mt-[22px] font-manrope text-[13px] text-warm-muted`} style={{ animationDelay: "320ms" }}>
              Free forever, no card required &nbsp;·&nbsp; Flat $79/mo on Pro, no per-resolution fees
              &nbsp;·&nbsp; Cancel anytime
            </p>
          </div>

          <div
            className={`${RISE} flex max-w-[340px] flex-[1_1_280px] justify-center`} style={{ animationDelay: "300ms", animationDuration: ".9s" }}>
            <div className="w-full max-w-[310px] motion-safe:animate-plnb-float rounded-[20px] border border-ink/[.08] bg-white p-5 shadow-[0_30px_70px_-24px_rgba(43,34,28,.28)]">
              <div className="mb-3.5 flex items-center gap-2 border-b border-ink/[.06] pb-3.5">
                <div className="h-2 w-2 rounded-full bg-sage" />
                <div className="font-manrope text-[13px] font-bold text-ink">Plainbot</div>
                <div className="ml-auto font-manrope text-xs text-warm-muted">Online</div>
              </div>
              <div className="flex flex-col gap-2.5 font-manrope">
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-[14px] bg-ink px-3.5 py-2.5 text-[13px] leading-[1.4] text-cream">
                    Any update on order #4821?
                  </div>
                </div>
                <div className="flex items-end gap-1.5">
                  <div className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-cream">
                    P
                  </div>
                  <div className="max-w-[82%] rounded-[14px] bg-peach px-3.5 py-2.5 text-[13px] leading-[1.4] text-ink">
                    Shipped yesterday — arriving Thu.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Logo strip — generic placeholder marks until real customer logos are approved */}
      <div className="mx-auto mt-12 flex max-w-[1160px] flex-wrap items-center gap-x-8 gap-y-[22px] px-[6vw]">
        <div className="whitespace-nowrap font-manrope text-[13px] font-bold text-warm-muted">
          Built for stores like yours
        </div>
        <div className="flex flex-1 flex-wrap gap-[18px]">
          {PLACEHOLDER_LOGOS.map((logo) => (
            <div
              key={logo.key}
              className="flex h-9 items-center gap-2 text-ink opacity-50"
              aria-hidden
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                {logo.shape}
              </svg>
              <span className={`text-[17px] text-ink ${logo.text}`}>Your logo</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
