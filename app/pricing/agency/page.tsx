import Link from "next/link";
import LandingNavbar from "@/components/LandingNavbar";
import LandingFooter from "@/components/LandingFooter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agency plan | Plainbot",
  description:
    "Unlimited conversations, white-label, and API access for agencies managing multiple Shopify stores.",
};

export default function AgencyPricingPage() {
  return (
    <>
      <LandingNavbar />
      <main className="min-h-[60vh] bg-cream">
        <section className="px-[6vw] py-16 lg:py-24">
          <div className="mx-auto max-w-2xl">
            <p className="font-manrope text-sm font-bold uppercase tracking-wider text-terracotta">Agency</p>
            <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
              For agencies &amp; white-label
            </h1>
            <p className="mt-4 font-manrope text-lg text-warm-body">
              <span className="font-semibold text-ink">$299/month</span> — unlimited conversations and
              stores, plus API access and branding control for your clients.
            </p>
            <ul className="mt-10 space-y-4 font-manrope text-[#4A3F37]">
              {[
                "Unlimited conversations per month",
                "Unlimited stores",
                "White-label & custom branding",
                "API access",
                "Built for high-volume and multi-brand teams",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/signup?plan=agency"
                className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-terracotta px-6 py-3 font-manrope text-sm font-bold text-cream transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-terracotta-dark hover:shadow-[0_10px_20px_-10px_rgba(190,91,55,.6)] active:scale-[.97]"
              >
                Start Agency plan
              </Link>
              <a
                href="mailto:hello@plainbot.io?subject=Agency%20plan%20question"
                className="text-center font-manrope text-sm text-warm-muted underline decoration-ink/20 underline-offset-4 hover:text-ink sm:text-left"
              >
                Questions? Email us
              </a>
            </div>
            <p className="mt-12 font-manrope text-sm text-warm-muted">
              <Link href="/pricing" className="font-semibold text-terracotta hover:text-terracotta-dark">
                ← Back to pricing
              </Link>
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
