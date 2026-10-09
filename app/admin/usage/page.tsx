"use client";

import { useEffect, useRef, useState } from "react";
import { WIZARD_CARD_CLASS } from "@/lib/wizard-ui";
import AnimatedNumber from "@/components/AnimatedNumber";

const AVATAR_COLORS = ["#E8603F", "#6B8F71", "#F5A623", "#BE5B37", "#7B6AA8", "#3D8BA8"];
function avatarColorFor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function CustomScrollArea({ children, maxHeight, className = "" }: { children: React.ReactNode; maxHeight: number; className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [thumbH, setThumbH] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [visible, setVisible] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ y: 0, scrollTop: 0 });

  function sync() {
    const c = contentRef.current;
    if (!c) return;
    const ratio = c.clientHeight / c.scrollHeight;
    setVisible(ratio < 1);
    setThumbH(Math.max(32, ratio * c.clientHeight));
    setThumbTop((c.scrollTop / c.scrollHeight) * c.clientHeight);
  }

  useEffect(() => { sync(); }, [children]);

  return (
    <div className={`relative flex ${className}`}>
      <div ref={contentRef} className="flex-1 overflow-y-auto" onScroll={sync}
        onMouseEnter={sync}
        style={{ maxHeight, scrollbarWidth: "none" } as React.CSSProperties}
      >
        <div ref={trackRef}>{children}</div>
      </div>
      {visible && (
        <div className="absolute right-1 top-1 bottom-1 w-1 rounded-full bg-ink/[.04]">
          <div
            ref={thumbRef}
            className="absolute w-full rounded-full bg-ink/20 hover:bg-ink/35 cursor-pointer transition-colors"
            style={{ height: thumbH, top: thumbTop }}
            onMouseDown={(e) => {
              dragging.current = true;
              dragStart.current = { y: e.clientY, scrollTop: contentRef.current?.scrollTop ?? 0 };
              const onMove = (ev: MouseEvent) => {
                if (!dragging.current || !contentRef.current) return;
                const dy = ev.clientY - dragStart.current.y;
                const ratio = contentRef.current.scrollHeight / contentRef.current.clientHeight;
                contentRef.current.scrollTop = dragStart.current.scrollTop + dy * ratio;
                sync();
              };
              const onUp = () => { dragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
              e.preventDefault();
            }}
          />
        </div>
      )}
    </div>
  );
}

function CustomerDropdown({ value, options, onChange }: {
  value: string;
  options: CustomerOption[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function close() {
    setClosing(true);
    closeTimer.current = setTimeout(() => { setOpen(false); setClosing(false); }, 180);
  }

  function toggle() {
    if (open) { close(); } else { if (closeTimer.current) clearTimeout(closeTimer.current); setClosing(false); setOpen(true); }
  }

  useEffect(() => {
    if (open && !closing) setTimeout(() => searchRef.current?.focus(), 50);
    if (!open) setSearch("");
  }, [open, closing]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (open && !closing && rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, closing]);

  const selected = options.find((c) => c.id === value);
  const selectedColor = selected ? avatarColorFor(selected.email) : null;
  const filtered = options.filter((c) => !search || c.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={rootRef} className="relative ml-auto">
      <button
        type="button"
        onClick={toggle}
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-manrope text-xs font-bold text-ink transition-all duration-150 active:scale-[.97] ${
          open ? "border-terracotta/50 bg-peach/40" : "border-ink/[.15] bg-white hover:border-terracotta/40 hover:bg-peach/20"
        }`}
      >
        {selectedColor && (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-manrope text-[10px] font-bold text-white"
            style={{ background: selectedColor }}
          >
            {selected!.email.charAt(0).toUpperCase()}
          </span>
        )}
        {!selectedColor && (
          <svg className="h-3.5 w-3.5 shrink-0 text-warm-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
        <span className="max-w-[140px] truncate">
          {value === "" ? "All customers" : selected?.email.split("@")[0] ?? "All customers"}
        </span>
        <svg
          className={`h-3 w-3 shrink-0 text-warm-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {(open || closing) && (
        <div className={closing ? "dropdown-close" : "dropdown-pop"} style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 20, width: 256, overflow: "hidden", borderRadius: 12, border: "1px solid rgba(43,34,28,.08)", background: "#fff", boxShadow: "0 12px 32px -8px rgba(43,34,28,.22)" }}>
          <style>{`
            @keyframes dropdownPop {
              0%   { opacity: 0; transform: translateY(-10px) scaleY(0.88); }
              60%  { opacity: 1; transform: translateY(2px) scaleY(1.02); }
              100% { opacity: 1; transform: translateY(0) scaleY(1); }
            }
            @keyframes dropdownClose {
              0%   { opacity: 1; transform: translateY(0) scaleY(1); }
              40%  { opacity: 1; transform: translateY(2px) scaleY(1.02); }
              100% { opacity: 0; transform: translateY(-10px) scaleY(0.88); }
            }
            .dropdown-pop   { animation: dropdownPop   0.22s cubic-bezier(.34,1.4,.64,1) forwards; transform-origin: top right; }
            .dropdown-close { animation: dropdownClose 0.18s cubic-bezier(.55,0,.64,.8)  forwards; transform-origin: top right; }
          `}</style>
          <div className="border-b border-ink/[.06] px-3 py-2.5">
            <p className="mb-2 font-manrope text-[10px] font-extrabold uppercase tracking-widest text-warm-muted">Filter by customer</p>
            <div className="flex items-center gap-2 rounded-lg border border-ink/[.12] bg-cream/60 px-2.5 py-1.5">
              <svg className="h-3 w-3 shrink-0 text-warm-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers…"
                className="w-full bg-transparent font-manrope text-xs text-ink placeholder-warm-muted outline-none"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="shrink-0 text-warm-muted hover:text-ink">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <CustomScrollArea maxHeight={240} className="py-1.5">
            {!search && (
              <>
                <button
                  type="button"
                  onClick={() => { onChange(""); close(); }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 transition-colors duration-100 ${
                    value === "" ? "bg-peach/60" : "hover:bg-peach/30"
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${value === "" ? "bg-terracotta/20" : "bg-ink/[.06]"}`}>
                    <svg className={`h-3 w-3 ${value === "" ? "text-terracotta" : "text-warm-muted"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </span>
                  <span className={`font-manrope text-xs ${value === "" ? "font-bold text-terracotta" : "font-semibold text-ink"}`}>All customers</span>
                  {value === "" && (
                    <svg className="ml-auto h-3 w-3 shrink-0 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                {options.length > 0 && <div className="mx-3 my-1 border-t border-ink/[.06]" />}
              </>
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center font-manrope text-xs text-warm-muted">No customers found</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); close(); }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 transition-colors duration-100 ${
                  value === c.id ? "bg-peach/60" : "hover:bg-peach/30"
                }`}
                title={c.email}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-manrope text-[10px] font-bold text-white"
                  style={{ background: avatarColorFor(c.email) }}
                >
                  {c.email.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className={`block truncate font-manrope text-xs ${value === c.id ? "font-bold text-terracotta" : "font-medium text-ink"}`}>
                    {c.email.split("@")[0]}
                  </span>
                  <span className="block truncate font-manrope text-[10px] text-warm-muted">@{c.email.split("@")[1]}</span>
                </span>
                {value === c.id && (
                  <svg className="ml-auto h-3 w-3 shrink-0 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </CustomScrollArea>
        </div>
      )}
    </div>
  );
}

const CARD = `${WIZARD_CARD_CLASS} !border-ink/[.15] shadow-[0_4px_20px_-8px_rgba(43,34,28,.12)] !rounded-[14px] !p-4`;

function AnimatedCost({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) { setDisplay(to); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{fmt$(display)}</>;
}

function fmt$(n: number) {
  if (n === 0)   return "$0.00";
  if (n < 0.001) return `$${n.toFixed(6)}`;
  if (n < 1)     return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}
function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

type Totals = {
  costAllTime: number; cost30d: number; cost7d: number; costToday: number;
  tokensAllTime: number; tokens30d: number; tokens7d: number; tokensToday: number;
};
type ModelRow = { provider: string; model: string; cost: number; tokens: number; calls: number };
type UserRow  = { email: string; cost: number; tokens: number; calls: number };
type TrendPoint = { date?: string; month?: string; cost: number };

type CustomerOption = { id: string; email: string; cost: number };
type Data = {
  customers: CustomerOption[];
  totals: Totals;
  byModel: ModelRow[];
  topUsers: UserRow[];
  costTrend: { daily30d: TrendPoint[] };
  _notice?: string;
};

const defaultData: Data = {
  customers: [],
  totals: { costAllTime: 0, cost30d: 0, cost7d: 0, costToday: 0, tokensAllTime: 0, tokens30d: 0, tokens7d: 0, tokensToday: 0 },
  byModel: [],
  topUsers: [],
  costTrend: { daily30d: [] },
};

const PROVIDER_COLOR: Record<string, string> = {
  anthropic: "#5C8A6B",
  openai:    "#C8831A",
};

export default function AdminUsagePage() {
  const [data, setData] = useState<Data>(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [usersScrollable, setUsersScrollable] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [chartKey, setChartKey] = useState("init");
  const [refreshTick, setRefreshTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function load(manual = false) {
      if (manual) setRefreshing(true);
      const url = selectedUser ? `/api/admin/usage?userId=${selectedUser}` : "/api/admin/usage";
      fetch(url)
        .then((r) => r.json())
        .then((json) => {
          if (cancelled) return;
          if (json.error) { setError(json.error); return; }
          setData((prev) => {
            const isFirst = prev === defaultData;
            if (isFirst) setChartKey(`${selectedUser}-${Date.now()}`);
            return { ...json, customers: json.customers?.length ? json.customers : prev.customers };
          });
          setLastUpdated(new Date());
        })
        .catch(() => { if (!cancelled) setError("Failed to load"); })
        .finally(() => { if (!cancelled) { setLoading(false); setRefreshing(false); } });
    }

    setChartKey(`${selectedUser}-${Date.now()}`);
    load(refreshTick > 0);
    const interval = setInterval(() => load(false), 10_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [selectedUser, refreshTick]);

  const totalCostByProvider = data.byModel.reduce<Record<string, number>>((acc, r) => {
    acc[r.provider] = (acc[r.provider] ?? 0) + Number(r.cost);
    return acc;
  }, {});
  const providerTotal = Object.values(totalCostByProvider).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-cream p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl italic text-ink">AI Usage & Cost</h1>
            <p className="mt-1 font-manrope text-sm text-warm-muted">
              Token usage and cost across all customers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data.customers.length > 0 && (
              <CustomerDropdown
                value={selectedUser}
                options={data.customers}
                onChange={(id) => { setSelectedUser(id); setLoading(true); }}
              />
            )}
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={refreshing}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-manrope text-xs font-bold transition-all duration-150 active:scale-[.97] ${
              refreshing
                ? "border-terracotta/50 bg-peach/60 text-terracotta"
                : "border-ink/[.15] bg-white text-ink hover:border-terracotta/40 hover:bg-peach/20"
            }`}
          >
            <svg
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${refreshing ? "animate-spin text-terracotta" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "Syncing…" : "Sync"}
          </button>
          <div className="flex items-center gap-2 rounded-full bg-cream-alt px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="font-manrope text-[11px] font-semibold text-warm-muted">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Live"}
            </span>
          </div>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 font-manrope text-sm text-amber-700">
            {error}
          </p>
        )}
        {data._notice && (
          <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 font-manrope text-sm text-blue-700">
            {data._notice} Run: <code className="font-mono">node scripts/migrate.js</code>
          </p>
        )}

        {/* Stat cards */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Cost today",    value: data.totals.costToday    },
            { label: "Cost last 7d",  value: data.totals.cost7d       },
            { label: "Cost last 30d", value: data.totals.cost30d      },
            { label: "Cost all-time", value: data.totals.costAllTime  },
          ].map(({ label, value }) => (
            <div key={label} className={CARD}>
              <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">{label}</p>
              <p className="mt-1 font-display text-[28px] text-ink">
                {loading ? "…" : <AnimatedCost value={value} />}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Tokens today",    value: data.totals.tokensToday    },
            { label: "Tokens last 7d",  value: data.totals.tokens7d       },
            { label: "Tokens last 30d", value: data.totals.tokens30d      },
            { label: "Tokens all-time", value: data.totals.tokensAllTime  },
          ].map(({ label, value }) => (
            <div key={label} className={CARD}>
              <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">{label}</p>
              <p className="mt-1 font-display text-[28px] text-ink">
                {loading ? "…" : <AnimatedNumber value={value} />}
              </p>
            </div>
          ))}
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Cost by provider/model */}
          <div className={CARD}>
            <h2 className="font-manrope text-[15px] font-bold text-ink">Cost by provider</h2>
            <p className="mt-0.5 font-manrope text-[13px] text-warm-muted">Breakdown by model used.</p>
            {loading ? (
              <p className="mt-4 font-manrope text-sm text-warm-muted">Loading…</p>
            ) : data.byModel.length === 0 ? (
              <p className="mt-4 font-manrope text-sm text-warm-muted">No data yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {/* Provider bars */}
                {Object.entries(totalCostByProvider).map(([provider, cost]) => {
                  const pct = providerTotal > 0 ? (cost / providerTotal) * 100 : 0;
                  const color = PROVIDER_COLOR[provider] ?? "#9E5A4E";
                  return (
                    <div key={provider}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-manrope text-sm font-semibold capitalize text-ink">{provider}</span>
                        <span className="font-manrope text-sm text-warm-muted">{fmt$(cost)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-ink/[.06]">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
                {/* Model breakdown */}
                <div className="mt-4 divide-y divide-ink/[.06]">
                  {data.byModel.map((r) => (
                    <div key={r.provider + r.model} className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-manrope text-xs font-semibold text-ink">{r.model}</span>
                        <span className="ml-2 font-manrope text-[11px] text-warm-muted">{Number(r.calls).toLocaleString()} calls</span>
                      </div>
                      <div className="text-right">
                        <span className="font-manrope text-xs font-bold text-ink">{fmt$(Number(r.cost))}</span>
                        <span className="ml-2 font-manrope text-[11px] text-warm-muted">{fmtTokens(Number(r.tokens))} tokens</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top customers by cost */}
          <div className={CARD}>
            <h2 className="font-manrope text-[15px] font-bold text-ink">Top customers by cost</h2>
            <p className="mt-0.5 font-manrope text-[13px] text-warm-muted">Customers costing the most in AI usage.</p>
            {loading ? (
              <p className="mt-4 font-manrope text-sm text-warm-muted">Loading…</p>
            ) : data.topUsers.length === 0 ? (
              <p className="mt-4 font-manrope text-sm text-warm-muted">No data yet.</p>
            ) : (
              <div className="mt-4">
                <div className="divide-y divide-ink/[.06]">
                  {data.topUsers.slice(0, 3).map((u) => (
                    <div key={u.email} className="flex items-center gap-3 py-2">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-manrope text-[11px] font-bold text-white"
                        style={{ background: avatarColorFor(u.email) }}
                      >
                        {u.email.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-manrope text-xs font-semibold text-ink">{u.email.split("@")[0]}</span>
                        <span className="block truncate font-manrope text-[10px] text-warm-muted">@{u.email.split("@")[1]}</span>
                      </span>
                      <div className="shrink-0 flex items-baseline gap-2 whitespace-nowrap">
                        <span className="font-manrope text-sm font-bold tabular-nums text-ink">{fmt$(Number(u.cost))}</span>
                        <span className="font-manrope text-[11px] tabular-nums text-warm-muted">{fmtTokens(Number(u.tokens))}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {data.topUsers.length > 3 && (
                  <>
                    <div
                      className="divide-y divide-ink/[.06] pr-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink/20 [&::-webkit-scrollbar-thumb:hover]:bg-ink/35"
                      style={{
                        maxHeight: showAllUsers ? 156 : 0,
                        overflowY: usersScrollable ? "auto" : "hidden",
                        transition: "max-height 0.4s cubic-bezier(.4,0,.2,1)",
                      }}
                    >
                      <div className="divide-y divide-ink/[.06]">
                        {data.topUsers.slice(3).map((u) => (
                          <div key={u.email} className="flex items-center gap-3 py-2">
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-manrope text-[11px] font-bold text-white"
                              style={{ background: avatarColorFor(u.email) }}
                            >
                              {u.email.charAt(0).toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-manrope text-xs font-semibold text-ink">{u.email.split("@")[0]}</span>
                              <span className="block truncate font-manrope text-[10px] text-warm-muted">@{u.email.split("@")[1]}</span>
                            </span>
                            <div className="shrink-0 flex items-baseline gap-2 whitespace-nowrap">
                              <span className="font-manrope text-sm font-bold tabular-nums text-ink">{fmt$(Number(u.cost))}</span>
                              <span className="font-manrope text-[11px] tabular-nums text-warm-muted">{fmtTokens(Number(u.tokens))}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mt-2 font-manrope text-xs font-bold text-terracotta hover:underline"
                      onClick={() => {
                        const next = !showAllUsers;
                        setShowAllUsers(next);
                        if (next) setTimeout(() => setUsersScrollable(true), 400);
                        else setUsersScrollable(false);
                      }}
                    >
                      {showAllUsers ? "Show less" : `Show more (${data.topUsers.length - 3})`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cost trend (daily 30d) */}
        <div className={`${CARD} mt-4`}>
          <h2 className="font-manrope text-[15px] font-bold text-ink">Cost trend</h2>
          <p className="mt-0.5 font-manrope text-[13px] text-warm-muted">Daily AI spend over the last 30 days.</p>
          {loading ? (
            <p className="mt-4 font-manrope text-sm text-warm-muted">Loading…</p>
          ) : (
            <CostTrendChart points={data.costTrend.daily30d} animationKey={chartKey} />
          )}
        </div>
      </div>
    </div>
  );
}

function niceMax(value: number): number {
  if (value <= 0) return 0.01;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function CostTrendChart({ points, animationKey }: { points: TrendPoint[]; animationKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [grown, setGrown] = useState(false);
  const [W, setW] = useState(600);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    setGrown(false);
    const t = setTimeout(() => setGrown(true), 20);
    return () => clearTimeout(t);
  }, [animationKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setW(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const H = 190;
  const PAD_LEFT = 38, PAD_RIGHT = 8, PAD_TOP = 12, PAD_BOTTOM = 26;
  const plotW = W - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const maxVal = niceMax(Math.max(...points.map((p) => p.cost), 0));
  const n = points.length;
  const slotW = n > 0 ? plotW / n : plotW;
  const barW = Math.max(2, Math.min(20, Math.floor(slotW - 2)));
  const yTicks = [0, 0.33, 0.66, 1].map((t) => maxVal * t);
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoverCenterPct = hoverIndex !== null && n > 0 ? ((hoverIndex + 0.5) / n) * 100 : 50;

  function fmtTick(v: number) {
    if (v === 0) return "$0";
    if (v < 0.001) return `$${v.toFixed(6)}`;
    if (v < 0.01) return `$${v.toFixed(4)}`;
    if (v < 1) return `$${v.toFixed(3)}`;
    return `$${v.toFixed(2)}`;
  }

  return (
    <div ref={containerRef} className="relative mt-4" style={{ opacity: grown ? 1 : 0, transition: "opacity 0.3s ease" }}>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-ink px-3 py-1.5 shadow-soft-lg transition-[left] duration-150 ease-out"
          style={{ left: `${hoverCenterPct}%`, top: 0 }}
        >
          <div className="mb-0.5 font-manrope text-[10px] text-white/50">{hovered.date ? hovered.date.slice(5) : ""}</div>
          <span className="font-manrope text-sm font-bold text-white">{fmt$(hovered.cost)}</span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {yTicks.map((val, i) => {
          const y = PAD_TOP + plotH - (val / maxVal) * plotH;
          return (
            <g key={i}>
              <line x1={PAD_LEFT} y1={y} x2={W - PAD_RIGHT} y2={y} stroke="#2B221C" strokeOpacity={0.06} strokeWidth={1} />
              <text x={PAD_LEFT - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#8C7C6E"
                style={{ fontFamily: "var(--font-manrope), system-ui" }}>
                {fmtTick(val)}
              </text>
            </g>
          );
        })}
        {points.map((p, i) => {
          const isHover = hoverIndex === i;
          const h = Math.max((p.cost / maxVal) * plotH, p.cost > 0 ? 3 : 1);
          const barH = grown ? h : 0;
          const x = PAD_LEFT + slotW * (i + 0.5) - barW / 2;
          const y = PAD_TOP + plotH - (grown ? h : 0);
          const label = p.date ? p.date.slice(5) : (p.month ?? "");
          const trans = `height 0.5s cubic-bezier(.16,1,.3,1) ${i * 10}ms, y 0.5s cubic-bezier(.16,1,.3,1) ${i * 10}ms`;
          return (
            <g key={i}>
              <rect x={PAD_LEFT + slotW * i} y={PAD_TOP} width={slotW} height={plotH}
                fill="transparent"
                onPointerEnter={() => setHoverIndex(i)}
                onPointerLeave={() => setHoverIndex((c) => (c === i ? null : c))}
              />
              <rect x={x} y={y} width={barW} height={barH} rx={3} ry={3}
                fill="#BE5B37" opacity={p.cost === 0 ? 0.15 : isHover ? 1 : 0.85}
                pointerEvents="none" style={{ transition: trans }} />
              <rect x={x} y={y + Math.max(barH - 3, 0)} width={barW} height={Math.min(3, barH)}
                fill="#BE5B37" opacity={p.cost === 0 ? 0.15 : isHover ? 1 : 0.85}
                pointerEvents="none" style={{ transition: trans }} />
              {i % 5 === 0 && (
                <text x={PAD_LEFT + slotW * (i + 0.5)} y={H - 6} textAnchor="middle" fontSize={9} fill="#8C7C6E"
                  style={{ fontFamily: "var(--font-manrope), system-ui" }}>
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {points.every((p) => p.cost === 0) && (
        <p className="mt-2 text-center font-manrope text-sm text-warm-muted">No usage recorded yet.</p>
      )}
    </div>
  );
}
