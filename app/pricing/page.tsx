"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import Card from "@/components/Card";

const CheckIcon = () => (
  <svg className="h-5 w-5 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
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
    variant: "outline" as const,
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
    variant: "primary" as const,
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
    variant: "primary" as const,
    recommended: true,
  },
];

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="bg-black">
        <section className="border-b border-slate-800 bg-black px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl lg:text-5xl">
                Simple, transparent pricing
              </h1>
              <p className="mt-4 max-w-xl mx-auto text-lg text-slate-400">
                Three plans. Pick what fits your store — upgrade or downgrade anytime.
              </p>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {PLANS.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative flex h-full flex-col overflow-hidden ${
                    plan.recommended
                      ? "ring-2 ring-primary-500 shadow-soft-lg bg-slate-800/80 border-primary-500/50"
                      : "border-slate-700 bg-slate-800/60"
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-primary-600" />
                  )}
                  {plan.recommended && (
                    <div className="absolute top-4 right-4">
                      <span className="rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white">
                        Popular
                      </span>
                    </div>
                  )}
                  <div className="pt-6 pb-2">
                    <h2 className="text-xl font-bold text-slate-100">{plan.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight text-slate-100">{plan.price}</span>
                      {plan.period && <span className="text-slate-500">{plan.period}</span>}
                    </div>
                  </div>
                  <ul className="space-y-3 border-t border-slate-700 py-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-slate-300">
                        <CheckIcon />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-4">
                    <Link href={plan.href} className="block">
                      <Button
                        variant={plan.variant}
                        fullWidth
                        className={plan.recommended ? "shadow-soft" : ""}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>

            <p
              id="agency-plan"
              className="mx-auto mt-12 max-w-2xl text-center text-sm text-slate-500"
            >
              Running an agency or need white-label?{" "}
              <Link
                href="/pricing/agency"
                className="text-primary-400 underline decoration-primary-500/40 underline-offset-4 hover:text-primary-300"
              >
                See Agency plan →
              </Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
