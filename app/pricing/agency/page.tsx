import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agency plan | Plainbot",
  description:
    "Unlimited conversations, white-label, and API access for agencies managing multiple Shopify stores.",
};

export default function AgencyPricingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[60vh] bg-black">
        <section className="border-b border-slate-800 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">Agency</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-100 sm:text-4xl">
              For agencies & white-label
            </h1>
            <p className="mt-4 text-lg text-slate-400">
              <span className="font-semibold text-slate-200">$299/month</span> — unlimited conversations and
              stores, plus API access and branding control for your clients.
            </p>
            <ul className="mt-10 space-y-4 text-slate-300">
              {[
                "Unlimited conversations per month",
                "Unlimited stores",
                "White-label & custom branding",
                "API access",
                "Built for high-volume and multi-brand teams",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/signup?plan=agency">
                <Button variant="primary" className="min-w-[200px]">
                  Start Agency plan
                </Button>
              </Link>
              <a
                href="mailto:hello@plainbot.io?subject=Agency%20plan%20question"
                className="text-center text-sm text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-300 sm:text-left"
              >
                Questions? Email us
              </a>
            </div>
            <p className="mt-12 text-sm text-slate-500">
              <Link href="/pricing" className="text-primary-400 hover:text-primary-300">
                ← Back to pricing
              </Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
