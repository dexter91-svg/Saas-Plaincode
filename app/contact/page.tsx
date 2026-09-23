import Link from "next/link";
import LandingNavbar from "@/components/LandingNavbar";
import LandingFooter from "@/components/LandingFooter";
import TestimonialsSection from "@/components/TestimonialsSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Plainbot",
  description: "How to reach Plainbot for enterprise and account questions.",
};

export default function ContactPage() {
  return (
    <>
      <LandingNavbar />
      <main className="bg-cream">
        <section className="px-[6vw] py-16 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-manrope text-sm font-bold uppercase tracking-wider text-terracotta">
              Contact
            </p>
            <h1 className="mt-4 font-display text-3xl text-ink sm:text-4xl">
              Get in touch
            </h1>
            <p className="mt-6 font-manrope text-lg text-warm-body">
              For the Agency plan or other sales questions, see{" "}
              <Link href="/pricing/agency" className="font-semibold text-terracotta hover:text-terracotta-dark">
                Agency plan
              </Link>{" "}
              or email us from that page.
            </p>
          </div>
        </section>
        <TestimonialsSection showHeading />
      </main>
      <LandingFooter />
    </>
  );
}
