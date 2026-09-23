"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useBot } from "@/components/BotContext";
import { WIZARD_CARD_CLASS, WIZARD_PRIMARY_BUTTON_CLASS, WIZARD_OUTLINE_BUTTON_CLASS } from "@/lib/wizard-ui";

export default function UpgradePage() {
  const { setUserPlan, setConversationRemaining } = useBot();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompleteUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/upgrade-to-pro", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upgrade failed");
      }
      setUserPlan("pro");
      const statsRes = await fetch("/api/conversations/stats");
      if (statsRes.ok) {
        const s = await statsRes.json();
        setConversationRemaining(Math.max(0, s.remaining ?? 0));
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="min-h-full bg-cream">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-display text-[28px] text-ink">Upgrade to Pro</h1>
          <p className="mt-1.5 font-manrope text-sm text-warm-body">
            Pro includes 3,000 conversations per month (see plainbot.io/pricing for Growth and Agency). Your
            dashboard and conversations stay the same.
          </p>

          {done ? (
            <div className={`mt-6 ${WIZARD_CARD_CLASS} border-sage/30 bg-sage/5`}>
              <h2 className="font-manrope text-lg font-bold text-sage">You&apos;re on Pro</h2>
              <p className="mt-2 font-manrope text-sm text-warm-body">
                Your plan is now Pro with 3,000 conversations per month. You can keep using your chatbot as before.
              </p>
              <Link href="/dashboard" className={`mt-4 inline-flex ${WIZARD_PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-sm`}>
                Back to dashboard
              </Link>
            </div>
          ) : (
            <div className={`mt-6 ${WIZARD_CARD_CLASS} border-terracotta/25 bg-terracotta/5`}>
              <h2 className="font-manrope text-lg font-bold text-ink">Payment (Stripe coming soon)</h2>
              <p className="mt-2 font-manrope text-sm text-warm-body">
                We&apos;re adding Stripe so you can pay securely. For now you can complete the upgrade below to
                get Pro access.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCompleteUpgrade}
                  disabled={loading}
                  className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-sm`}
                >
                  {loading ? "Upgrading…" : "Complete upgrade"}
                </button>
                <Link href="/pricing" className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-5 py-2.5 text-sm`}>
                  View pricing
                </Link>
              </div>
              {error && (
                <p className="mt-4 font-manrope text-sm text-red-600">{error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
