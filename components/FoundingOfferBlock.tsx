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
  return (
    <div className="mx-auto mt-10 max-w-2xl space-y-3 text-center">
      <p className="text-sm text-slate-300 sm:text-base">
        <span className="font-semibold text-primary-400">Growth Plan</span>
        {" — "}
        <span className="font-semibold text-slate-100">$79/month</span> flat rate. Includes full store training and instant AI support.
      </p>

      <p className="text-sm text-slate-500">
        Shopify &amp; WooCommerce Ready · Auto-scrapes products &amp; policies · 100 free chats/month
      </p>
    </div>
  );
}
