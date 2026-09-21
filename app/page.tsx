import Link from "next/link";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import Card from "@/components/Card";
import AiDemoSection from "@/components/AiDemoSection";
import LandingChatSection from "@/components/LandingChatSection";
import HeroSection from "@/components/HeroSection";
import DemoSection from "@/components/DemoSection";
import StepsSection from "@/components/StepsSection";
import PricingSection from "@/components/PricingSection";
import LandingNavbar from "@/components/LandingNavbar";
import StatsBar from "@/components/StatsBar";
import AnimatedSection from "@/components/AnimatedSection";
import TestimonialsSection from "@/components/TestimonialsSection";

export default function HomePage() {
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
      q: "Can I upgrade or downgrade anytime?",
      a: "Yes. You can switch plans or cancel your subscription anytime directly from your dashboard in one click.",
    },
  ];

  return (
    <div className="landing-light min-h-screen">
      <LandingNavbar />
      <main>
        {/* Hero — above the fold: headline, subhead, single CTA only */}
        <HeroSection />

        <DemoSection />

        <StepsSection />

        <PricingSection />

        <StatsBar />

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
              Automate support for your Shopify, WooCommerce, or custom web store today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup?plan=free">
                <Button variant="primary" className="min-w-[200px] transition-transform hover:scale-105 active:scale-95">
                  Start free — no card needed
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              100 free conversations per month · No credit card required.
            </p>
          </AnimatedSection>
        </section>
      </main>

      <Footer />
    </div>
  );
}
