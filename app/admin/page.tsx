"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WIZARD_CARD_CLASS } from "@/lib/wizard-ui";
import SignupsTrendChart, { type TrendPoint } from "@/components/SignupsTrendChart";
import DonutChart from "@/components/DonutChart";
import ChurnTrendChart from "@/components/ChurnTrendChart";
import AnimatedNumber from "@/components/AnimatedNumber";
import FunnelChart from "@/components/FunnelChart";

// Stronger border than the shared WIZARD_CARD_CLASS default (border-ink/[.08] reads as
// nearly invisible on this page's cream background) - kept local so it doesn't change
// card borders on every other page that reuses WIZARD_CARD_CLASS.
const CARD_CLASS = `${WIZARD_CARD_CLASS} !border-ink/[.15] shadow-[0_4px_20px_-8px_rgba(43,34,28,.12)]`;

type SignupsTrend = {
  hourlyToday: { hour: number; count: number }[];
  daily30d: { date: string; count: number }[];
  monthly: { month: string; count: number }[];
};

type ActivationsTrend = {
  daily30d: { date: string; count: number }[];
  monthly: { month: string; count: number }[];
};

type CustomerMix = Record<"7d" | "30d" | "all", { free: number; paying: number }>;

type ChurnTrend = {
  daily30d: { date: string; count: number }[];
  monthly: { month: string; count: number }[];
};

type Overview = {
  signups: { today: number; last7d: number; last30d: number; allTime: number };
  activeChatbots: number;
  activatedUsers: number;
  payingByPlan: { growth: number; pro: number; agency: number };
  totalPaying: number;
  totalChurned: number;
  churnedThisMonth: number;
  conversionRate: number;
  avgDaysToConvert: number | null;
  churnRate: number;
  recentlyChurned: { email: string; date: string }[];
  signupsTrend: SignupsTrend;
  activationsTrend: ActivationsTrend;
  customerMix: CustomerMix;
  churnTrend: ChurnTrend;
};

const defaultOverview: Overview = {
  signups: { today: 0, last7d: 0, last30d: 0, allTime: 0 },
  activeChatbots: 0,
  activatedUsers: 0,
  payingByPlan: { growth: 0, pro: 0, agency: 0 },
  totalPaying: 0,
  totalChurned: 0,
  churnedThisMonth: 0,
  conversionRate: 0,
  avgDaysToConvert: null,
  churnRate: 0,
  recentlyChurned: [],
  signupsTrend: { hourlyToday: [], daily30d: [], monthly: [] },
  activationsTrend: { daily30d: [], monthly: [] },
  customerMix: { "7d": { free: 0, paying: 0 }, "30d": { free: 0, paying: 0 }, all: { free: 0, paying: 0 } },
  churnTrend: { daily30d: [], monthly: [] },
};

type RangeFilter = "7d" | "30d" | "all";

const RANGE_OPTIONS: { value: RangeFilter; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All-time" },
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function sumChurnForRange(trend: ChurnTrend, range: RangeFilter): number {
  if (range === "7d") {
    return trend.daily30d.slice(-7).reduce((sum, d) => sum + d.count, 0);
  }
  if (range === "30d") {
    return trend.daily30d.reduce((sum, d) => sum + d.count, 0);
  }
  return trend.monthly.reduce((sum, m) => sum + m.count, 0);
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Overview>(defaultOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "funnel">("overview");
  const tabRefs = { overview: useRef<HTMLButtonElement>(null), funnel: useRef<HTMLButtonElement>(null) };
  const [showAllChurned, setShowAllChurned] = useState(false);
  const [churnScrollable, setChurnScrollable] = useState(false);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    const btn = tabRefs[tab].current;
    if (btn) setPillStyle({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [tab]);

  const [range, setRange] = useState<RangeFilter>("30d");
  const [mixRange, setMixRange] = useState<RangeFilter>("30d");
  const [churnRange, setChurnRange] = useState<RangeFilter>("30d");
  const [churnStatRange, setChurnStatRange] = useState<RangeFilter>("30d");

  useEffect(() => {
    fetch("/api/admin/analytics/overview")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((json) => {
        setData({
          signups: json.signups ?? defaultOverview.signups,
          activeChatbots: json.activeChatbots ?? 0,
          activatedUsers: json.activatedUsers ?? 0,
          payingByPlan: json.payingByPlan ?? defaultOverview.payingByPlan,
          totalPaying: json.totalPaying ?? 0,
          totalChurned: json.totalChurned ?? 0,
          churnedThisMonth: json.churnedThisMonth ?? 0,
          conversionRate: json.conversionRate ?? 0,
          avgDaysToConvert: json.avgDaysToConvert ?? null,
          churnRate: json.churnRate ?? 0,
          recentlyChurned: json.recentlyChurned ?? [],
          signupsTrend: json.signupsTrend ?? defaultOverview.signupsTrend,
          activationsTrend: json.activationsTrend ?? defaultOverview.activationsTrend,
          customerMix: json.customerMix ?? defaultOverview.customerMix,
          churnTrend: json.churnTrend ?? defaultOverview.churnTrend,
        });
        setError(null);
      })
      .catch(() => setError("Could not load analytics"))
      .finally(() => setLoading(false));
  }, []);

  const chart: { points: TrendPoint[]; labelEvery: number } = useMemo(() => {
    if (range === "7d") {
      const last7 = data.signupsTrend.daily30d.slice(-7);
      return {
        labelEvery: 1,
        points: last7.map((d) => {
          const date = new Date(d.date + "T00:00:00");
          return {
            label: WEEKDAY_LABELS[date.getDay()],
            tooltipLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            value: d.count,
          };
        }),
      };
    }
    if (range === "30d") {
      return {
        labelEvery: 5,
        points: data.signupsTrend.daily30d.map((d) => {
          const date = new Date(d.date + "T00:00:00");
          return {
            label: date.getDate().toString(),
            tooltipLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            value: d.count,
          };
        }),
      };
    }
    return {
      labelEvery: 1,
      points: data.signupsTrend.monthly.map((m) => {
        const [, monthStr] = m.month.split("-");
        const monthIdx = parseInt(monthStr, 10) - 1;
        return {
          label: MONTH_LABELS[monthIdx] ?? m.month,
          tooltipLabel: m.month,
          value: m.count,
        };
      }),
    };
  }, [range, data.signupsTrend]);

  const activationChart: TrendPoint[] = useMemo(() => {
    if (range === "7d") {
      return data.activationsTrend.daily30d.slice(-7).map((d) => {
        const date = new Date(d.date + "T00:00:00");
        return {
          label: WEEKDAY_LABELS[date.getDay()],
          tooltipLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          value: d.count,
        };
      });
    }
    if (range === "30d") {
      return data.activationsTrend.daily30d.map((d) => {
        const date = new Date(d.date + "T00:00:00");
        return {
          label: date.getDate().toString(),
          tooltipLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          value: d.count,
        };
      });
    }
    return data.activationsTrend.monthly.map((m) => {
      const [, monthStr] = m.month.split("-");
      const monthIdx = parseInt(monthStr, 10) - 1;
      return {
        label: MONTH_LABELS[monthIdx] ?? m.month,
        tooltipLabel: m.month,
        value: m.count,
      };
    });
  }, [range, data.activationsTrend]);

  const churnChart: { points: TrendPoint[]; labelEvery: number } = useMemo(() => {
    if (churnRange === "7d") {
      const last7 = data.churnTrend.daily30d.slice(-7);
      return {
        labelEvery: 1,
        points: last7.map((d) => {
          const date = new Date(d.date + "T00:00:00");
          return {
            label: WEEKDAY_LABELS[date.getDay()],
            tooltipLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            value: d.count,
          };
        }),
      };
    }
    if (churnRange === "30d") {
      return {
        labelEvery: 5,
        points: data.churnTrend.daily30d.map((d) => {
          const date = new Date(d.date + "T00:00:00");
          return {
            label: date.getDate().toString(),
            tooltipLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            value: d.count,
          };
        }),
      };
    }
    return {
      labelEvery: 1,
      points: data.churnTrend.monthly.map((m) => {
        const [, monthStr] = m.month.split("-");
        const monthIdx = parseInt(monthStr, 10) - 1;
        return {
          label: MONTH_LABELS[monthIdx] ?? m.month,
          tooltipLabel: m.month,
          value: m.count,
        };
      }),
    };
  }, [churnRange, data.churnTrend]);

  return (
    <div className="min-h-full bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-ink">Founder Analytics</h1>
            <p className="mt-1 font-manrope text-sm text-warm-body">
              Signups, activation, conversion and churn at a glance.
            </p>
          </div>
          <div className="relative flex items-center gap-1 rounded-full bg-cream-alt p-1">
            {/* Measured sliding pill */}
            {pillStyle.width > 0 && (
              <div
                className="pointer-events-none absolute inset-y-1 rounded-full bg-peach"
                style={{
                  left: pillStyle.left,
                  width: pillStyle.width,
                  transition: "left 0.3s cubic-bezier(.4,0,.2,1), width 0.3s cubic-bezier(.4,0,.2,1)",
                }}
              />
            )}
            {(["overview", "funnel"] as const).map((t) => (
              <button
                key={t}
                ref={tabRefs[t]}
                type="button"
                onClick={() => setTab(t)}
                className={`relative z-10 whitespace-nowrap rounded-full px-4 py-1.5 font-manrope text-sm font-bold transition-colors duration-300 ${
                  tab === t ? "text-terracotta" : "text-warm-muted hover:text-ink"
                }`}
              >
                {t === "overview" ? "Overview" : "Funnel & Conversion"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 font-manrope text-sm text-amber-700">
            {error}
          </p>
        )}

        <div className="mt-4 overflow-hidden">
        <div
          className="flex"
          style={{
            transform: tab === "overview" ? "translateX(0%)" : "translateX(-50%)",
            transition: "transform 0.35s cubic-bezier(.4,0,.2,1)",
            width: "200%",
          }}
        >

        {/* ── Overview tab ── */}
        <div style={{ width: "50%", flexShrink: 0 }}>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`${CARD_CLASS} !rounded-[14px] !p-4`}>
            <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
              Total signups
            </p>
            {loading ? (
              <p className="mt-1 font-display text-[26px] text-warm-muted">…</p>
            ) : (
              <>
                <p className="mt-1 font-display text-[26px] text-ink">
                  <AnimatedNumber value={data.signups.allTime} />
                </p>
                <p className="mt-1 font-manrope text-xs text-warm-muted">All-time</p>
              </>
            )}
          </div>

          <div className={`${CARD_CLASS} !rounded-[14px] !p-4`}>
            <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
              Active chatbots
            </p>
            {loading ? (
              <p className="mt-1 font-display text-[26px] text-warm-muted">…</p>
            ) : (
              <>
                <p className="mt-1 font-display text-[26px] text-ink">
                  <AnimatedNumber value={data.activeChatbots} />
                </p>
                <p className="mt-1 font-manrope text-xs text-warm-muted">Bot live and answering</p>
              </>
            )}
          </div>

          <div className={`${CARD_CLASS} !rounded-[14px] !p-4`}>
            <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
              Paying customers
            </p>
            {loading ? (
              <p className="mt-1 font-display text-[26px] text-warm-muted">…</p>
            ) : (
              <>
                <p className="mt-1 font-display text-[26px] text-ink">
                  <AnimatedNumber value={data.totalPaying} />
                </p>
                <p className="mt-1 font-manrope text-xs text-warm-muted">
                  Pro {data.totalPaying} · Free {Math.max(0, data.signups.allTime - data.totalPaying)}
                </p>
              </>
            )}
          </div>

          <div className={`${CARD_CLASS} !rounded-[14px] !p-4`}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
                Churned
              </p>
              <div className="flex items-center gap-0.5 rounded-full bg-cream-alt p-0.5">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setChurnStatRange(opt.value)}
                    className={`rounded-full px-1.5 py-0.5 font-manrope text-[9px] font-bold transition-colors ${
                      churnStatRange === opt.value ? "bg-peach text-terracotta" : "text-warm-muted hover:text-ink"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <p className="mt-1 font-display text-[26px] text-warm-muted">…</p>
            ) : (
              <>
                <p className="mt-1 font-display text-[26px] text-ink">
                  <AnimatedNumber value={sumChurnForRange(data.churnTrend, churnStatRange)} />
                </p>
                <p className="mt-1 font-manrope text-xs text-warm-muted">Previously paying, now free</p>
              </>
            )}
          </div>
        </section>

        <section className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className={`${CARD_CLASS} !p-5 lg:col-span-2`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-manrope text-[15px] font-bold text-ink">Signups over time</h2>
                <p className="mt-1 font-manrope text-[13px] text-warm-muted">
                  Hover the chart for exact values.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-cream-alt p-1">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRange(opt.value)}
                    className={`rounded-full px-3 py-1 font-manrope text-xs font-bold transition-colors ${
                      range === opt.value ? "bg-peach text-terracotta" : "text-warm-muted hover:text-ink"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              {loading ? (
                <div style={{ height: 190 }} className="flex items-center justify-center font-manrope text-sm text-warm-muted">
                  Loading…
                </div>
              ) : chart.points.length > 0 ? (
                <SignupsTrendChart data={chart.points} activationData={activationChart} labelEvery={chart.labelEvery} animationKey={range} />
              ) : (
                <p className="py-8 text-center font-manrope text-sm text-warm-muted">No signups yet.</p>
              )}
            </div>
          </div>

          <div className={`${CARD_CLASS} !p-5 flex flex-col`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-manrope text-[15px] font-bold text-ink">Customer mix</h2>
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-cream-alt p-1">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMixRange(opt.value)}
                    className={`rounded-full px-3 py-1 font-manrope text-xs font-bold transition-colors ${
                      mixRange === opt.value ? "bg-peach text-terracotta" : "text-warm-muted hover:text-ink"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1 font-manrope text-[13px] text-warm-muted">Free vs. Pro, by signup date.</p>
            <div className="mt-3 flex flex-1 flex-col items-center justify-center">
              {loading ? (
                <p className="font-manrope text-sm text-warm-muted">…</p>
              ) : (
                (() => {
                  const mix = data.customerMix[mixRange];
                  const mixTotal = mix.free + mix.paying;
                  return (
                    <>
                      <DonutChart
                        animationKey={mixRange}
                        size={130}
                        strokeWidth={19}
                        segments={[
                          { label: "Free", value: mix.free, color: "#F5A623" },
                          { label: "Pro", value: mix.paying, color: "#E8603F" },
                        ]}
                        centerLabel={{
                          value: String(mixTotal > 0 ? Math.round((mix.paying / mixTotal) * 100) : 0) + "%",
                          caption: "paying",
                        }}
                      />
                      <div className="mt-4 flex items-center gap-4 font-manrope text-xs">
                        <span className="flex items-center gap-1.5 text-warm-muted">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#F5A623" }} />
                          Free {mix.free}
                        </span>
                        <span className="flex items-center gap-1.5 text-warm-muted">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#E8603F" }} />
                          Pro {mix.paying}
                        </span>
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </section>

        <section className={`mt-3 ${CARD_CLASS} !p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-manrope text-[15px] font-bold text-ink">Churn over time</h2>
              <p className="mt-1 font-manrope text-[13px] text-warm-muted">
                Previously paying, now free. Hover the chart for exact values.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-cream-alt p-1">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setChurnRange(opt.value)}
                  className={`rounded-full px-3 py-1 font-manrope text-xs font-bold transition-colors ${
                    churnRange === opt.value ? "bg-peach text-terracotta" : "text-warm-muted hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div style={{ height: 190 }} className="flex items-center justify-center font-manrope text-sm text-warm-muted">
                Loading…
              </div>
            ) : churnChart.points.length > 0 ? (
              <ChurnTrendChart data={churnChart.points} labelEvery={churnChart.labelEvery} animationKey={churnRange} />
            ) : (
              <p className="py-8 text-center font-manrope text-sm text-warm-muted">No churn yet.</p>
            )}
          </div>
        </section>
        </div>{/* end overview tab */}

        {/* ── Funnel tab ── */}
        <div style={{ width: "50%", flexShrink: 0 }}>
          <section className={`${CARD_CLASS} !p-5`}>
            <h2 className="font-manrope text-[15px] font-bold text-ink">Conversion funnel</h2>
            <p className="mt-1 font-manrope text-[13px] text-warm-muted">
              Drop-off at each stage from signup to churn.
            </p>
            <div className="mt-4">
              {loading ? (
                <p className="py-8 text-center font-manrope text-sm text-warm-muted">Loading…</p>
              ) : (
                <FunnelChart
                  stages={[
                    { label: "Signed up",  value: data.signups.allTime,   color: "#5C8A6B" },
                    { label: "Activated",  value: data.activatedUsers,    color: "#C8831A" },
                    { label: "Paid",       value: data.totalPaying,       color: "#E8603F" },
                    { label: "Churned",    value: data.totalChurned,      color: "#9E5A4E" },
                  ]}
                />
              )}
            </div>
          </section>

          <section className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className={`${CARD_CLASS} !rounded-[14px] !p-5`}>
              <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
                Conversion rate
              </p>
              {loading ? (
                <p className="mt-1 font-display text-[32px] text-warm-muted">…</p>
              ) : (
                <>
                  <p className="mt-1 font-display text-[32px] text-ink">
                    <AnimatedNumber value={data.conversionRate} />%
                  </p>
                  <p className="mt-1 font-manrope text-xs text-warm-muted">
                    Of all signups that became paying customers
                  </p>
                </>
              )}
            </div>

            <div className={`${CARD_CLASS} !rounded-[14px] !p-5`}>
              <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
                Avg. time to convert
              </p>
              {loading ? (
                <p className="mt-1 font-display text-[32px] text-warm-muted">…</p>
              ) : (
                <>
                  <p className="mt-1 font-display text-[32px] text-ink">
                    {data.avgDaysToConvert !== null ? (
                      <><AnimatedNumber value={data.avgDaysToConvert} /> days</>
                    ) : "—"}
                  </p>
                  <p className="mt-1 font-manrope text-xs text-warm-muted">
                    Average days from signup to first payment
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Churn rate + recently churned */}
          <section className={`${CARD_CLASS} !p-5 mt-3`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-manrope text-[15px] font-bold text-ink">Churn</h2>
                <p className="mt-0.5 font-manrope text-[13px] text-warm-muted">
                  Paying customers who cancelled or downgraded.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
                  This month
                </p>
                {loading ? (
                  <p className="mt-1 font-display text-[32px] text-warm-muted">…</p>
                ) : (
                  <p className="mt-1 font-display text-[32px] text-ink">
                    <AnimatedNumber value={data.churnRate} />%
                  </p>
                )}
              </div>
            </div>

            {!loading && data.recentlyChurned.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">
                  Recently churned
                </p>
                <div className="divide-y divide-ink/[.06]">
                  {data.recentlyChurned.slice(0, 3).map((u) => (
                    <div key={u.email + u.date} className="flex items-center justify-between py-2 pr-4">
                      <span className="font-manrope text-sm text-ink">{u.email}</span>
                      <span className="font-manrope text-xs text-warm-muted">{u.date}</span>
                    </div>
                  ))}
                </div>
                {data.recentlyChurned.length > 3 && (
                  <div
                    className="pr-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink/20 [&::-webkit-scrollbar-thumb:hover]:bg-ink/35"
                    style={{
                      maxHeight: showAllChurned ? 280 : 0,
                      overflowY: churnScrollable ? "auto" : "hidden",
                      transition: "max-height 0.4s cubic-bezier(.4,0,.2,1)",
                    }}
                  >
                    <div className="divide-y divide-ink/[.06]">
                      {data.recentlyChurned.slice(3).map((u) => (
                        <div key={u.email + u.date} className="flex items-center justify-between py-2">
                          <span className="font-manrope text-sm text-ink">{u.email}</span>
                          <span className="font-manrope text-xs text-warm-muted">{u.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.recentlyChurned.length > 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = !showAllChurned;
                      setShowAllChurned(next);
                      if (next) {
                        setTimeout(() => setChurnScrollable(true), 400);
                      } else {
                        setChurnScrollable(false);
                      }
                    }}
                    className="mt-2 font-manrope text-xs font-bold text-terracotta hover:underline"
                  >
                    {showAllChurned ? "Show less" : `Show all ${data.recentlyChurned.length}`}
                  </button>
                )}
              </div>
            )}

            {!loading && data.recentlyChurned.length === 0 && (
              <p className="mt-4 font-manrope text-sm text-warm-muted">No churned customers yet.</p>
            )}
          </section>
        </div>{/* end funnel tab */}

        </div>{/* end sliding flex row */}
        </div>{/* end overflow-hidden */}
      </div>
    </div>
  );
}
