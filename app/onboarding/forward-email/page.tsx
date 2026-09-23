"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import WizardHeader from "@/components/WizardHeader";
import { WIZARD_CARD_CLASS, WIZARD_INPUT_CLASS, WIZARD_PRIMARY_BUTTON_CLASS } from "@/lib/wizard-ui";

export default function ForwardEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/users/store-type").then((r) => r.json()),
      fetch("/api/users/forward-email").then((r) => r.json()),
    ])
      .then(([storeData, emailData]) => {
        if (!storeData.storeType) {
          router.replace("/onboarding/store-type");
          return;
        }
        if (emailData.forwardEmail) {
          router.replace("/create-bot");
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users/forward-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forwardEmail: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save.");
        setLoading(false);
        return;
      }
      router.push("/create-bot");
    } catch {
      setError("Failed to save. Try again.");
      setLoading(false);
    }
  };

  const gradientBg = {
    backgroundImage: "radial-gradient(120% 70% at 15% 0%, #F3E3D6 0%, #FBF7F2 55%)",
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream" style={gradientBg}>
        <p className="font-manrope text-sm text-warm-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream" style={gradientBg}>
      <WizardHeader />

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6 sm:py-12 lg:px-8">
        <div className="w-full max-w-md pb-8">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl italic text-ink sm:text-4xl">
              Where should we send forwarded conversations?
            </h1>
            <p className="mt-2.5 font-manrope text-sm text-warm-body">
              When the AI can&apos;t help (e.g. order cancellation), we&apos;ll forward the full conversation to
              this email. You can reply and the customer will see it in chat.
            </p>
          </div>

          <div className={WIZARD_CARD_CLASS}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="block font-manrope text-sm font-semibold text-ink">Support email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="support@yourstore.com"
                  autoComplete="email"
                  enterKeyHint="done"
                  inputMode="email"
                  className={`mt-1.5 ${WIZARD_INPUT_CLASS}`}
                  required
                />
              </label>
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-manrope text-sm text-red-600">
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading} className={`w-full ${WIZARD_PRIMARY_BUTTON_CLASS} py-3.5 text-[15px]`}>
                {loading ? "Saving…" : "Continue"}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center font-manrope text-sm text-warm-muted">
            You can change this later in Settings.
          </p>
        </div>
      </main>
    </div>
  );
}
