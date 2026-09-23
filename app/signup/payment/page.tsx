"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import WizardHeader from "@/components/WizardHeader";
import { WIZARD_CARD_CLASS, WIZARD_PRIMARY_BUTTON_CLASS } from "@/lib/wizard-ui";

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
    <div className={`w-full max-w-md ${WIZARD_CARD_CLASS} sm:p-8`}>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl italic text-ink">{copy.title}</h1>
        <p className="mt-2.5 font-manrope text-sm text-warm-body">{copy.blurb}</p>
      </div>

      <div className="rounded-[10px] border border-ink/[.08] bg-cream p-4 text-center">
        <p className="font-manrope text-sm text-warm-body">{copy.charge}</p>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-manrope text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={handlePayWithStripe}
        className={`mt-6 w-full ${WIZARD_PRIMARY_BUTTON_CLASS} py-3.5 text-[15px]`}
      >
        {loading ? "Redirecting…" : copy.cta}
      </button>
    </div>
  );
}

export default function SignupPaymentPage() {
  return (
    <div
      className="flex min-h-screen flex-col bg-cream"
      style={{
        backgroundImage: "radial-gradient(120% 70% at 15% 0%, #F3E3D6 0%, #FBF7F2 55%)",
      }}
    >
      <WizardHeader />

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6 sm:py-12 lg:px-8">
        <Suspense fallback={<p className="font-manrope text-sm text-warm-muted">Loading…</p>}>
          <PaymentInner />
        </Suspense>
      </main>

      <footer className="py-4 text-center font-manrope text-sm text-warm-muted">
        © {new Date().getFullYear()} Plainbot. All rights reserved.
      </footer>
    </div>
  );
}
