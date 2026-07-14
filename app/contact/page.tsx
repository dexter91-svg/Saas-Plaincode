import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TestimonialsSection from "@/components/TestimonialsSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Plainbot",
  description: "How to reach Plainbot for enterprise and account questions.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="bg-black">
        <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
              Contact
            </p>
            <h1 className="mt-4 text-3xl font-bold text-slate-100 sm:text-4xl">
              Get in touch
            </h1>
            <p className="mt-6 text-lg text-slate-400">
              For the Agency plan or other sales questions, see{" "}
              <Link href="/pricing/agency" className="text-primary-400 hover:text-primary-300">
                Agency plan
              </Link>{" "}
              or email us from that page.
            </p>
          </div>
        </section>
        <TestimonialsSection showHeading />
      </main>
      <Footer />
    </>
  );
}
