"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import { useBot } from "@/components/BotContext";

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

const barColors = ["bg-primary-500", "bg-orange-400", "bg-sky-400", "bg-slate-500"];

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
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Forwarded Conversations Analytics
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              High-level view of escalations and handoffs from your ecommerce assistant. Updates every 15s.
            </p>
          </div>
        </header>

        {error && (
          <p className="rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-400">{error}</p>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="bg-slate-900/80">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Total forwarded
            </p>
            {loading ? (
              <p className="mt-3 text-3xl font-semibold text-slate-400">…</p>
            ) : (
              <>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{data.totalForwarded}</p>
                <p className={`mt-1 text-xs ${data.percentChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {data.percentChange >= 0 ? "+" : ""}{data.percentChange}% vs last week
                </p>
              </>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Total escalations this week
            </p>
          </Card>
          <Card className="bg-slate-900/80">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Sent to email
            </p>
            {loading ? (
              <p className="mt-3 text-3xl font-semibold text-slate-400">…</p>
            ) : (
              <>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{data.sentToEmail}</p>
                <p className="mt-1 text-xs text-slate-400">{data.emailPct}% to support inbox</p>
              </>
            )}
          </Card>
          <Card className="bg-slate-900/80">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Live agent transfers
            </p>
            {loading ? (
              <p className="mt-3 text-3xl font-semibold text-slate-400">…</p>
            ) : (
              <>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{data.liveAgentTransfers}</p>
                <p className="mt-1 text-xs text-slate-400">{data.livePct}% direct handoffs</p>
              </>
            )}
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 bg-slate-900/80">
            <h2 className="text-sm font-semibold text-slate-100">
              Handoff distribution
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Breakdown of reasons for conversation escalation.
            </p>
            <div className="mt-5 space-y-4 text-xs text-slate-300">
              {data.distribution.map((d, i) => (
                <div key={d.type || i}>
                  <div className="flex justify-between">
                    <span>{d.label}</span>
                    <span className="text-slate-400">{d.pct}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-800">
                    <div
                      className={`h-2 rounded-full ${barColors[i % barColors.length]}`}
                      style={{ width: `${Math.min(100, d.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="bg-slate-900/80">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Peak time
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-50">
                {loading ? "…" : data.peakTime}
              </p>
            </Card>
            <Card className="bg-slate-900/80">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Avg. response time
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-50">
                {loading ? "…" : data.avgResponseMinutes != null ? `${data.avgResponseMinutes} minutes` : "—"}
              </p>
            </Card>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
