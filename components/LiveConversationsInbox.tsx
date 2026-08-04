"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { useBot } from "@/components/BotContext";
import { useAgentNotificationSounds } from "@/hooks/useAgentNotificationSounds";
import { isAgentAudioUnlocked } from "@/lib/agent-notification-sounds";

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
  if (role === "user") return "ml-8 bg-slate-700 text-slate-100";
  if (role === "agent") return "mr-8 border border-emerald-500/40 bg-emerald-950/50 text-emerald-50";
  return "mr-8 bg-slate-800 text-slate-200";
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
      <Card>
        <p className="py-6 text-center text-slate-400">Select a store/chatbot in the top bar to monitor conversations.</p>
      </Card>
    );
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr] lg:items-stretch">
      <Card className="flex max-h-[min(720px,75vh)] flex-col overflow-hidden p-0">
        <div className="border-b border-slate-700/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inbox</p>
          <p className="text-sm text-slate-400">Updates every 5s · live = activity in last 3 min</p>
          {!audioReady && (
            <p className="mt-1 text-[11px] text-amber-400/90">Click anywhere on the page to enable sound alerts.</p>
          )}
          {/* Filter tabs */}
          <div className="mt-3 flex gap-1">
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
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    active
                      ? f === "agent"
                        ? "bg-amber-400/20 text-amber-300"
                        : "bg-slate-600 text-slate-100"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {label}
                  <span className={`rounded px-1 py-0.5 text-[10px] ${active ? "bg-white/10" : "bg-slate-700/60"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList && conversations.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-500">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-500">No conversations yet.</p>
          ) : (
            <ul className="divide-y divide-slate-700/40">
              {[...conversations]
                .filter((c) =>
                  filter === "agent" ? c.requestsHuman : filter === "normal" ? !c.requestsHuman : true
                )
                .sort((a, b) => (b.requestsHuman ? 1 : 0) - (a.requestsHuman ? 1 : 0))
                .map((conv) => {
                  const accentColor = conv.requestsHuman
                    ? "bg-amber-400"
                    : conv.handoffMode === "human"
                    ? "bg-emerald-500"
                    : conv.isLive
                    ? "bg-sky-500"
                    : "bg-slate-600";
                  const avatarColor = conv.requestsHuman
                    ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30"
                    : conv.handoffMode === "human"
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                    : "bg-slate-700 text-slate-400";
                  const isSelected = selectedId === conv.id;
                  return (
                    <li key={conv.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setSelectedId(conv.id)}
                        className={`w-full pl-5 pr-4 py-3 text-left transition-colors ${
                          isSelected
                            ? conv.requestsHuman
                              ? "bg-amber-950/40"
                              : "bg-slate-700/50"
                            : conv.requestsHuman
                            ? "bg-amber-950/20 hover:bg-amber-950/30"
                            : "hover:bg-slate-800/50"
                        }`}
                      >
                        {/* Left accent bar — consistent on every row, color indicates state */}
                        <span className={`absolute inset-y-0 left-0 w-[3px] rounded-r-full ${accentColor}`} />

                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor}`}>
                            {(conv.customer?.[0] ?? "G").toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-semibold text-slate-100">
                                {conv.customer}
                              </span>
                              {conv.requestsHuman && (
                                <span className="shrink-0 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                                  Needs Agent
                                </span>
                              )}
                              {conv.isLive && (
                                <span className="shrink-0 flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                                  Live
                                </span>
                              )}
                              {conv.handoffMode === "human" && (
                                <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="mt-1 truncate text-xs text-slate-400">{conv.preview}</p>
                            <p className="mt-1 text-[10px] text-slate-500">{formatRelative(conv.date)}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </Card>

      <Card className="flex max-h-[min(720px,75vh)] flex-col overflow-hidden p-0">
        {!selectedId ? (
          <p className="flex flex-1 items-center justify-center p-8 text-center text-slate-500">
            Select a conversation to view the thread and take over live chats.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 px-4 py-3">
              <div className="min-w-0 flex items-start gap-3">
                {/* Avatar matching the inbox */}
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  selected?.requestsHuman
                    ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30"
                    : handoffMode === "human"
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                    : "bg-slate-700 text-slate-400"
                }`}>
                  {((selected?.customer ?? "G")[0]).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-slate-100">{selected?.customer ?? "Conversation"}</p>
                    {selected?.requestsHuman && (
                      <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                        Needs Agent
                      </span>
                    )}
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
                    {isLive ? "Active now" : "Idle"}
                    <span className="text-slate-700">·</span>
                    <span className={handoffMode === "human" ? "text-emerald-400" : "text-slate-500"}>
                      {handoffMode === "human" ? "You are chatting" : "AI assistant"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!iAmAgent ? (
                  <Button type="button" variant="primary" className="px-3 py-1.5 text-xs" disabled={busy} onClick={takeChat}>
                    Take chat
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs text-amber-300" disabled={busy} onClick={releaseChat}>
                    End chat · resume AI
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">{error}</p>
            )}

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {loadingThread && messages.length === 0 ? (
                <p className="text-center text-sm text-slate-500">Loading messages…</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`rounded-lg px-3 py-2 text-sm ${bubbleClass(m.role)}`}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {roleLabel(m.role)}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                ))
              )}
              <div ref={threadEndRef} />
            </div>

            {iAmAgent && (
              <form onSubmit={sendAgentMessage} className="border-t border-slate-700/80 p-3">
                <p className="mb-2 text-xs text-emerald-400/90">Typing here sends to the customer in real time.</p>
                <div className="flex gap-2">
                  <input
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    placeholder="Reply to customer…"
                    className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    disabled={busy}
                  />
                  <Button type="submit" variant="primary" className="shrink-0 px-4 py-2 text-sm" disabled={busy || !agentInput.trim()}>
                    Send
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
