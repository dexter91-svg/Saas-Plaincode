import Link from "next/link";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import Card from "@/components/Card";
import AiDemoSection from "@/components/AiDemoSection";
import LandingChatSection from "@/components/LandingChatSection";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import AnimatedSection from "@/components/AnimatedSection";
import FoundingOfferBlock from "@/components/FoundingOfferBlock";
import TestimonialsSection from "@/components/TestimonialsSection";
import { formatFoundingOfferClosingDate, getFoundingOfferEndMs } from "@/lib/founding-offer";

export default function HomePage() {
  const foundingCloseLabel = formatFoundingOfferClosingDate(getFoundingOfferEndMs());
  const faqItems: { q: string; a: string }[] = [
    {
      q: "How long does setup take?",
      a: "Most stores are live in under 10 minutes. Paste your URL, we read your store automatically, add one script tag to your site, done.",
    },
    {
      q: "Does it work with Shopify and WooCommerce?",
      a: "Yes. Both platforms fully supported. One-click install for Shopify via the App Store. One script tag for WooCommerce.",
    },
    {
      q: "What happens when the bot can't answer something?",
      a: "It creates a support ticket automatically and forwards the full conversation to your email. Your team only sees what actually needs a human.",
    },
    {
      q: "Can I customise the chatbot's personality and tone?",
      a: "Yes. Set your tone, add custom FAQs, match your brand colours — all from your dashboard in minutes.",
    },
    {
      q: "What happens when I hit my conversation limit?",
      a: "You get an in-app notification before you hit the limit. Upgrade in one click, no call required, instant access.",
    },
    {
      q: "Is there a contract?",
      a: "No. Monthly subscription. Cancel anytime from your dashboard.",
    },
    {
      q: "Will it really learn my whole store?",
      a: "Yes. Paste your store URL and Plainbot reads every product page, your returns policy, shipping info, FAQs — everything publicly visible on your site. Takes under 2 minutes.",
    },
    {
      q: "What is founding member pricing?",
      a: `Early customers lock in a discounted rate for life — even when we raise prices. $79/month Growth tier stays at $79 forever for founding members. Closes on ${foundingCloseLabel}.`,
    },
  ];

  return (
    <>
      <main>
        {/* Hero — above the fold: headline, subhead, single CTA only (no global nav) */}
        <HeroSection />

        <StatsBar />

        {/* How It Works */}
        <section id="how-it-works" className="border-b border-slate-800 bg-black px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <AnimatedSection variant="fade-up" className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                How It Works
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-100 sm:text-4xl">
                Go live in 3 steps
              </h2>
            </AnimatedSection>
            <div className="mx-auto mt-12 grid w-full max-w-6xl grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-8 lg:gap-10">
              {[
                {
                  step: 1,
                  title: "Paste your store URL",
                  description:
                    "Plainbot reads your entire store automatically. Products, policies, FAQs — all of it. Done in under 2 minutes.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  ),
                },
                {
                  step: 2,
                  title: "Customise in 5 minutes",
                  description:
                    "Set your tone, add custom FAQs, choose your brand colours. No coding. No technical setup. Just your preferences.",
                  icon: (
                    <>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </>
                  ),
                },
                {
                  step: 3,
                  title: "Go live instantly",
                  description:
                    "Add one line of code. Your AI support agent is live immediately.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  ),
                },
              ].map((item, idx) => (
                <AnimatedSection
                  key={item.step}
                  variant="fade-up"
                  delay={150 + idx * 100}
                  className="w-full min-w-0"
                >
                  <div className="flex w-full min-w-0 flex-col items-center text-center sm:items-start sm:text-left">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white shadow-soft transition-transform hover:scale-110">
                      {item.step}
                    </div>
                    <Card className="mt-4 flex-1 w-full transition-all hover:border-primary-500/30 hover:shadow-soft-lg">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20 text-primary-400">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          {item.icon}
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-100">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-slate-400">{item.description}</p>
                    </Card>
                  </div>
                </AnimatedSection>
              ))}
            </div>
            <AnimatedSection variant="fade-up" delay={500}>
              <p className="mx-auto mt-12 max-w-2xl text-center text-lg font-bold text-slate-100">
                Most stores go from signup to live chatbot in under 10 minutes.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* AI Demo — high-intent proof early (before features & pricing) */}
        <AiDemoSection />

        {/* Features */}
        <section
          id="features"
          className="border-t border-slate-800 bg-black px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <AnimatedSection variant="fade-up">
              <h2 className="text-3xl font-bold text-slate-100 sm:text-4xl">
                Everything you need to automate support
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-slate-400">
                Stop drowning in tickets. Get a world-class support layer for a fraction of the cost.
              </p>
            </AnimatedSection>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Learns Your Entire Store",
                  description:
                    "Plainbot reads your products, policies, pricing, and FAQs automatically. It knows your store better than most of your staff within minutes.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                    />
                  ),
                },
                {
                  title: "Answers Every Question 24/7",
                  description:
                    "Handles returns, order tracking, shipping questions, product queries — automatically. In any language. At any hour.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  ),
                },
                {
                  title: "Smart Ticket Creation",
                  description:
                    "Complex issues get automatically escalated. Your team only sees what actually needs a human. Everything routine gets handled without you.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                    />
                  ),
                },
                {
                  title: "Recovers Abandoned Conversations",
                  description:
                    "Customers browsing at 2am get instant answers instead of silence. Buying questions get answered. Sales that would have been lost get saved.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  ),
                },
                {
                  title: "Full Conversation Forwarding",
                  description:
                    "Every conversation forwarded to your inbox with full history. Stay in the loop without doing the work.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  ),
                },
                {
                  title: "Live in 10 Minutes",
                  description:
                    "One script tag. No coding. No complex setup. No onboarding calls. Just paste and go.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  ),
                },
              ].map((f, idx) => (
                <AnimatedSection key={f.title} variant="fade-up" delay={100 + idx * 80}>
                  <Card className="h-full transition-all hover:scale-[1.02] hover:border-primary-500/30 hover:shadow-soft-lg">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20 text-primary-400">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        {f.icon}
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-slate-400">{f.description}</p>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Live chat + dashboard preview */}
        <LandingChatSection />

        <TestimonialsSection />

        {/* Pricing */}
        <section id="pricing" className="relative border-t border-slate-800 bg-slate-900/30 px-4 py-16 sm:px-6 lg:px-8 lg:py-24 overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-primary-500/5 blur-[120px]" />
          </div>
          <div className="relative mx-auto max-w-7xl">
            <AnimatedSection variant="fade-up">
              <h2 className="text-3xl font-bold text-slate-100 sm:text-4xl">
                Transparent pricing
              </h2>
              <p className="mt-4 text-lg text-slate-400">
                The free tier doesn&apos;t expire. Scale to Growth or Pro when you&apos;re ready.
              </p>
            </AnimatedSection>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {[
                {
                  name: "Free",
                  sub: "",
                  price: "$0",
                  period: "/mo",
                  features: [
                    "100 conversations/month",
                    "1 store · widget branding",
                    "Website scraping & basic tickets",
                    "No card · free forever",
                  ],
                  cta: "Start free, no card needed",
                  href: "/signup?plan=free",
                  variant: "outline" as const,
                  recommended: false,
                },
                {
                  name: "Growth",
                  sub: "",
                  price: "$79",
                  period: "/mo",
                  features: [
                    "1,000 conversations/month",
                    "Branding removed · email forwarding",
                    "3 stores · priority email support",
                    "Card only · instant access",
                  ],
                  cta: "Get Growth",
                  href: "/signup?plan=growth",
                  variant: "primary" as const,
                  recommended: false,
                },
                {
                  name: "Pro",
                  sub: "",
                  price: "$149",
                  period: "/mo",
                  features: [
                    "3,000 conversations/month",
                    "Up to 5 stores",
                    "Analytics · Slack notifications",
                    "Everything in Growth",
                  ],
                  cta: "Get Pro",
                  href: "/signup?plan=pro",
                  variant: "primary" as const,
                  recommended: true,
                },
              ].map((plan, idx) => (
                <AnimatedSection
                  key={plan.name}
                  variant="scale-in"
                  delay={150 + idx * 100}
                  className="flex h-full flex-col"
                >
                <Card
                  className={`relative flex h-full flex-col transition-all hover:scale-[1.02] ${
                    plan.recommended
                      ? "ring-2 ring-primary-500 shadow-soft-lg"
                      : ""
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white">
                      Recommended
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-100">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-slate-400">{plan.period}</span>
                    )}
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-100">
                    {plan.name}
                    {plan.sub && (
                      <span className="ml-2 text-sm font-normal text-slate-400">
                        ({plan.sub})
                      </span>
                    )}
                  </h3>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-slate-400"
                      >
                        <svg
                          className="h-5 w-5 shrink-0 text-primary-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto shrink-0 pt-8">
                    <Link href={plan.href}>
                      <Button
                        variant={plan.variant}
                        fullWidth
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </div>
                </Card>
                </AnimatedSection>
              ))}
            </div>

            <FoundingOfferBlock />

            <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-slate-500">
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

        {/* FAQ */}
        <section
          id="faq"
          className="border-t border-slate-800 bg-slate-950/40 px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
        >
          <div className="mx-auto max-w-3xl">
            <AnimatedSection variant="fade-up">
              <h2 className="text-3xl font-bold text-slate-100 sm:text-4xl">Common questions</h2>
            </AnimatedSection>
            <ul className="mt-10 space-y-10">
              {faqItems.map((item) => (
                <li key={item.q}>
                  <h3 className="text-lg font-semibold text-slate-100">{item.q}</h3>
                  <p className="mt-2 text-slate-400 leading-relaxed">{item.a}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="relative border-t border-slate-800 bg-black px-4 py-16 sm:px-6 lg:px-8 lg:py-20 overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-primary-500/10 blur-[120px] animate-glow-pulse" />
          </div>
          <AnimatedSection variant="fade-up" className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-slate-100 sm:text-4xl text-balance">
              Your store is answering customer questions right now. Is it doing it automatically?
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Join 200+ Shopify and WooCommerce stores running support on autopilot.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup?plan=free">
                <Button variant="primary" className="min-w-[200px] transition-transform hover:scale-105 active:scale-95">
                  Start free — no card needed
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              Founding member pricing ends {foundingCloseLabel}. $79/month locked forever.
            </p>
          </AnimatedSection>
        </section>
      </main>

      <Footer />
    </>
  );
}
