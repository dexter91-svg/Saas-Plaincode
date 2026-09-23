"use client";

import AppShell from "@/components/AppShell";
import LiveConversationsInbox from "@/components/LiveConversationsInbox";

export default function ConversationsPage() {
  return (
    <AppShell>
      <div className="min-h-full bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-display text-[28px] text-ink">Live conversations</h1>
          <p className="mt-1.5 font-manrope text-sm text-warm-body">
            Monitor chats in real time, take over when needed, then hand back to the AI. Full history is kept for
            context.
          </p>
          <LiveConversationsInbox />
        </div>
      </div>
    </AppShell>
  );
}
