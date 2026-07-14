"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useBot } from "@/components/BotContext";

type TicketRow = {
  id: string;
  ticketRef: string;
  type: string;
  status: string;
  outcome: string | null;
  customer: string;
  queryPreview: string;
  createdAt: number;
};

const TYPE_LABELS: Record<string, string> = {
  ai_resolved: "AI Resolved",
  forwarded_email: "Forwarded to Email",
  forwarded_human: "Forwarded to Human",
  database_check: "Database Check",
  escalated: "Escalated",
  other: "Other",
};

const TYPE_STYLES: Record<string, string> = {
  ai_resolved: "bg-emerald-500/15 text-emerald-400",
  forwarded_email: "bg-sky-500/15 text-sky-400",
  forwarded_human: "bg-amber-500/15 text-amber-400",
  database_check: "bg-primary-500/15 text-primary-400",
  escalated: "bg-rose-500/15 text-rose-400",
  other: "bg-slate-500/15 text-slate-400",
};

function formatTimeAgo(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export default function TicketsPage() {
  const { chatbotId } = useBot();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = chatbotId ? `?chatbotId=${encodeURIComponent(chatbotId)}` : "";
    fetch(`/api/tickets${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.tickets)) setTickets(data.tickets);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chatbotId]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-100">Tickets</h1>
        <p className="mt-1 text-slate-400">
          Every conversation creates a ticket. Ticket created → AI or support replies → Ticket resolved.
        </p>

        {loading ? (
          <p className="mt-6 text-slate-400">Loading tickets…</p>
        ) : tickets.length === 0 ? (
          <Card className="mt-6">
            <p className="text-center text-slate-500">
              No tickets yet. Chat with your bot or forward conversations to create tickets.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/test-chatbot">
                <Button variant="outline">Test chatbot</Button>
              </Link>
              <Link href="/conversations">
                <Button variant="ghost">View conversations</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="mt-6">
            <ul className="divide-y divide-slate-700/80">
              {tickets
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((ticket) => (
                  <li key={ticket.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold text-primary-400">
                            #{ticket.ticketRef}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              ticket.status === "resolved" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                            }`}
                          >
                            {ticket.status === "resolved" ? "Resolved" : ticket.status}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              TYPE_STYLES[ticket.type] ?? TYPE_STYLES.other
                            }`}
                          >
                            {TYPE_LABELS[ticket.type] ?? ticket.type}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatTimeAgo(ticket.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 font-medium text-slate-200">{ticket.customer}</p>
                        <p className="mt-0.5 text-sm text-slate-400">{ticket.queryPreview}</p>
                        {ticket.outcome && (
                          <p className="mt-1 text-xs text-slate-500">Outcome: {ticket.outcome}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
