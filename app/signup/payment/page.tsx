"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Logo from "@/components/Logo";

const COPY: Record<string, { title: string; blurb: string; charge: string; cta: string }> = {
  growth: {
    title: "Complete Growth checkout",
    blurb: "Growth: $79/month. After payment you can connect stores and remove widget branding.",
    charge: "Your card will be charged $79 now and each month until you cancel.",
    cta: "Pay $79/month with Stripe",
  },
  pro: {
    title: "Complete Pro checkout",
    blurb: "Pro: $149/month — more conversations, more stores, analytics, and Slack.",
    charge: "Your card will be charged $149 now and each month until you cancel.",
    cta: "Pay $149/month with Stripe",
  },
  agency: {
    title: "Complete Agency checkout",
    blurb: "Agency: $299/month — unlimited usage, white-label, API, unlimited stores.",
    charge: "Your card will be charged $299 now and each month until you cancel.",
    cta: "Pay $299/month with Stripe",
  },
};

function PaymentInner() {
  const searchParams = useSearchParams();
  const planParam = ((searchParams?.get("plan") || "growth") as string).toLowerCase();
  const plan = planParam === "pro" || planParam === "agency" ? planParam : "growth";
  const copy = COPY[plan] ?? COPY.growth;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayWithStripe = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not start checkout. Try again.");
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Invalid response from server.");
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md p-6 shadow-soft-lg sm:p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-100">{copy.title}</h1>
        <p className="mt-2 text-slate-400">{copy.blurb}</p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
        <p className="text-sm text-slate-400">{copy.charge}</p>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="primary"
        fullWidth
        className="mt-6"
        disabled={loading}
        onClick={handlePayWithStripe}
      >
        {loading ? "Redirecting…" : copy.cta}
      </Button>
    </Card>
  );
}

export default function SignupPaymentPage() {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <header className="border-b border-slate-800 bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-slate-100">
            <Logo size="md" />
            <span className="text-base font-semibold sm:text-lg">Plainbot</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6 sm:py-12 lg:px-8">
        <Suspense
          fallback={
            <p className="text-slate-400">Loading…</p>
          }
        >
          <PaymentInner />
        </Suspense>
      </main>

      <footer className="py-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Plainbot. All rights reserved.
      </footer>
    </div>
  );
}
