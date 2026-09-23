"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBot } from "@/components/BotContext";
import { useAgentNotificationSounds } from "@/hooks/useAgentNotificationSounds";
import { isAgentAudioUnlocked } from "@/lib/agent-notification-sounds";
import { WIZARD_CARD_CLASS, WIZARD_INPUT_CLASS, WIZARD_PRIMARY_BUTTON_CLASS, WIZARD_OUTLINE_BUTTON_CLASS } from "@/lib/wizard-ui";

type ConversationRow = {
  id: string;
  customer: string;
  preview: string;
  date: string | Date;
  status: string;
  handoffMode: "ai" | "human";
  assignedAgentId: string | null;
  requestsHuman: boolean;
  isLive: boolean;
  lastMessageRole: string | null;
  messageCount: number;
  lastUserMessageId: string | null;
  userMessageCount: number;
};

type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "agent";
  content: string;
  createdAt?: string;
};

function formatRelative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function roleLabel(role: string): string {
  if (role === "user") return "Customer";
  if (role === "agent") return "You (agent)";
  return "AI";
}

function bubbleClass(role: string): string {
  if (role === "user") return "ml-8 bg-peach text-ink";
  if (role === "agent") return "mr-8 border border-sage/40 bg-sage/10 text-ink";
  return "mr-8 bg-cream-alt text-ink";
}

export default function LiveConversationsInbox() {
  const { chatbotId } = useBot();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [handoffMode, setHandoffMode] = useState<"ai" | "human">("ai");
  const [assignedAgentId, setAssignedAgentId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [agentInput, setAgentInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [filter, setFilter] = useState<"all" | "agent" | "normal">("all");
  const lastSinceRef = useRef<string>("");
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/users/notification-sounds")
      .then((r) => r.json())
      .then((data: { enabled?: boolean }) => {
        setSoundEnabled(Boolean(data.enabled));
      })
      .catch(() => setSoundEnabled(true));
  }, []);

  useEffect(() => {
    const check = () => setAudioReady(isAgentAudioUnlocked());
    check();
    const t = window.setInterval(check, 1000);
    return () => window.clearInterval(t);
  }, []);

  useAgentNotificationSounds(
    conversations.map((c) => ({
      id: c.id,
      lastUserMessageId: c.lastUserMessageId,
      userMessageCount: c.userMessageCount,
      requestsHuman: c.requestsHuman,
    })),
    Boolean(soundEnabled),
    Boolean(chatbotId && audioReady && soundEnabled !== null),
    chatbotId
  );

  const loadList = useCallback(() => {
    const q = chatbotId ? `?chatbotId=${encodeURIComponent(chatbotId)}` : "";
    return fetch(`/api/conversations${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.conversations)) {
          setConversations(data.conversations);
        }
      })
      .catch(() => setConversations([]));
  }, [chatbotId]);

  const loadThread = useCallback(
    (conversationId: string, full = false) => {
      if (!chatbotId) return Promise.resolve();
      const sinceParam =
        !full && lastSinceRef.current
          ? `&since=${encodeURIComponent(lastSinceRef.current)}`
          : "";
      return fetch(
        `/api/conversations/messages?conversationId=${encodeURIComponent(conversationId)}&chatbotId=${encodeURIComponent(chatbotId)}${sinceParam}`
      )
        .then((r) => r.json())
        .then((data: { messages?: ChatMsg[]; handoffMode?: "ai" | "human" }) => {
          if (data.handoffMode) setHandoffMode(data.handoffMode);
          const incoming = data.messages || [];
          if (full) {
            setMessages(incoming);
          } else if (incoming.length > 0) {
            setMessages((prev) => {
              const ids = new Set(prev.map((m) => m.id));
              const merged = [...prev];
              incoming.forEach((m) => {
                if (!ids.has(m.id)) merged.push(m);
              });
              return merged;
            });
          }
          const last = incoming[incoming.length - 1];
          if (last?.createdAt) lastSinceRef.current = last.createdAt;
          else if (full && incoming.length > 0) {
            const tail = incoming[incoming.length - 1];
            if (tail.createdAt) lastSinceRef.current = tail.createdAt;
          }
        });
    },
    [chatbotId]
  );

  const loadState = useCallback((conversationId: string) => {
    return fetch(`/api/conversations/${encodeURIComponent(conversationId)}/state`)
      .then((r) => r.json())
      .then((data: { handoffMode?: string; assignedAgentId?: string | null; isLive?: boolean }) => {
        if (data.handoffMode === "human" || data.handoffMode === "ai") {
          setHandoffMode(data.handoffMode);
        }
        setAssignedAgentId(data.assignedAgentId ?? null);
        setIsLive(Boolean(data.isLive));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingList(true);
    loadList().finally(() => setLoadingList(false));
    const t = setInterval(() => loadList(), 5000);
    return () => clearInterval(t);
  }, [loadList]);

  useEffect(() => {
    if (!selectedId || !chatbotId) {
      setMessages([]);
      setHandoffMode("ai");
      setAssignedAgentId(null);
      return;
    }
    setLoadingThread(true);
    setError(null);
    lastSinceRef.current = "";
    Promise.all([loadThread(selectedId, true), loadState(selectedId)]).finally(() =>
      setLoadingThread(false)
    );

    const poll = () => {
      loadThread(selectedId, false);
      loadState(selectedId);
    };
    const t = setInterval(poll, 2500);
    return () => clearInterval(t);
  }, [selectedId, chatbotId, loadThread, loadState]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const selected = conversations.find((c) => c.id === selectedId);
  const iAmAgent = handoffMode === "human";

  const takeChat = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(selectedId)}/takeover`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to take chat");
      setHandoffMode("human");
      setAssignedAgentId(data.assignedAgentId ?? null);
      await loadList();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to take chat");
    } finally {
      setBusy(false);
    }
  };

  const releaseChat = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(selectedId)}/release`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to release chat");
      setHandoffMode("ai");
      setAssignedAgentId(null);
      lastSinceRef.current = "";
      await loadThread(selectedId, true);
      await loadList();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to release chat");
    } finally {
      setBusy(false);
    }
  };

  const sendAgentMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    const text = agentInput.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/conversations/${encodeURIComponent(selectedId)}/agent-message`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }) }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        if (data.message.createdAt) lastSinceRef.current = data.message.createdAt;
      }
      setAgentInput("");
      lastSinceRef.current = "";
      await loadThread(selectedId, true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setBusy(false);
    }
  };

  if (!chatbotId) {
    return (
      <div className={WIZARD_CARD_CLASS}>
        <p className="py-6 text-center font-manrope text-sm text-warm-muted">Select a store/chatbot in the top bar to monitor conversations.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr] lg:items-stretch">
      <div className={`flex max-h-[min(720px,75vh)] flex-col overflow-hidden ${WIZARD_CARD_CLASS} !p-0`}>
        <div className="border-b border-ink/[.08] px-4 py-3.5">
          <p className="font-manrope text-[11px] font-extrabold uppercase tracking-wide text-warm-muted">Inbox</p>
          <p className="mt-0.5 font-manrope text-xs text-warm-muted">Updates every 5s · live = activity in last 3 min</p>
          {!audioReady && (
            <p className="mt-1 font-manrope text-[11px] text-amber-700">Click anywhere on the page to enable sound alerts.</p>
          )}
          {/* Filter tabs */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["all", "agent", "normal"] as const).map((f) => {
              const label = f === "all" ? "All" : f === "agent" ? "Needs Agent" : "Normal";
              const count =
                f === "all"
                  ? conversations.length
                  : f === "agent"
                  ? conversations.filter((c) => c.requestsHuman).length
                  : conversations.filter((c) => !c.requestsHuman).length;
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-manrope text-xs font-bold transition-colors ${
                    active
                      ? f === "agent"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-ink text-cream"
                      : "bg-peach text-warm-muted hover:bg-peach/70"
                  }`}
                >
                  {label} {count}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList && conversations.length === 0 ? (
            <p className="p-4 text-center font-manrope text-sm text-warm-muted">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-center font-manrope text-sm text-warm-muted">No conversations yet.</p>
          ) : (
            <ul className="divide-y divide-ink/[.06]">
              {[...conversations]
                .filter((c) =>
                  filter === "agent" ? c.requestsHuman : filter === "normal" ? !c.requestsHuman : true
                )
                .sort((a, b) => (b.requestsHuman ? 1 : 0) - (a.requestsHuman ? 1 : 0))
                .map((conv) => {
                  const accentColor = conv.requestsHuman
                    ? "bg-amber-500"
                    : conv.handoffMode === "human"
                    ? "bg-sage"
                    : conv.isLive
                    ? "bg-blue-400"
                    : "bg-ink/[.15]";
                  const avatarColor = conv.requestsHuman
                    ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                    : conv.handoffMode === "human"
                    ? "bg-sage/10 text-sage ring-1 ring-sage/30"
                    : "bg-cream-alt text-warm-muted";
                  const isSelected = selectedId === conv.id;
                  return (
                    <li key={conv.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setSelectedId(conv.id)}
                        className={`w-full py-3 pl-5 pr-4 text-left transition-colors ${
                          isSelected
                            ? conv.requestsHuman
                              ? "bg-amber-50"
                              : "bg-cream"
                            : conv.requestsHuman
                            ? "bg-amber-50/40 hover:bg-amber-50/70"
                            : "hover:bg-cream/70"
                        }`}
                      >
                        {/* Left accent bar — consistent on every row, color indicates state */}
                        <span className={`absolute inset-y-0 left-0 w-[3px] rounded-r-full ${accentColor}`} />

                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-manrope text-xs font-bold ${avatarColor}`}>
                            {(conv.customer?.[0] ?? "G").toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate font-manrope text-sm font-bold text-ink">
                                {conv.customer}
                              </span>
                              {conv.requestsHuman && (
                                <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 font-manrope text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                  Needs Agent
                                </span>
                              )}
                              {conv.isLive && (
                                <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 font-manrope text-[10px] font-bold uppercase tracking-wide text-red-600">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                                  Live
                                </span>
                              )}
                              {conv.handoffMode === "human" && (
                                <span className="shrink-0 rounded-full bg-sage/10 px-1.5 py-0.5 font-manrope text-[10px] font-bold uppercase tracking-wide text-sage">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="mt-1 truncate font-manrope text-xs text-warm-muted">{conv.preview}</p>
                            <p className="mt-1 font-manrope text-[10px] text-warm-muted">{formatRelative(conv.date)}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>

      <div className={`flex max-h-[min(720px,75vh)] flex-col overflow-hidden ${WIZARD_CARD_CLASS} !p-0`}>
        {!selectedId ? (
          <p className="flex flex-1 items-center justify-center p-8 text-center font-manrope text-sm text-warm-muted">
            Select a conversation to view the thread and take over live chats.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/[.08] px-4 py-3.5">
              <div className="flex min-w-0 items-start gap-3">
                {/* Avatar matching the inbox */}
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-manrope text-xs font-bold ${
                  selected?.requestsHuman
                    ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                    : handoffMode === "human"
                    ? "bg-sage/10 text-sage ring-1 ring-sage/30"
                    : "bg-cream-alt text-warm-muted"
                }`}>
                  {((selected?.customer ?? "G")[0]).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="truncate font-manrope text-sm font-bold text-ink">{selected?.customer ?? "Conversation"}</p>
                    {selected?.requestsHuman && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-manrope text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        Needs Agent
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 font-manrope text-xs text-warm-muted">
                    <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "animate-pulse bg-green-500" : "bg-ink/[.2]"}`} />
                    {isLive ? "Active now" : "Idle"}
                    <span className="text-ink/20">·</span>
                    <span className={handoffMode === "human" ? "font-semibold text-sage" : "text-warm-muted"}>
                      {handoffMode === "human" ? "You are chatting" : "AI assistant"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!iAmAgent ? (
                  <button type="button" className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-3.5 py-2 text-xs`} disabled={busy} onClick={takeChat}>
                    Take chat
                  </button>
                ) : (
                  <button type="button" className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-3.5 py-2 text-xs text-amber-700`} disabled={busy} onClick={releaseChat}>
                    End chat · resume AI
                  </button>
                )}
              </div>
            </div>

            {error && (
              <p className="border-b border-red-200 bg-red-50 px-4 py-2 font-manrope text-xs text-red-600">{error}</p>
            )}

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {loadingThread && messages.length === 0 ? (
                <p className="text-center font-manrope text-sm text-warm-muted">Loading messages…</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`rounded-lg px-3 py-2 font-manrope text-sm ${bubbleClass(m.role)}`}>
                    <p className="mb-1 font-manrope text-[10px] font-bold uppercase tracking-wide text-warm-muted">
                      {roleLabel(m.role)}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                ))
              )}
              <div ref={threadEndRef} />
            </div>

            {iAmAgent && (
              <form onSubmit={sendAgentMessage} className="border-t border-ink/[.08] p-3">
                <p className="mb-2 font-manrope text-xs font-semibold text-sage">Typing here sends to the customer in real time.</p>
                <div className="flex gap-2">
                  <input
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    placeholder="Reply to customer…"
                    className={`flex-1 ${WIZARD_INPUT_CLASS}`}
                    disabled={busy}
                  />
                  <button type="submit" className={`shrink-0 ${WIZARD_PRIMARY_BUTTON_CLASS} px-4 py-2.5 text-sm`} disabled={busy || !agentInput.trim()}>
                    Send
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
