"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WIZARD_CARD_CLASS, WIZARD_OUTLINE_BUTTON_CLASS } from "@/lib/wizard-ui";
import AnimatedNumber from "@/components/AnimatedNumber";

// Plain CSS @keyframes (not a Tailwind utility class) applied via a changing `key` on
// each row - remounting is what replays the animation, so it works the same on first
// load and on every later filter switch, with no JS timing/state to get out of sync.
const ROW_FADE_IN = "logRowFadeIn";

// The up/down scrollbar-button arrows turned out to be the OS's own native scrollbar
// chrome (a Windows display/accessibility setting forces classic scrollbars for this
// user), not something ::-webkit-scrollbar-button CSS can touch regardless of how many
// pseudo-selector variants are covered. The only reliable fix is to hide the native
// scrollbar entirely and draw our own thumb (see CustomScrollArea below).
const HIDE_NATIVE_SCROLLBAR_CSS = `
  .no-native-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
  .no-native-scrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
`;

/** Scrollable container with a custom-drawn thumb instead of the browser's native
 * scrollbar - sidesteps the native scrollbar-button arrows entirely rather than trying
 * to CSS them away. Vertical only (matches how both call sites use it). */
function CustomScrollArea({
  maxHeight,
  className,
  children,
}: {
  maxHeight: number;
  className?: string;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ top: 0, height: 0, visible: false });

  const updateThumb = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 1) {
      setThumb((t) => (t.visible ? { top: 0, height: 0, visible: false } : t));
      return;
    }
    const thumbHeight = Math.max(28, (clientHeight / scrollHeight) * clientHeight);
    const maxThumbTop = clientHeight - thumbHeight;
    const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * maxThumbTop;
    // Bail out if nothing actually moved - setThumb always creates a new object, and
    // without this guard an effect that re-measures on every render would re-trigger
    // itself every time (new object reference -> re-render -> effect runs -> new object...).
    setThumb((t) =>
      t.visible && Math.abs(t.top - thumbTop) < 0.5 && Math.abs(t.height - thumbHeight) < 0.5
        ? t
        : { top: thumbTop, height: thumbHeight, visible: true }
    );
  };

  // Re-measure on mount, on scroll (via the onScroll prop below), and whenever the
  // content's actual height changes (filtered rows, dropdown options) - a ResizeObserver
  // on the content catches that last case. Set up once: the observed DOM nodes (the
  // scroll container and its children) stay the same across re-renders, so there's
  // nothing to re-subscribe to later - ResizeObserver keeps reporting their size changes
  // over time regardless of how many times this component re-renders.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateThumb();
    const observer = new ResizeObserver(() => updateThumb());
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dragRef = useRef<{ startY: number; startScrollTop: number } | null>(null);

  const onThumbPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { startY: e.clientY, startScrollTop: el.scrollTop };
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const trackHeight = el.clientHeight;
      const thumbHeight = Math.max(28, (el.clientHeight / el.scrollHeight) * trackHeight);
      const trackDist = trackHeight - thumbHeight;
      const scrollableDist = el.scrollHeight - el.clientHeight;
      if (trackDist <= 0 || scrollableDist <= 0) return;
      const deltaY = ev.clientY - dragRef.current.startY;
      el.scrollTop = dragRef.current.startScrollTop + (deltaY / trackDist) * scrollableDist;
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="relative">
      <style>{HIDE_NATIVE_SCROLLBAR_CSS}</style>
      <div
        ref={scrollRef}
        onScroll={updateThumb}
        className={`no-native-scrollbar overflow-y-auto overflow-x-auto pr-4 ${className ?? ""}`}
        style={{ maxHeight }}
      >
        {children}
      </div>
      {thumb.visible && (
        <div
          onPointerDown={onThumbPointerDown}
          className="absolute right-1 w-1.5 cursor-pointer rounded-full bg-terracotta/70 transition-colors hover:bg-terracotta"
          style={{ top: thumb.top, height: thumb.height }}
        />
      )}
    </div>
  );
}

type CrawlLog = {
  id: string;
  url: string;
  status: "success" | "failed" | "timeout" | "captcha";
  storeType: string | null;
  productsFound: number;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  userEmail: string | null;
};

// Stronger border than the shared WIZARD_CARD_CLASS default (border-ink/[.08] reads as
// nearly invisible on this cream background) - kept local so it doesn't change card
// borders on every other page that reuses WIZARD_CARD_CLASS.
const CARD_CLASS = `${WIZARD_CARD_CLASS} !border-ink/[.15] shadow-[0_4px_20px_-8px_rgba(43,34,28,.12)]`;

const STATUS_STYLES: Record<CrawlLog["status"], string> = {
  success: "bg-sage/10 text-sage",
  failed: "bg-red-100 text-red-600",
  timeout: "bg-amber-100 text-amber-700",
  captcha: "bg-terracotta/10 text-terracotta",
};

const STATUS_LABELS: Record<CrawlLog["status"], string> = {
  success: "Success",
  failed: "Failed",
  timeout: "Timed out",
  captcha: "Blocked (CAPTCHA)",
};

// A small, fixed palette cycled by a hash of the email - same merchant always gets the
// same color, different merchants are easy to tell apart at a glance in a mixed list.
const AVATAR_COLORS = ["#E8603F", "#6B8F71", "#F5A623", "#BE5B37", "#7B6AA8", "#3D8BA8"];

function avatarColorFor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function StatusIcon({ status }: { status: CrawlLog["status"] }) {
  const cls = "h-3 w-3 shrink-0";
  switch (status) {
    case "success":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      );
    case "failed":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case "timeout":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="9" strokeWidth={2} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 3" />
        </svg>
      );
    case "captcha":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-12V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
  }
}

function ColumnHeaderIcon({ name }: { name: string }) {
  const cls = "h-3.5 w-3.5 shrink-0 text-terracotta/50";
  switch (name) {
    case "user":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "link":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.5 10.5L21 3m0 0h-5.5M21 3v5.5M10 14L3 21m0 0h5.5M3 21v-5.5" />
        </svg>
      );
    case "flag":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v18M5 4h11l-2 3 2 3H5" />
        </svg>
      );
    case "box":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case "clock":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v5l3 3" />
        </svg>
      );
    case "warning":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      );
    case "time":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    default:
      return null;
  }
}

function ColumnHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <th className="px-4 py-3 text-center font-manrope text-[11px] font-bold uppercase tracking-wide text-warm-muted">
      <span className="flex items-center justify-center gap-1.5">
        <ColumnHeaderIcon name={icon} />
        {label}
      </span>
    </th>
  );
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** A styled dropdown matching the app's palette - native <select> can't be restyled
 * cross-browser (that default blue-highlight list was the browser's own UI chrome). */
function MerchantDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-lg border px-3.5 py-1.5 font-manrope text-xs font-bold text-ink transition-all duration-150 active:scale-[.97] ${
          open ? "border-terracotta/50 bg-peach/40" : "border-ink/[.15] bg-white hover:border-terracotta/40 hover:bg-peach/20"
        }`}
      >
        {value === "all" ? "All merchants" : value}
        <svg
          className={`h-3 w-3 shrink-0 text-warm-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="dropdown-pop absolute right-0 top-[calc(100%+6px)] z-20 w-56 overflow-hidden rounded-lg border border-ink/[.1] bg-white shadow-[0_8px_24px_-6px_rgba(43,34,28,.18)]">
          <style>{`
            @keyframes dropdownPop { from { opacity: 0; transform: translateY(-4px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
            .dropdown-pop { animation: dropdownPop 0.15s ease-out forwards; transform-origin: top right; }
          `}</style>
          <CustomScrollArea maxHeight={256} className="py-1.5">
            <button
              type="button"
              onClick={() => {
                onChange("all");
                setOpen(false);
              }}
              className={`block w-full px-3.5 py-2 text-left font-manrope text-xs font-bold transition-all duration-150 ${
                value === "all" ? "bg-peach text-terracotta" : "text-ink hover:translate-x-0.5 hover:bg-peach/50"
              }`}
            >
              All merchants
            </button>
            {options.map((email) => (
              <button
                key={email}
                type="button"
                onClick={() => {
                  onChange(email);
                  setOpen(false);
                }}
                className={`block w-full truncate px-3.5 py-2 text-left font-manrope text-xs transition-all duration-150 ${
                  value === email ? "bg-peach font-bold text-terracotta" : "text-ink hover:translate-x-0.5 hover:bg-peach/50"
                }`}
                title={email}
              >
                {email}
              </button>
            ))}
          </CustomScrollArea>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [merchantFilter, setMerchantFilter] = useState<string>("all");

  const fetchLogs = () => {
    setLoading(true);
    setError(null);
    const qs = filter !== "all" ? `?status=${filter}` : "";
    fetch(`/api/admin/logs${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        } else {
          setError(data.error || "Failed to load logs");
        }
      })
      .catch(() => setError("Failed to load logs"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const filters = [
    { value: "all", label: "All" },
    { value: "success", label: "Success" },
    { value: "failed", label: "Failed" },
    { value: "timeout", label: "Timed out" },
    { value: "captcha", label: "Blocked" },
  ];

  const merchants = Array.from(new Set(logs.map((l) => l.userEmail).filter((e): e is string => !!e))).sort();
  const visibleLogs = merchantFilter === "all" ? logs : logs.filter((l) => l.userEmail === merchantFilter);
  const viewKey = `${filter}|${merchantFilter}`;

  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.status === "success").length;
    const blocked = logs.filter((l) => l.status === "failed" || l.status === "timeout" || l.status === "captcha").length;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    return { total, success, blocked, successRate, merchantCount: merchants.length };
  }, [logs, merchants.length]);

  return (
    <div className="min-h-full bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] text-ink">Crawl Logs — All Merchants</h1>
            <p className="mt-1.5 font-manrope text-sm text-warm-body">
              Every website scan attempt across every account. Status, products found, and any errors.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className={`${WIZARD_OUTLINE_BUTTON_CLASS} text-xs disabled:opacity-50`}
          >
            Refresh
          </button>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`${CARD_CLASS} !rounded-[14px] !p-4`}>
            <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">Total scans</p>
            <p className="mt-1 font-display text-[26px] text-ink">
              {loading ? "…" : <AnimatedNumber value={stats.total} />}
            </p>
          </div>
          <div className={`${CARD_CLASS} !rounded-[14px] !p-4`}>
            <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">Success rate</p>
            <p className="mt-1 font-display text-[26px] text-ink">
              {loading ? "…" : <><AnimatedNumber value={stats.successRate} />%</>}
            </p>
          </div>
          <div className={`${CARD_CLASS} !rounded-[14px] !p-4`}>
            <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">Failed / blocked</p>
            <p className="mt-1 font-display text-[26px] text-ink">
              {loading ? "…" : <AnimatedNumber value={stats.blocked} />}
            </p>
          </div>
          <div className={`${CARD_CLASS} !rounded-[14px] !p-4`}>
            <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">Merchants scanning</p>
            <p className="mt-1 font-display text-[26px] text-ink">
              {loading ? "…" : <AnimatedNumber value={stats.merchantCount} />}
            </p>
          </div>
        </section>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3.5 py-1.5 font-manrope text-xs font-bold transition-colors ${
                filter === f.value
                  ? "bg-ink text-cream"
                  : "bg-peach text-warm-muted hover:bg-peach/70"
              }`}
            >
              {f.label}
            </button>
          ))}
          <MerchantDropdown value={merchantFilter} options={merchants} onChange={setMerchantFilter} />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-manrope text-sm text-red-600">
            {error}
          </div>
        )}

        <div className={`mt-5 ${CARD_CLASS} !rounded-[10px] !p-0 overflow-hidden`}>
          {loading ? (
            <p className="p-10 text-center font-manrope text-sm text-warm-muted">Loading logs…</p>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center font-manrope text-sm text-warm-muted">
              No crawl logs yet.
            </div>
          ) : visibleLogs.length === 0 ? (
            <div className="p-10 text-center font-manrope text-sm text-warm-muted">
              No crawl logs for this merchant.
            </div>
          ) : (
            <CustomScrollArea maxHeight={600}>
              <style>{`
                @keyframes ${ROW_FADE_IN} { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
              `}</style>
              <table className="min-w-full divide-y divide-ink/[.08] text-sm">
                <thead className="sticky top-0 z-10 border-b-2 border-terracotta/20 bg-cream-alt">
                  <tr>
                    <ColumnHeader icon="user" label="Merchant" />
                    <ColumnHeader icon="link" label="URL" />
                    <ColumnHeader icon="flag" label="Status" />
                    <ColumnHeader icon="box" label="Products" />
                    <ColumnHeader icon="clock" label="Duration" />
                    <ColumnHeader icon="warning" label="Error" />
                    <ColumnHeader icon="time" label="Time" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/[.08]">
                  {visibleLogs.map((log, i) => (
                    <tr
                      key={`${viewKey}-${log.id}`}
                      className="transition-colors hover:bg-cream/60"
                      style={{ opacity: 0, animation: `${ROW_FADE_IN} 0.35s ease ${Math.min(i * 25, 300)}ms forwards` }}
                    >
                      <td className="max-w-[170px] px-4 py-3 text-center">
                        {log.userEmail ? (
                          <div className="flex min-w-0 items-center justify-center gap-2">
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-manrope text-[10px] font-bold text-white"
                              style={{ background: avatarColorFor(log.userEmail) }}
                            >
                              {log.userEmail.charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate font-manrope text-xs text-ink" title={log.userEmail}>
                              {log.userEmail}
                            </span>
                          </div>
                        ) : (
                          <span className="font-manrope text-xs text-warm-muted">—</span>
                        )}
                      </td>
                      <td className="max-w-[200px] px-4 py-3 text-center">
                        <span className="block truncate font-mono text-xs text-ink" title={log.url}>
                          {log.url.replace(/^https?:\/\//, "")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-manrope text-xs font-bold ${STATUS_STYLES[log.status]}`}>
                          <StatusIcon status={log.status} />
                          {STATUS_LABELS[log.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-manrope text-sm text-ink">
                        {log.productsFound > 0 ? log.productsFound : <span className="text-warm-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs text-warm-muted">
                        {formatDuration(log.durationMs)}
                      </td>
                      <td className="max-w-[240px] px-4 py-3 text-center">
                        {log.errorMessage ? (
                          <span className="line-clamp-3 text-xs leading-relaxed text-red-600">
                            {log.errorMessage}
                          </span>
                        ) : (
                          <span className="text-warm-muted">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center font-manrope text-xs text-warm-muted">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CustomScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
