"use client";

import { Fragment, useEffect, useState, useRef } from "react";
import AppShell from "@/components/AppShell";
import { useBot } from "@/components/BotContext";
import WizardHeader from "@/components/WizardHeader";
import { WIZARD_CARD_CLASS, WIZARD_INPUT_CLASS, WIZARD_PRIMARY_BUTTON_CLASS, WIZARD_OUTLINE_BUTTON_CLASS } from "@/lib/wizard-ui";

type SlaStatus = "resolved" | "waiting" | "high" | "critical" | "overdue";
type EscalationStatus = "new" | "acknowledged" | "resolved";

type ForwardedItem = {
  id: string;
  conversationId: string;
  chatbotId: string | null;
  customer: string;
  customerEmail: string | null;
  preview: string;
  forwardedAs: string;
  ticketRef: string | null;
  orderRef: string | null;
  replyText: string | null;
  repliedAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  status: EscalationStatus;
  slaStatus: SlaStatus;
  slaPriority: number;
};

type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "agent";
  content: string;
  createdAt?: string;
};

// The dashboard's real status — New / Acknowledged / Resolved — is the primary badge shown.
function statusBadge(s: EscalationStatus) {
  const map: Record<EscalationStatus, { label: string; className: string }> = {
    new: { label: "New", className: "bg-terracotta/10 text-terracotta" },
    acknowledged: { label: "Acknowledged", className: "bg-blue-100 text-blue-700" },
    resolved: { label: "Resolved", className: "bg-sage/10 text-sage" },
  };
  const x = map[s];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 font-manrope text-xs font-bold ${x.className}`}>
      {x.label}
    </span>
  );
}

// Secondary "how long has this been waiting" hint shown under the status badge — not a
// competing status, just context for how urgent an unresolved item is.
function slaHint(s: SlaStatus) {
  const map: Partial<Record<SlaStatus, string>> = {
    high: "6h+ waiting",
    critical: "12h+ waiting",
    overdue: "24h+ waiting",
  };
  const label = map[s];
  if (!label) return null;
  return <span className="mt-1 block font-manrope text-[11px] text-warm-muted">{label}</span>;
}

function roleLabel(role: string): string {
  if (role === "user") return "Customer";
  if (role === "agent") return "Support Agent";
  return "AI Assistant";
}

function bubbleClass(role: string): string {
  if (role === "user") return "ml-8 bg-peach text-ink";
  if (role === "agent") return "mr-8 border border-sage/40 bg-sage/10 text-ink";
  return "mr-8 bg-cream-alt text-ink";
}

export default function ForwardedConversationsPage({
  searchParams,
}: {
  searchParams: { id?: string; token?: string };
}) {
  const { chatbotId } = useBot();
  
  // URL Token / Read-Only states
  const token = searchParams.token || null;
  const conversationId = searchParams.id || null;

  const [publicConv, setPublicConv] = useState<any>(null);
  const [publicMessages, setPublicMessages] = useState<ChatMsg[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [emailPromptOpen, setEmailPromptOpen] = useState(false);
  const [agentEmail, setAgentEmail] = useState("");
  
  // Standard states
  const [list, setList] = useState<ForwardedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, ChatMsg[]>>({});
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch public read-only conversation if parameters are loaded
  const loadPublicConversation = () => {
    if (!conversationId || !token) return;
    setLoadingPublic(true);
    setError(null);
    fetch(`/api/forwarded/public?id=${encodeURIComponent(conversationId)}&token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setPublicConv(data.conversation);
          setPublicMessages(data.messages || []);
        }
      })
      .catch(() => setError("Failed to load conversation details."))
      .finally(() => setLoadingPublic(false));
  };

  useEffect(() => {
    if (conversationId && token) {
      loadPublicConversation();
    }
  }, [conversationId, token]);

  // Scroll to bottom when public messages load
  useEffect(() => {
    if (publicMessages.length > 0) {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [publicMessages]);

  const fetchList = () => {
    setLoading(true);
    const q = chatbotId ? `?chatbotId=${encodeURIComponent(chatbotId)}` : "";
    fetch(`/api/forwarded${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.forwarded)) setList(data.forwarded);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      fetchList();
    }
  }, [chatbotId, token]);

  useEffect(() => {
    if (token) return;
    const t = setInterval(() => {
      const q = chatbotId ? `?chatbotId=${encodeURIComponent(chatbotId)}` : "";
      fetch(`/api/forwarded${q}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.forwarded)) setList(data.forwarded);
        })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, [chatbotId, token]);

  // Standard Reply
  const handleSaveReply = async (id: string) => {
    if (!replyDraft.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/forwarded/${id}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText: replyDraft.trim() }),
      });
      if (res.ok) {
        setReplyingId(null);
        setReplyDraft("");
        fetchList();
      }
    } finally {
      setSaving(false);
    }
  };

  // Mark an escalation as seen/being-handled, without needing a reply ready yet.
  const handleAcknowledge = async (id: string) => {
    setAcknowledgingId(id);
    try {
      const res = await fetch(`/api/forwarded/${id}/acknowledge`, { method: "PATCH" });
      if (res.ok) {
        setList((prev) =>
          prev.map((item) =>
            item.id === id && item.status === "new"
              ? { ...item, status: "acknowledged", acknowledgedAt: new Date().toISOString() }
              : item
          )
        );
      }
    } finally {
      setAcknowledgingId(null);
    }
  };

  // Full conversation history, fetched on demand per row so the list load stays light.
  const toggleHistory = async (item: ForwardedItem) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    if (expandedMessages[item.id] || !item.chatbotId) return;
    setLoadingHistoryId(item.id);
    try {
      const res = await fetch(
        `/api/conversations/messages?conversationId=${encodeURIComponent(item.conversationId)}&chatbotId=${encodeURIComponent(item.chatbotId)}`
      );
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.messages)) {
        setExpandedMessages((prev) => ({ ...prev, [item.id]: data.messages }));
      }
    } finally {
      setLoadingHistoryId(null);
    }
  };

  // Public/Token Reply
  const handlePublicReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyDraft.trim() || !agentEmail.trim() || !conversationId || !token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/forwarded/public/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: conversationId,
          token,
          replyText: replyDraft.trim(),
          email: agentEmail.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to submit reply");

      setSuccess("Reply successfully sent to the customer!");
      setReplyDraft("");
      setEmailPromptOpen(false);
      loadPublicConversation();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSaving(false);
    }
  };

  // If viewing single conversation in public read-only mode
  if (token && conversationId) {
    return (
      <div className="flex min-h-screen flex-col bg-cream">
        <WizardHeader />
        <div className="border-b border-ink/[.08]">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 pb-4 sm:px-6">
            <span className="font-manrope text-sm font-bold text-ink">Support Agent Portal</span>
            {publicConv?.ticketRef && (
              <span className="rounded-full border border-terracotta/20 bg-terracotta/10 px-2.5 py-0.5 font-mono text-xs text-terracotta">
                Ticket #{publicConv.ticketRef}
              </span>
            )}
          </div>
        </div>

        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-manrope text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-lg border border-sage/30 bg-sage/10 px-4 py-3 font-manrope text-sm text-sage">
              {success}
            </div>
          )}

          {loadingPublic && !publicConv ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <p className="font-manrope text-sm text-warm-muted">Loading conversation thread…</p>
            </div>
          ) : !publicConv ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <p className="font-manrope text-sm text-warm-muted">Could not retrieve conversation. Link may be invalid or expired.</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-5">
              {/* Ticket header details */}
              <div className={WIZARD_CARD_CLASS}>
                <h2 className="font-manrope text-[15px] font-bold text-ink">Forwarded Conversation</h2>
                <div className="mt-3 grid gap-3 font-manrope text-sm text-warm-body sm:grid-cols-2">
                  <div>
                    <span className="block font-manrope text-xs text-warm-muted">Customer</span>
                    <span className="font-semibold text-ink">{publicConv.customer}</span>
                  </div>
                  <div>
                    <span className="block font-manrope text-xs text-warm-muted">Customer Email</span>
                    <span className="font-semibold text-ink">{publicConv.customerEmail || "—"}</span>
                  </div>
                  <div>
                    <span className="block font-manrope text-xs text-warm-muted">Date Forwarded</span>
                    <span>{new Date(publicConv.createdAt).toLocaleString()}</span>
                  </div>
                  {publicConv.orderRef && (
                    <div>
                      <span className="block font-manrope text-xs text-warm-muted">Order</span>
                      <span className="font-semibold text-ink">{publicConv.orderRef}</span>
                    </div>
                  )}
                  <div>
                    <span className="block font-manrope text-xs text-warm-muted">Status</span>
                    <span>
                      {publicConv.replyText ? (
                        <span className="font-semibold text-sage">Replied &amp; Resolved</span>
                      ) : (
                        <span className="font-semibold text-amber-700">Awaiting Support Reply</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message thread logs */}
              <div className={`flex max-h-[500px] flex-1 flex-col gap-4 overflow-y-auto ${WIZARD_CARD_CLASS} !p-4`}>
                <div className="mb-2 border-b border-ink/[.08] pb-2 text-center">
                  <p className="font-manrope text-xs uppercase tracking-wider text-warm-muted">Conversation History</p>
                </div>
                {publicMessages.length === 0 ? (
                  <p className="py-6 text-center font-manrope text-sm text-warm-muted">No message history.</p>
                ) : (
                  <div className="space-y-3">
                    {publicMessages.map((m) => (
                      <div key={m.id} className={`rounded-lg px-3 py-2 font-manrope text-sm ${bubbleClass(m.role)}`}>
                        <p className="mb-1 font-manrope text-[10px] font-bold uppercase tracking-wide text-warm-muted">
                          {roleLabel(m.role)}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      </div>
                    ))}
                    <div ref={threadEndRef} />
                  </div>
                )}
              </div>

              {/* Action reply card */}
              <div className={WIZARD_CARD_CLASS}>
                {publicConv.replyText ? (
                  <div className="space-y-2">
                    <p className="font-manrope text-sm font-bold text-sage">Support agent has already replied to this ticket:</p>
                    <div className="rounded-[10px] border border-ink/[.08] bg-cream p-3 text-ink">
                      <p className="mb-1 font-manrope text-xs text-warm-muted">Reply Content</p>
                      <p className="whitespace-pre-wrap font-manrope text-sm">{publicConv.replyText}</p>
                      {publicConv.repliedAt && (
                        <p className="mt-1 font-mono text-xs text-warm-muted">
                          Replied at: {new Date(publicConv.repliedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : emailPromptOpen ? (
                  <form onSubmit={handlePublicReplySubmit} className="space-y-3.5">
                    <h3 className="font-manrope text-sm font-bold text-ink">Support Email Verification</h3>
                    <p className="font-manrope text-xs text-warm-body">
                      To submit this reply, please enter your store&apos;s support email address:
                    </p>
                    <input
                      type="email"
                      required
                      value={agentEmail}
                      onChange={(e) => setAgentEmail(e.target.value)}
                      placeholder="e.g. support@yourstore.com"
                      className={WIZARD_INPUT_CLASS}
                      disabled={saving}
                    />
                    <div className="flex gap-2.5">
                      <button
                        type="submit"
                        className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-4 py-2.5 text-xs`}
                        disabled={saving || !agentEmail.trim()}
                      >
                        {saving ? "Submitting reply…" : "Submit Reply"}
                      </button>
                      <button
                        type="button"
                        className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-4 py-2.5 text-xs`}
                        onClick={() => setEmailPromptOpen(false)}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3.5">
                    <h3 className="font-manrope text-sm font-bold text-ink">Send Support Reply</h3>
                    <p className="font-manrope text-xs text-warm-body">
                      Type your response below. It will show up in the customer&apos;s chat widget and email.
                    </p>
                    <textarea
                      rows={4}
                      placeholder="e.g. Your refund has been processed..."
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      className={WIZARD_INPUT_CLASS}
                    />
                    <button
                      type="button"
                      className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-4 py-2.5 text-xs`}
                      disabled={!replyDraft.trim()}
                      onClick={() => setEmailPromptOpen(true)}
                    >
                      Send Reply
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Standard Mode (requires authentication - wrapped in AppShell)
  return (
    <AppShell>
      <div className="min-h-full bg-cream">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-display text-[28px] text-ink">Escalations</h1>
          <p className="mt-1.5 max-w-3xl font-manrope text-sm leading-relaxed text-warm-body">
            Every escalated conversation, tracked here — not just sitting in an inbox where it could get missed.
            New → Acknowledge it once you&apos;ve seen it → Resolved once you reply. Customers get check-in emails
            at 6h / 12h / 24h if a reply is still outstanding.
          </p>
          <div className={`mt-6 ${WIZARD_CARD_CLASS} !p-0 overflow-hidden`}>
            {loading ? (
              <p className="py-10 text-center font-manrope text-sm text-warm-muted">Loading…</p>
            ) : list.length === 0 ? (
              <p className="px-10 py-10 text-center font-manrope text-sm text-warm-muted">
                No escalations yet. Forward from the Conversations tab or when the AI can&apos;t help
                (e.g. order cancellation).
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-ink/[.08] text-sm">
                  <thead className="bg-cream-alt">
                    <tr>
                      <th className="px-4 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Status</th>
                      <th className="px-4 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Customer</th>
                      <th className="px-4 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Order</th>
                      <th className="px-4 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Preview</th>
                      <th className="px-4 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">When</th>
                      <th className="px-4 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/[.08]">
                    {list.map((item) => (
                      <Fragment key={item.id}>
                        <tr>
                          <td className="px-4 py-3.5 align-top">
                            {statusBadge(item.status)}
                            {item.status !== "resolved" && slaHint(item.slaStatus)}
                          </td>
                          <td className="px-4 py-3.5 align-top font-manrope">
                            <span className="text-sm font-semibold text-ink">{item.customer}</span>
                            {item.customerEmail && (
                              <span className="block text-xs text-warm-muted">{item.customerEmail}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 align-top font-manrope text-sm text-ink">
                            {item.orderRef || <span className="text-warm-muted">—</span>}
                          </td>
                          <td className="max-w-xs px-4 py-3.5 align-top font-manrope text-sm text-warm-body">
                            <span className="line-clamp-2">{item.preview}</span>
                            <button
                              type="button"
                              onClick={() => toggleHistory(item)}
                              className="mt-1 block font-manrope text-xs font-bold text-terracotta hover:text-terracotta-dark"
                            >
                              {expandedId === item.id ? "Hide conversation" : "View conversation"}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 align-top font-manrope text-xs text-warm-muted">
                            {new Date(item.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            {item.replyText ? (
                              <div className="rounded-[10px] border border-ink/[.08] bg-cream px-3 py-2 text-ink">
                                <p className="mb-1 font-manrope text-xs text-warm-muted">Your reply (shown in chat)</p>
                                <p className="whitespace-pre-wrap font-manrope text-sm">{item.replyText}</p>
                                {item.repliedAt && (
                                  <p className="mt-1 font-manrope text-xs text-warm-muted">
                                    {new Date(item.repliedAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            ) : replyingId === item.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={replyDraft}
                                  onChange={(e) => setReplyDraft(e.target.value)}
                                  placeholder="e.g. Your order has been cancelled. Confirmation email sent."
                                  rows={3}
                                  className={WIZARD_INPUT_CLASS}
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-3.5 py-2 text-xs`}
                                    disabled={saving || !replyDraft.trim()}
                                    onClick={() => handleSaveReply(item.id)}
                                  >
                                    {saving ? "Saving…" : "Save reply"}
                                  </button>
                                  <button
                                    type="button"
                                    className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-3.5 py-2 text-xs`}
                                    onClick={() => { setReplyingId(null); setReplyDraft(""); }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-start gap-2">
                                {item.status === "new" && (
                                  <button
                                    type="button"
                                    disabled={acknowledgingId === item.id}
                                    className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-3.5 py-2 text-xs`}
                                    onClick={() => handleAcknowledge(item.id)}
                                  >
                                    {acknowledgingId === item.id ? "Acknowledging…" : "Acknowledge"}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-3.5 py-2 text-xs`}
                                  onClick={() => { setReplyingId(item.id); setReplyDraft(""); }}
                                >
                                  Add reply
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {expandedId === item.id && (
                          <tr>
                            <td colSpan={6} className="bg-cream px-4 py-4">
                              <p className="mb-2 font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">
                                Full conversation history
                              </p>
                              {loadingHistoryId === item.id ? (
                                <p className="font-manrope text-sm text-warm-muted">Loading…</p>
                              ) : !expandedMessages[item.id] || expandedMessages[item.id].length === 0 ? (
                                <p className="font-manrope text-sm text-warm-muted">No message history.</p>
                              ) : (
                                <div className="max-h-80 space-y-2.5 overflow-y-auto">
                                  {expandedMessages[item.id].map((m) => (
                                    <div key={m.id} className={`rounded-lg px-3 py-2 font-manrope text-sm ${bubbleClass(m.role)}`}>
                                      <p className="mb-1 font-manrope text-[10px] font-bold uppercase tracking-wide text-warm-muted">
                                        {roleLabel(m.role)}
                                      </p>
                                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
