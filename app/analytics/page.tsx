"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useBot } from "@/components/BotContext";
import { WIZARD_CARD_CLASS } from "@/lib/wizard-ui";

const POLL_INTERVAL_MS = 15_000; // 15 seconds for real-time updates

type DistributionItem = { label: string; type: string; pct: number };

type Analytics = {
  totalForwarded: number;
  percentChange: number;
  sentToEmail: number;
  liveAgentTransfers: number;
  emailPct: number;
  livePct: number;
  distribution: DistributionItem[];
  peakTime: string;
  avgResponseMinutes: number | null;
};

const defaultAnalytics: Analytics = {
  totalForwarded: 0,
  percentChange: 0,
  sentToEmail: 0,
  liveAgentTransfers: 0,
  emailPct: 0,
  livePct: 0,
  distribution: [
    { label: "Refund request", type: "forwarded_email", pct: 0 },
    { label: "Frustrated customer", type: "forwarded_human", pct: 0 },
    { label: "Complex technical issue", type: "escalated", pct: 0 },
    { label: "Out of scope inquiry", type: "other", pct: 0 },
  ],
  peakTime: "—",
  avgResponseMinutes: null,
};

const barColors = ["bg-terracotta", "bg-sage", "bg-amber-400", "bg-warm-muted"];

export default function AnalyticsPage() {
  const { chatbotId } = useBot();
  const [data, setData] = useState<Analytics>(defaultAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = chatbotId ? `?chatbotId=${encodeURIComponent(chatbotId)}` : "";
    const fetchAnalytics = () => {
      fetch(`/api/analytics/forwarded${q}`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to load");
          return r.json();
        })
        .then((json) => {
          setData({
            totalForwarded: json.totalForwarded ?? 0,
            percentChange: json.percentChange ?? 0,
            sentToEmail: json.sentToEmail ?? 0,
            liveAgentTransfers: json.liveAgentTransfers ?? 0,
            emailPct: json.emailPct ?? 0,
            livePct: json.livePct ?? 0,
            distribution: Array.isArray(json.distribution) ? json.distribution : defaultAnalytics.distribution,
            peakTime: json.peakTime ?? "—",
            avgResponseMinutes: json.avgResponseMinutes ?? null,
          });
          setError(null);
        })
        .catch(() => setError("Could not load analytics"))
        .finally(() => setLoading(false));
    };
    setLoading(true);
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [chatbotId]);

  return (
    <AppShell>
      <div className="min-h-full bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <header>
            <h1 className="font-display text-[28px] text-ink">
              Forwarded Conversations Analytics
            </h1>
            <p className="mt-1.5 font-manrope text-sm text-warm-body">
              High-level view of escalations and handoffs from your ecommerce assistant. Updates every 15s.
            </p>
          </header>

          {error && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 font-manrope text-sm text-amber-700">
              {error}
            </p>
          )}

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <div className={`${WIZARD_CARD_CLASS} !rounded-[14px] !p-5`}>
              <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
                Total forwarded
              </p>
              {loading ? (
                <p className="mt-1.5 font-display text-[32px] text-warm-muted">…</p>
              ) : (
                <>
                  <p className="mt-1.5 font-display text-[32px] text-ink">{data.totalForwarded}</p>
                  <p className={`mt-1 font-manrope text-xs ${data.percentChange >= 0 ? "text-sage" : "text-red-600"}`}>
                    {data.percentChange >= 0 ? "+" : ""}{data.percentChange}% vs last week
                  </p>
                </>
              )}
            </div>
            <div className={`${WIZARD_CARD_CLASS} !rounded-[14px] !p-5`}>
              <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
                Sent to email
              </p>
              {loading ? (
                <p className="mt-1.5 font-display text-[32px] text-warm-muted">…</p>
              ) : (
                <>
                  <p className="mt-1.5 font-display text-[32px] text-ink">{data.sentToEmail}</p>
                  <p className="mt-1 font-manrope text-xs text-warm-muted">{data.emailPct}% to support inbox</p>
                </>
              )}
            </div>
            <div className={`${WIZARD_CARD_CLASS} !rounded-[14px] !p-5`}>
              <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
                Live agent transfers
              </p>
              {loading ? (
                <p className="mt-1.5 font-display text-[32px] text-warm-muted">…</p>
              ) : (
                <>
                  <p className="mt-1.5 font-display text-[32px] text-ink">{data.liveAgentTransfers}</p>
                  <p className="mt-1 font-manrope text-xs text-warm-muted">{data.livePct}% direct handoffs</p>
                </>
              )}
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className={`${WIZARD_CARD_CLASS} lg:col-span-2`}>
              <h2 className="font-manrope text-[15px] font-bold text-ink">
                Handoff distribution
              </h2>
              <p className="mt-1 font-manrope text-[13px] text-warm-muted">
                Breakdown of reasons for conversation escalation.
              </p>
              <div className="mt-[18px] space-y-3.5">
                {data.distribution.map((d, i) => (
                  <div key={d.type || i}>
                    <div className="mb-1.5 flex justify-between font-manrope text-[13px] text-ink">
                      <span>{d.label}</span>
                      <span>{d.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-peach">
                      <div
                        className={`h-1.5 rounded-full ${barColors[i % barColors.length]}`}
                        style={{ width: `${Math.min(100, d.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className={`${WIZARD_CARD_CLASS} !rounded-[14px] !p-5`}>
                <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
                  Peak time
                </p>
                <p className="mt-2 font-display text-2xl text-ink">
                  {loading ? "…" : data.peakTime}
                </p>
              </div>
              <div className={`${WIZARD_CARD_CLASS} !rounded-[14px] !p-5`}>
                <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
                  Avg. response time
                </p>
                <p className="mt-2 font-display text-2xl text-ink">
                  {loading ? "…" : data.avgResponseMinutes != null ? `${data.avgResponseMinutes} minutes` : "—"}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
