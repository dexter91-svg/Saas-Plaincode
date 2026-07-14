"use client";

import { useEffect, useState, useRef } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useBot } from "@/components/BotContext";
import Logo from "@/components/Logo";

type SlaStatus = "resolved" | "waiting" | "high" | "critical" | "overdue";

type ForwardedItem = {
  id: string;
  conversationId: string;
  customer: string;
  preview: string;
  forwardedAs: string;
  ticketRef: string | null;
  replyText: string | null;
  repliedAt: string | null;
  createdAt: string;
  slaStatus: SlaStatus;
  slaPriority: number;
};

type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "agent";
  content: string;
  createdAt?: string;
};

function slaBadge(s: SlaStatus) {
  const map: Record<SlaStatus, { label: string; className: string }> = {
    resolved: { label: "Resolved", className: "bg-emerald-500/15 text-emerald-400 border-emerald-600/40" },
    waiting: { label: "Open", className: "bg-slate-500/15 text-slate-400 border-slate-600/40" },
    high: { label: "6h+ priority", className: "bg-amber-500/15 text-amber-300 border-amber-600/40" },
    critical: { label: "12h+ urgent", className: "bg-orange-500/15 text-orange-300 border-orange-600/40" },
    overdue: { label: "24h+ overdue", className: "bg-red-500/20 text-red-300 border-red-600/50" },
  };
  const x = map[s];
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${x.className}`}>
      {x.label}
    </span>
  );
}

function roleLabel(role: string): string {
  if (role === "user") return "Customer";
  if (role === "agent") return "Support Agent";
  return "AI Assistant";
}

function bubbleClass(role: string): string {
  if (role === "user") return "ml-8 bg-slate-700 text-slate-100";
  if (role === "agent") return "mr-8 border border-emerald-500/40 bg-emerald-950/50 text-emerald-50";
  return "mr-8 bg-slate-800 text-slate-200";
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
      <div className="min-h-screen flex flex-col bg-black text-slate-100">
        <header className="border-b border-slate-800 bg-black py-4">
          <div className="mx-auto max-w-4xl px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Logo size="sm" />
              <span className="text-sm font-semibold tracking-wide text-slate-200">Support Agent Portal</span>
            </div>
            {publicConv?.ticketRef && (
              <span className="font-mono text-xs text-primary-400 bg-primary-500/10 border border-primary-500/20 px-2 py-0.5 rounded">
                Ticket #{publicConv.ticketRef}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 flex flex-col">
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              {success}
            </div>
          )}

          {loadingPublic && !publicConv ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <p className="text-slate-400">Loading conversation thread...</p>
            </div>
          ) : !publicConv ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <p className="text-slate-500">Could not retrieve conversation. Link may be invalid or expired.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-6">
              {/* Ticket header details */}
              <Card className="border-slate-800/85 bg-slate-900/20">
                <h2 className="text-base font-semibold text-slate-200">Forwarded Conversation</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-slate-400">
                  <div>
                    <span className="block text-xs text-slate-500">Customer</span>
                    <span className="font-medium text-slate-300">{publicConv.customer}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">Customer Email</span>
                    <span className="font-medium text-slate-300">{publicConv.customerEmail || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">Date Forwarded</span>
                    <span>{new Date(publicConv.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">Status</span>
                    <span>
                      {publicConv.replyText ? (
                        <span className="text-emerald-400 font-medium">Replied & Resolved</span>
                      ) : (
                        <span className="text-amber-400 font-medium">Awaiting Support Reply</span>
                      )}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Message thread logs */}
              <Card className="flex-1 max-h-[500px] overflow-y-auto flex flex-col gap-4 p-4 border-slate-800/80 bg-slate-950/20">
                <div className="text-center border-b border-slate-800/50 pb-2 mb-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Conversation History</p>
                </div>
                {publicMessages.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-6">No message history.</p>
                ) : (
                  <div className="space-y-3">
                    {publicMessages.map((m) => (
                      <div key={m.id} className={`rounded-lg px-3 py-2 text-sm ${bubbleClass(m.role)}`}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {roleLabel(m.role)}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      </div>
                    ))}
                    <div ref={threadEndRef} />
                  </div>
                )}
              </Card>

              {/* Action reply card */}
              <Card className="border-slate-800/80 bg-slate-900/30">
                {publicConv.replyText ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-emerald-400">Support agent has already replied to this ticket:</p>
                    <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-slate-200">
                      <p className="text-xs text-slate-500 mb-1">Reply Content</p>
                      <p className="whitespace-pre-wrap">{publicConv.replyText}</p>
                      {publicConv.repliedAt && (
                        <p className="mt-1 text-xs text-slate-500 font-mono">
                          Replied at: {new Date(publicConv.repliedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : emailPromptOpen ? (
                  <form onSubmit={handlePublicReplySubmit} className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-200">Support Email Verification</h3>
                    <p className="text-xs text-slate-400">
                      To submit this reply, please enter your store's support email address:
                    </p>
                    <div>
                      <input
                        type="email"
                        required
                        value={agentEmail}
                        onChange={(e) => setAgentEmail(e.target.value)}
                        placeholder="e.g. support@yourstore.com"
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-primary-500"
                        disabled={saving}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" variant="primary" className="px-4 py-2 text-xs" disabled={saving || !agentEmail.trim()}>
                        {saving ? "Submitting reply..." : "Submit Reply"}
                      </Button>
                      <Button type="button" variant="ghost" className="px-4 py-2 text-xs" onClick={() => setEmailPromptOpen(false)} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-200">Send Support Reply</h3>
                    <p className="text-xs text-slate-400">
                      Type your response below. It will show up in the customer's chat widget and email.
                    </p>
                    <div>
                      <textarea
                        rows={4}
                        placeholder="e.g. Your refund has been processed..."
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary-500"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      className="px-4 py-2 text-xs"
                      disabled={!replyDraft.trim()}
                      onClick={() => setEmailPromptOpen(true)}
                    >
                      Send Reply
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Standard Mode (requires authentication - wrapped in AppShell)
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-100">Forwarded conversations</h1>
        <p className="mt-1 text-slate-400">
          Forwarded to your support email. Replies (email or dashboard) go to the customer in chat and by email. Tickets stay open until you reply—never auto-closed. SLA: 6h / 12h / 24h shows priority; customers get check-in emails at those times if you haven&apos;t replied yet.
        </p>
        <Card className="mt-6">
          {loading ? (
            <p className="py-8 text-center text-slate-400">Loading…</p>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              No forwarded conversations yet. Forward from the Conversations tab or when the AI can&apos;t help (e.g. order cancellation).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700/80 text-sm">
                <thead className="bg-slate-900/80">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">Customer</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">Preview</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">When</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">Reply</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/80 bg-slate-900/40">
                  {list.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 align-top">
                        {slaBadge(item.slaStatus)}
                      </td>
                      <td className="px-4 py-3 text-slate-100">{item.customer}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-xs">
                        <span className="line-clamp-2">{item.preview}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        {item.replyText ? (
                          <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Your reply (shown in chat)</p>
                            <p className="whitespace-pre-wrap">{item.replyText}</p>
                            {item.repliedAt && (
                              <p className="mt-1 text-xs text-slate-500">
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
                              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                className="px-3 py-1 text-xs"
                                disabled={saving || !replyDraft.trim()}
                                onClick={() => handleSaveReply(item.id)}
                              >
                                {saving ? "Saving…" : "Save reply"}
                              </Button>
                              <Button
                                variant="ghost"
                                className="px-3 py-1 text-xs"
                                onClick={() => { setReplyingId(null); setReplyDraft(""); }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="px-3 py-1 text-xs"
                            onClick={() => { setReplyingId(item.id); setReplyDraft(""); }}
                          >
                            Add reply
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
