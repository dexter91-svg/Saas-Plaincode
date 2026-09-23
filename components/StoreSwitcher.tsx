"use client";

import Link from "next/link";
import { useState } from "react";
import { useBot } from "@/components/BotContext";

export default function StoreSwitcher() {
  const { stores, chatbotId, selectStore, storeLimit } = useBot();
  const [removing, setRemoving] = useState(false);

  if (stores.length === 0) return null;

  const atCap = storeLimit !== null && stores.length >= storeLimit;
  const limitLabel = storeLimit === null ? "∞" : String(storeLimit);

  const handleRemoveStore = async () => {
    if (!chatbotId) return;
    if (
      !window.confirm(
        "Remove this store from your account? The chatbot and its training data for this store will be deleted. You can connect a new store from Add store."
      )
    ) {
      return;
    }
    setRemoving(true);
    try {
      const r = await fetch(`/api/chatbots/${encodeURIComponent(chatbotId)}`, { method: "DELETE" });
      const d = (await r.json().catch(() => ({}))) as { error?: string; remainingChatbotIds?: string[] };
      if (!r.ok) {
        throw new Error(d.error || "Could not remove this store.");
      }
      const next = d.remainingChatbotIds;
      if (Array.isArray(next) && next.length > 0) {
        await selectStore(next[0]);
        window.location.reload();
      } else {
        window.location.href = "/create-bot";
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex min-w-0 max-w-[min(100vw-12rem,280px)] flex-col gap-1.5 sm:max-w-[320px]">
      <label htmlFor="store-switcher" className="sr-only">
        Active store
      </label>
      <div className="relative">
        <select
          id="store-switcher"
          value={chatbotId ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            if (id) void selectStore(id);
          }}
          className="w-full cursor-pointer appearance-none truncate rounded-[10px] border border-ink/[.15] bg-white py-2 pl-3.5 pr-8 text-left font-manrope text-sm font-bold text-ink transition-colors hover:border-ink/25 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label || s.name || s.websiteUrl}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-manrope text-[10px] text-warm-muted sm:text-xs">
        <span>
          {stores.length} / {limitLabel} stores
        </span>
        {!atCap && (
          <Link href="/create-bot" className="text-terracotta hover:text-terracotta-dark">
            + Add store
          </Link>
        )}
        {atCap && storeLimit !== null && (
          <Link href="/pricing" className="text-terracotta hover:text-terracotta-dark">
            Upgrade for more
          </Link>
        )}
        {chatbotId && (
          <button
            type="button"
            onClick={() => void handleRemoveStore()}
            disabled={removing}
            className="text-red-500 hover:text-red-600 disabled:opacity-50"
          >
            {removing ? "Removing…" : "Remove this store"}
          </button>
        )}
      </div>
    </div>
  );
}
