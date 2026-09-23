"use client";

import Link from "next/link";
import LandingNavbar from "@/components/LandingNavbar";
import LandingFooter from "@/components/LandingFooter";

const CheckIcon = () => (
  <span className="mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-peach text-[11px] font-bold text-terracotta-dark">
    ✓
  </span>
);

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    tagline: "Free forever — no card. Not a trial.",
    features: [
      "100 conversations/month",
      "Plainbot branding on widget",
      "1 store",
      "Website scraping",
      "Basic ticket creation",
      "No card required",
    ],
    cta: "Start free, no card needed",
    href: "/signup?plan=free",
    recommended: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "$79",
    period: "/month",
    tagline: "Self-serve — card only, instant access",
    features: [
      "1,000 conversations/month",
      "Plainbot branding removed",
      "Email forwarding (tickets to your inbox)",
      "3 stores",
      "Priority email support",
    ],
    cta: "Get Growth",
    href: "/signup?plan=growth",
    recommended: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$149",
    period: "/month",
    tagline: "Fully self-serve",
    features: [
      "3,000 conversations/month",
      "Up to 5 stores",
      "Advanced analytics dashboard",
      "Slack notifications",
      "Everything in Growth",
    ],
    cta: "Get Pro",
    href: "/signup?plan=pro",
    recommended: true,
  },
];

export default function PricingPage() {
  return (
    <>
      <LandingNavbar />
      <main className="bg-cream">
        <section className="px-[6vw] py-16 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h1 className="font-display text-[clamp(32px,5vw,48px)] text-ink">
                Simple, transparent pricing
              </h1>
              <p className="mx-auto mt-4 max-w-xl font-manrope text-lg text-warm-body">
                Three plans. Pick what fits your store — upgrade or downgrade anytime.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex h-full flex-col rounded-[20px] bg-white px-8 py-9 font-manrope transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-24px_rgba(43,34,28,.25)] ${
                    plan.recommended ? "border-2 border-terracotta" : "border border-ink/10"
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-[13px] right-7 rounded-full bg-terracotta px-3.5 py-[5px] text-xs font-bold text-cream">
                      Popular
                    </div>
                  )}

                  <h2 className="font-display text-xl text-ink">{plan.name}</h2>
                  <p className="mt-1 font-manrope text-sm text-warm-muted">{plan.tagline}</p>
                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="font-display text-[44px] leading-none text-ink">{plan.price}</span>
                    {plan.period && <span className="text-sm text-warm-muted">{plan.period}</span>}
                  </div>

                  <div className="my-6 h-px bg-ink/[.08]" />

                  <ul className="flex flex-1 flex-col gap-3.5 text-[15px] text-[#4A3F37]">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <CheckIcon />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    className={`mt-7 block rounded-full py-3 text-center text-[15px] font-bold transition-colors duration-200 ${
                      plan.recommended
                        ? "bg-terracotta text-cream hover:bg-terracotta-dark hover:text-cream"
                        : "border border-ink/20 text-ink hover:border-ink"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            <p id="agency-plan" className="mx-auto mt-12 max-w-2xl text-center font-manrope text-sm text-warm-muted">
              Running an agency or need white-label?{" "}
              <Link
                href="/pricing/agency"
                className="font-semibold text-terracotta underline decoration-terracotta/40 underline-offset-4 hover:text-terracotta-dark"
              >
                See Agency plan →
              </Link>
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
