"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useBot } from "@/components/BotContext";

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
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-100">Upgrade to Pro</h1>
        <p className="mt-1 text-slate-400">
          Pro includes 3,000 conversations per month (see plainbot.io/pricing for Growth and Agency). Your dashboard and conversations stay the same.
        </p>

        {done ? (
          <Card className="mt-8 border-emerald-500/30 bg-emerald-500/10">
            <h2 className="text-lg font-semibold text-emerald-400">You&apos;re on Pro</h2>
            <p className="mt-2 text-slate-300">
              Your plan is now Pro with 3,000 conversations per month. You can keep using your chatbot as before.
            </p>
            <Link href="/dashboard" className="mt-4 inline-block">
              <Button variant="primary">Back to dashboard</Button>
            </Link>
          </Card>
        ) : (
          <Card className="mt-8 border-primary-500/30 bg-primary-500/5">
            <h2 className="text-lg font-semibold text-slate-200">Payment (Stripe coming soon)</h2>
            <p className="mt-2 text-slate-400">
              We&apos;re adding Stripe so you can pay securely. For now you can complete the upgrade below to get Pro access.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Button
                variant="primary"
                onClick={handleCompleteUpgrade}
                disabled={loading}
              >
                {loading ? "Upgrading…" : "Complete upgrade"}
              </Button>
              <Link href="/pricing">
                <Button variant="ghost" className="text-slate-300">
                  View pricing
                </Button>
              </Link>
            </div>
            {error && (
              <p className="mt-4 text-sm text-red-400">{error}</p>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
