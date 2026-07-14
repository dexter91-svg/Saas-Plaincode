"use client";

import AppShell from "@/components/AppShell";
import LiveConversationsInbox from "@/components/LiveConversationsInbox";

export default function ConversationsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-100">Live conversations</h1>
        <p className="mt-1 text-slate-400">
          Monitor chats in real time, take over when needed, then hand back to the AI — full history is kept for
          context.
        </p>
        <LiveConversationsInbox />
      </div>
    </AppShell>
  );
}
