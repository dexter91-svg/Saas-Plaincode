"use client";

import { useEffect, useMemo, useState } from "react";
import { formatFoundingOfferClosingDate, getFoundingOfferEndMs } from "@/lib/founding-offer";

type Remaining = { total: number; d: number; h: number; m: number; s: number };

function getRemaining(end: number): Remaining {
  const total = Math.max(0, end - Date.now());
  const sec = Math.floor(total / 1000);
  return {
    total,
    d: Math.floor(sec / 86400),
    h: Math.floor((sec % 86400) / 3600),
    m: Math.floor((sec % 3600) / 60),
    s: sec % 60,
  };
}

function CountdownUnit({
  value,
  label,
  placeholder = false,
}: {
  value?: number;
  label: string;
  placeholder?: boolean;
}) {
  const shown = placeholder
    ? "--"
    : label === "Days"
      ? String(value!)
      : String(value!).padStart(2, "0");
  return (
    <div className="flex min-w-[3.25rem] flex-col items-center rounded-lg border border-slate-600/80 bg-slate-800/70 px-2.5 py-2 sm:min-w-[3.75rem] sm:px-3">
      <span className="text-lg font-semibold tabular-nums text-slate-100 sm:text-xl">{shown}</span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}

export default function FoundingOfferBlock() {
  const endMs = useMemo(() => getFoundingOfferEndMs(), []);
  const closingLabel = useMemo(() => formatFoundingOfferClosingDate(endMs), [endMs]);
  /** `null` until mounted — avoids SSR vs client `Date.now()` mismatch during hydration. */
  const [rem, setRem] = useState<Remaining | null>(null);

  useEffect(() => {
    function tick() {
      setRem(getRemaining(endMs));
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endMs]);

  return (
    <div className="mx-auto mt-10 max-w-2xl space-y-4 text-center">
      <p className="text-sm text-slate-300 sm:text-base">
        <span className="font-semibold text-primary-400">Founding Member Pricing</span>
        {" — "}
        <span className="font-semibold text-slate-100">$79/month</span> locked for life. Closes{" "}
        <time dateTime={new Date(endMs).toISOString()}>{closingLabel}</time>.
      </p>

      {rem === null ? (
        <div
          className="flex flex-wrap items-stretch justify-center gap-2 sm:gap-3"
          role="status"
          aria-busy="true"
          aria-label="Loading countdown"
        >
          <CountdownUnit label="Days" placeholder />
          <CountdownUnit label="Hours" placeholder />
          <CountdownUnit label="Mins" placeholder />
          <CountdownUnit label="Secs" placeholder />
        </div>
      ) : rem.total > 0 ? (
        <div
          className="flex flex-wrap items-stretch justify-center gap-2 sm:gap-3"
          role="timer"
          aria-live="polite"
          aria-label="Time remaining until founding member pricing closes"
        >
          <CountdownUnit value={rem.d} label="Days" />
          <CountdownUnit value={rem.h} label="Hours" />
          <CountdownUnit value={rem.m} label="Mins" />
          <CountdownUnit value={rem.s} label="Secs" />
        </div>
      ) : (
        <p className="text-sm text-slate-500">Founding member enrollment has closed.</p>
      )}

      <p className="text-sm text-slate-500">
        Trusted by 20+ stores · 92% resolution rate · 2,670+ queries resolved this month
      </p>
    </div>
  );
}
