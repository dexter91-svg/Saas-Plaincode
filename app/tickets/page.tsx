"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useBot } from "@/components/BotContext";
import { WIZARD_CARD_CLASS, WIZARD_OUTLINE_BUTTON_CLASS } from "@/lib/wizard-ui";

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
  ai_resolved: "bg-sage/10 text-sage",
  forwarded_email: "bg-blue-100 text-blue-700",
  forwarded_human: "bg-amber-100 text-amber-700",
  database_check: "bg-terracotta/10 text-terracotta",
  escalated: "bg-red-100 text-red-600",
  other: "bg-ink/[.06] text-warm-body",
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
      <div className="min-h-full bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-display text-[28px] text-ink">Tickets</h1>
          <p className="mt-1.5 font-manrope text-sm text-warm-body">
            Every conversation creates a ticket. Ticket created → AI or support replies → ticket resolved.
          </p>

          {loading ? (
            <p className="mt-6 font-manrope text-sm text-warm-muted">Loading tickets…</p>
          ) : tickets.length === 0 ? (
            <div className={`mt-6 ${WIZARD_CARD_CLASS} !p-11 text-center`}>
              <p className="font-manrope text-sm text-warm-muted">
                No tickets yet. Chat with your bot or forward conversations to create tickets.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3.5">
                <Link href="/test-chatbot" className={`${WIZARD_OUTLINE_BUTTON_CLASS} border-terracotta text-terracotta hover:bg-terracotta/5`}>
                  Test chatbot
                </Link>
                <Link href="/conversations" className={WIZARD_OUTLINE_BUTTON_CLASS}>
                  View conversations
                </Link>
              </div>
            </div>
          ) : (
            <div className={`mt-6 ${WIZARD_CARD_CLASS}`}>
              <ul className="divide-y divide-ink/[.08]">
                {tickets
                  .slice()
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((ticket) => (
                    <li key={ticket.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-terracotta">
                              #{ticket.ticketRef}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 font-manrope text-xs font-bold ${
                                ticket.status === "resolved" ? "bg-sage/10 text-sage" : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {ticket.status === "resolved" ? "Resolved" : ticket.status}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 font-manrope text-xs font-bold ${
                                TYPE_STYLES[ticket.type] ?? TYPE_STYLES.other
                              }`}
                            >
                              {TYPE_LABELS[ticket.type] ?? ticket.type}
                            </span>
                            <span className="font-manrope text-xs text-warm-muted">
                              {formatTimeAgo(ticket.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1.5 font-manrope text-sm font-semibold text-ink">{ticket.customer}</p>
                          <p className="mt-0.5 font-manrope text-sm text-warm-body">{ticket.queryPreview}</p>
                          {ticket.outcome && (
                            <p className="mt-1 font-manrope text-xs text-warm-muted">Outcome: {ticket.outcome}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
