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
    <div className="flex min-w-0 max-w-[min(100vw-12rem,280px)] flex-col gap-1 sm:max-w-[320px]">
      <label htmlFor="store-switcher" className="sr-only">
        Active store
      </label>
      <select
        id="store-switcher"
        value={chatbotId ?? ""}
        onChange={(e) => {
          const id = e.target.value;
          if (id) void selectStore(id);
        }}
        className="w-full truncate rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-left text-xs font-medium text-slate-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/40 sm:text-sm"
      >
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label || s.name || s.websiteUrl}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 sm:text-xs">
        <span>
          {stores.length} / {limitLabel} stores
        </span>
        {!atCap && (
          <Link href="/create-bot" className="text-primary-400 hover:text-primary-300">
            + Add store
          </Link>
        )}
        {atCap && storeLimit !== null && (
          <Link href="/pricing" className="text-primary-400 hover:text-primary-300">
            Upgrade for more
          </Link>
        )}
        {chatbotId && (
          <button
            type="button"
            onClick={() => void handleRemoveStore()}
            disabled={removing}
            className="text-rose-400/90 hover:text-rose-300 disabled:opacity-50"
          >
            {removing ? "Removing…" : "Remove this store"}
          </button>
        )}
      </div>
    </div>
  );
}
