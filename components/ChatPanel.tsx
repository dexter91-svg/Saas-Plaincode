"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { useBot } from "@/components/BotContext";
import { planHasPaidConversationTier, UNLIMITED_CONVERSATIONS_DISPLAY } from "@/lib/plans";
import { contrastingForegroundForHex, resolvedWidgetAccentColor } from "@/lib/widget-color";
import AssistantMessageContent from "@/components/AssistantMessageContent";
import { DEFAULT_INITIAL_CHIPS, determineFollowUpChips, type QuickChip } from "@/lib/widget-chips";
import Image from "next/image";

const SUPPORT_WAIT_PREFIX = "__SUPPORT_WAIT__\n";
const SUPPORT_WAIT_TEXT = `${SUPPORT_WAIT_PREFIX}No one is available in chat right this moment. Your request has been sent to our team—they will follow up with you by email when they respond. Feel free to ask anything else here in the meantime.`;

function ChipMonotoneIcon({ id }: { id: string }) {
  if (id === "track" || id.includes("track")) {
    return (
      <svg className="w-3.5 h-3.5 shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    );
  }
  if (id === "return" || id.includes("return")) {
    return (
      <svg className="w-3.5 h-3.5 shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    );
  }
  if (id === "shipping" || id.includes("ship")) {
    return (
      <svg className="w-3.5 h-3.5 shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

interface ChatPanelProps {
  compact?: boolean;
  /** When true (snippet/embed): hide "Test your ecommerce assistant", conversation count, Dashboard/Integration links. */
  embed?: boolean;
  onClose?: () => void;
}

export default function ChatPanel({ compact = false, embed = false, onClose }: ChatPanelProps) {
  const {
    scrapedData,
    personality,
    messages,
    addMessage,
    updateMessage,
    clearMessages,
    conversationRemaining,
    decrementConversations,
    addActivity,
    addTicket,
    userPlan,
    chatbotId,
    setMessages,
  } = useBot();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [isHistoryClosing, setIsHistoryClosing] = useState(false);

  const handleCloseHistory = () => {
    setIsHistoryClosing(true);
    setTimeout(() => {
      setHistoryDrawerOpen(false);
      setIsHistoryClosing(false);
    }, 380);
  };
  const [savedSessions, setSavedSessions] = useState<{ id: string; timestamp: string; title: string; messages: any[] }[]>([]);
  const [currentTimeStr, setCurrentTimeStr] = useState("Today, 04:20");

  useEffect(() => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    setCurrentTimeStr(`Today, ${time}`);
  }, []);

  // Load saved chat history sessions on mount
  useEffect(() => {
    const sKey = `plainbot_sessions_${chatbotId || "default"}`;
    try {
      const raw = localStorage.getItem(sKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedSessions(parsed);
      }
    } catch {}
  }, [chatbotId]);

  // Save current conversation session to history whenever user has messaged
  useEffect(() => {
    const userMsg = messages.find((m) => m.role === "user");
    if (!userMsg || messages.length < 2) return;
    const sKey = `plainbot_sessions_${chatbotId || "default"}`;
    const currentId = conversationIdRef.current || `session_${Math.floor(messages[0]?.createdAt || Date.now())}`;
    const sessionItem = {
      id: currentId,
      timestamp: currentTimeStr,
      title: userMsg.content.slice(0, 40) + (userMsg.content.length > 40 ? "…" : ""),
      messages: messages,
    };
    try {
      const raw = localStorage.getItem(sKey);
      let list: any[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      const existingIdx = list.findIndex((s) => s.id === currentId);
      if (existingIdx >= 0) {
        list[existingIdx] = sessionItem;
      } else {
        list.unshift(sessionItem);
      }
      list = list.slice(0, 15);
      localStorage.setItem(sKey, JSON.stringify(list));
      setSavedSessions(list);
    } catch {}
  }, [messages, chatbotId, currentTimeStr]);
  const [showForwardForm, setShowForwardForm] = useState(false);
  const [forwardName, setForwardName] = useState("");
  const [forwardEmail, setForwardEmail] = useState("");
  const [forwardOrderRef, setForwardOrderRef] = useState("");
  const [forwardMessage, setForwardMessage] = useState("");
  const [forwardSubmitting, setForwardSubmitting] = useState(false);
  const [forwardFormSubmitted, setForwardFormSubmitted] = useState(false);
  const [humanRequestedViaButton, setHumanRequestedViaButton] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const greetingSentRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const lastReplyShownRef = useRef<string | null>(null);
  const waitNoticeLockRef = useRef(false);
  // Tracks optimistic user messages by content so the sync effect doesn't re-add
  // the server-side copy (which has a different UUID from the client-generated one).
  const pendingUserMsgsRef = useRef<Set<string>>(new Set());
  const [supportReplyIds, setSupportReplyIds] = useState<Set<string>>(new Set());
  const [supportReplyMeta, setSupportReplyMeta] = useState<Map<string, { repliedAt: string | null }>>(new Map());
  const [currentTicketRef, setCurrentTicketRef] = useState<string | null>(null);
  const [ticketResolved, setTicketResolved] = useState(false);
  const [embedAccent, setEmbedAccent] = useState<string | null>(null);
  const [chatHydrated, setChatHydrated] = useState(false);
  const [handoffMode, setHandoffMode] = useState<"ai" | "human">("ai");
  const lastSyncSinceRef = useRef<string>("");
  const syncedMsgIdsRef = useRef<Set<string>>(new Set());
  const submittingRef = useRef(false);
  // Mirrors conversationIdRef as real state so the poll/sync effects below can depend on
  // it directly, instead of the previous hack of depending on messages.length as a proxy
  // for "did a conversation just become available" (which also re-fired on every message).
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Restore conversation id + messages from the server after refresh (stays in sync with the API)
  useEffect(() => {
    if (!chatbotId) {
      setChatHydrated(true);
      return;
    }
    setChatHydrated(false);
    const key = `plainbot-conversation-id:${chatbotId}`;
    let saved: string | null = null;
    try {
      saved = window.sessionStorage.getItem(key);
    } catch {
      if (embed) setMessages([]);
      setChatHydrated(true);
      return;
    }
    if (!saved) {
      conversationIdRef.current = null;
      setActiveConversationId(null);
      // New session: don't let a stale, previously-cached thread (from BotContext's
      // localStorage snapshot) leak through to a customer-facing embed.
      if (embed) setMessages([]);
      setChatHydrated(true);
      return;
    }
    conversationIdRef.current = saved;
    setActiveConversationId(saved);
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/conversations/messages?conversationId=${encodeURIComponent(saved!)}&chatbotId=${encodeURIComponent(chatbotId)}`
        );
        if (cancelled) return;
        if (r.ok) {
          const d = (await r.json()) as {
            messages?: { id: string; role: string; content: string; createdAt?: string }[];
            handoffMode?: "ai" | "human";
          };
          if (d.handoffMode) setHandoffMode(d.handoffMode);
          const list = d.messages;
          if (Array.isArray(list) && list.length > 0) {
            syncedMsgIdsRef.current = new Set(list.map((m) => m.id));
            const tail = list[list.length - 1];
            if (tail?.createdAt) lastSyncSinceRef.current = tail.createdAt;
            setMessages(
              list.map((m, i) => ({
                id: m.id || `sync_${i}_${Date.now()}`,
                role: m.role === "user" || m.role === "assistant" || m.role === "agent" ? m.role : "assistant",
                content: m.content,
                createdAt: Date.now() + i,
              }))
            );
          }
        } else if (r.status === 404) {
          try {
            sessionStorage.removeItem(key);
          } catch {
            /* */
          }
          conversationIdRef.current = null;
          setActiveConversationId(null);
          setMessages([]);
        }
      } catch {
        /* keep local state */
      } finally {
        if (!cancelled) setChatHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatbotId, setMessages]);

  const handleHumanRequest = () => {
    setHumanRequestedViaButton(true);
    handleSubmit(null, "I'd like to speak to a human agent");
  };

  const clearChat = () => {
    lastSyncSinceRef.current = "";
    syncedMsgIdsRef.current = new Set();
    setHandoffMode("ai");
    setHumanRequestedViaButton(false);
    try {
      const cid = conversationIdRef.current;
      if (cid && chatbotId) {
        window.sessionStorage.removeItem(`plainbot-wait-2m:${chatbotId}:${cid}`);
      }
    } catch {
      /* */
    }
    waitNoticeLockRef.current = false;
    pendingUserMsgsRef.current = new Set();
    clearMessages();
    if (chatbotId) {
      try {
        window.sessionStorage.removeItem(`plainbot-conversation-id:${chatbotId}`);
        window.sessionStorage.removeItem(`plainbot-greeting-sent:${chatbotId}`);
      } catch {
        /* */
      }
    }
    conversationIdRef.current = null;
    setActiveConversationId(null);
    greetingSentRef.current = false;
  };

  useEffect(() => {
    if (!embed || !chatbotId) {
      setEmbedAccent(null);
      return;
    }
    const q = `?storeId=${encodeURIComponent(chatbotId)}`;
    fetch(`/api/chatbots/me${q}`)
      .then((r) => r.json())
      .then((d) => {
        const c = d.chatbot?.widgetAccentColor;
        setEmbedAccent(resolvedWidgetAccentColor(typeof c === "string" ? c : null));
      })
      .catch(() => setEmbedAccent(resolvedWidgetAccentColor(null)));
  }, [embed, chatbotId]);

  // Initial greeting (after server hydration so we don't duplicate a thread that already exists).
  // Guarded by a session-level flag (not just the in-memory ref, which resets every time the
  // widget is closed/reopened) so the greeting is only ever added once per browser session.
  useEffect(() => {
    if (!chatHydrated) return;
    if (greetingSentRef.current) return;
    if (messages.length > 0) {
      greetingSentRef.current = true;
      return;
    }
    const greetingKey = chatbotId ? `plainbot-greeting-sent:${chatbotId}` : null;
    if (greetingKey) {
      try {
        if (window.sessionStorage.getItem(greetingKey) === "1") {
          greetingSentRef.current = true;
          return;
        }
      } catch {
        /* ignore */
      }
    }
    const company =
      scrapedData?.title ||
      scrapedData?.url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ||
      "your store";
    const greeting = `Hi, I'm your AI assistant for ${company}. How can I help you today?`;
    addMessage({ role: "assistant", content: greeting });
    greetingSentRef.current = true;
    if (greetingKey) {
      try {
        window.sessionStorage.setItem(greetingKey, "1");
      } catch {
        /* ignore */
      }
    }
  }, [chatHydrated, scrapedData, personality, messages.length, addMessage, chatbotId]);

  useEffect(() => {
    if (!endRef.current) return;
    endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  useEffect(() => {
    if (messages.length === 0) {
      setCurrentTicketRef(null);
      setTicketResolved(false);
    }
  }, [messages.length]);

  // Poll for support reply + 2-minute “no agent in chat yet” notice (forwarded, no reply)
  useEffect(() => {
    if (!chatHydrated) return;
    const cid = activeConversationId;
    if (!cid || !chatbotId) return;
    const waitKey = `plainbot-wait-2m:${chatbotId}:${cid}`;
    const poll = () => {
      fetch(`/api/forwarded/by-conversation?conversationId=${encodeURIComponent(cid)}`)
        .then((r) => r.json())
        .then((data: {
          replyText?: string | null;
          repliedAt?: string | null;
          forwardPending?: boolean;
          forwardedAt?: string | null;
          needsForm?: boolean;
        }) => {
          if (data.needsForm && !forwardFormSubmitted) {
            setShowForwardForm(true);
          }
          if (data.replyText && data.replyText !== lastReplyShownRef.current) {
            lastReplyShownRef.current = data.replyText;
            const id = addMessage({
              role: "assistant",
              content: data.replyText,
            });
            setSupportReplyIds((prev) => new Set(Array.from(prev).concat(id)));
            setSupportReplyMeta((prev) => new Map(prev).set(id, { repliedAt: data.repliedAt ?? null }));
            setTicketResolved(true);
          }
          if (
            data.forwardPending &&
            data.forwardedAt &&
            !data.repliedAt &&
            !data.replyText
          ) {
            const age = Date.now() - new Date(data.forwardedAt).getTime();
            let already = false;
            try {
              already = window.sessionStorage.getItem(waitKey) === "1";
            } catch {
              /* */
            }
            if (age >= 120_000 && !already && !waitNoticeLockRef.current) {
              waitNoticeLockRef.current = true;
              try {
                window.sessionStorage.setItem(waitKey, "1");
              } catch {
                /* */
              }
              addMessage({ role: "assistant", content: SUPPORT_WAIT_TEXT });
            }
          }
        })
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 15000);
    return () => clearInterval(t);
  }, [chatHydrated, activeConversationId, addMessage, chatbotId]);

  // Real-time sync: agent messages + resume-AI notice from server
  useEffect(() => {
    // Wait for the hydration effect above to finish seeding lastSyncSinceRef /
    // syncedMsgIdsRef from the server. Starting sooner races it: this poll would see
    // both refs still empty, treat the whole existing thread as "new", and re-append
    // every message (most visibly duplicating the first one) on top of what hydration
    // is about to set via setMessages.
    if (!chatHydrated) return;
    const cid = activeConversationId;
    if (!cid || !chatbotId) return;

    const sync = () => {
      const sinceQ = lastSyncSinceRef.current
        ? `&since=${encodeURIComponent(lastSyncSinceRef.current)}`
        : "";
      fetch(
        `/api/conversations/messages?conversationId=${encodeURIComponent(cid)}&chatbotId=${encodeURIComponent(chatbotId)}${sinceQ}`
      )
        .then((r) => r.json())
        .then(
          (data: {
            messages?: { id: string; role: string; content: string; createdAt?: string }[];
            handoffMode?: "ai" | "human";
          }) => {
            if (data.handoffMode) setHandoffMode(data.handoffMode);
            const incoming = data.messages || [];
            incoming.forEach((m) => {
              if (syncedMsgIdsRef.current.has(m.id)) return;
              // Suppress server echo of an optimistic user message we already displayed
              if (m.role === "user" && pendingUserMsgsRef.current.has(m.content)) {
                pendingUserMsgsRef.current.delete(m.content);
                syncedMsgIdsRef.current.add(m.id);
                return;
              }
              syncedMsgIdsRef.current.add(m.id);
              const role =
                m.role === "user" || m.role === "assistant" || m.role === "agent" ? m.role : "assistant";
              const mid = addMessage({ role, content: m.content });
              if (m.role === "agent") {
                setSupportReplyIds((prev) => new Set(Array.from(prev).concat(mid)));
              }
            });
            const tail = incoming[incoming.length - 1];
            if (tail?.createdAt) lastSyncSinceRef.current = tail.createdAt;
          }
        )
        .catch(() => {});
    };

    sync();
    const t = setInterval(sync, 3000);
    return () => clearInterval(t);
  }, [chatHydrated, chatbotId, addMessage, activeConversationId]);

  const handleForwardToEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = forwardName.trim() || "Customer";
    const email = forwardEmail.trim();
    if (!email) {
      setError("Email is required to forward.");
      return;
    }
    setForwardSubmitting(true);
    setError(null);
    try {
      let cid = conversationIdRef.current;
      if (!cid) {
        if (!chatbotId) {
          setError("Connect a store first so we can forward it.");
          return;
        }
        const started = await fetch("/api/conversations/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatbotId }),
        });
        const startData = await started.json().catch(() => ({}));
        if (!started.ok || !startData.conversationId) {
          setError(startData.error || "Could not start a conversation. Please try again.");
          return;
        }
        cid = startData.conversationId as string;
        conversationIdRef.current = cid;
        setActiveConversationId(cid);
        try {
          window.sessionStorage.setItem(`plainbot-conversation-id:${chatbotId}`, cid);
        } catch {
          /* ignore */
        }
      }
      const conversationText = messages
        .map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content}`)
        .join("\n");
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const payload = {
        conversationId: cid,
        customer: name,
        customerEmail: email,
        orderRef: forwardOrderRef.trim() || null,
        customerMessage: forwardMessage.trim() || null,
        preview: lastUser?.content?.slice(0, 200) || forwardMessage.trim() || "Support request",
        conversationText,
        ...(chatbotId ? { chatbotId } : {}),
      };
      const res = await fetch(chatbotId ? "/api/forwarded/submit" : "/api/forwarded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to forward");
      }
      addMessage({
        role: "assistant",
        content:
          "Thanks — we've sent your details to our team. You'll see their reply here when they respond.",
      });
      setForwardFormSubmitted(true);
      setShowForwardForm(false);
      setForwardName("");
      setForwardEmail("");
      setForwardOrderRef("");
      setForwardMessage("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to forward");
    } finally {
      setForwardSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent | null, overrideText?: string) => {
    if (e) e.preventDefault();
    // Guards against a fast double-submit (double-click, double form-submit event) that
    // fires before React re-renders the "disabled" Send button — `loading` state alone
    // isn't checked here since the state update from the first call hasn't applied yet.
    if (submittingRef.current) return;
    setError(null);
    const question = overrideText ?? input.trim();
    if (!question) return;
    const unlimited = conversationRemaining >= UNLIMITED_CONVERSATIONS_DISPLAY;
    if (!unlimited && conversationRemaining <= 0) {
      setError("You've used all your conversations this month. Upgrade or renew from the dashboard to continue.");
      return;
    }

    submittingRef.current = true;
    const userId = addMessage({ role: "user", content: question });
    syncedMsgIdsRef.current.add(userId);
    pendingUserMsgsRef.current.add(question);
    const assistantId = addMessage({ role: "assistant", content: "..." });
    syncedMsgIdsRef.current.add(assistantId);
    if (!overrideText) setInput("");
    setLoading(true);

    // Natural typing indicator delay (~600ms) so user clearly sees the 3 bouncing dots
    await new Promise((r) => setTimeout(r, 600));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          question,
          personality,
          scrapedData,
          history: messages
            .filter((m) => m.content && m.content !== "..." && !m.content.startsWith("__SUPPORT_WAIT__"))
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
          ...(chatbotId && { chatbotId }),
          ...(conversationIdRef.current && { conversationId: conversationIdRef.current }),
        }),
      });

      if (!res.ok) {
        // Capture conversation ID from error responses so subsequent messages stay in the same conversation
        const errConvId = res.headers.get("X-Conversation-Id");
        if (errConvId && !conversationIdRef.current) {
          conversationIdRef.current = errConvId;
          setActiveConversationId(errConvId);
          try {
            if (chatbotId) window.sessionStorage.setItem(`plainbot-conversation-id:${chatbotId}`, errConvId);
          } catch { /* ignore */ }
        }
        if (res.status === 402) {
          try {
            const body = await res.json();
            if (body?.limitReached) {
              setError(
                body.plan === "paid"
                  ? "You've used all your plan conversations this month. Renew or upgrade from the dashboard to continue."
                  : "You've used all your free conversations. Upgrade from the dashboard to continue."
              );
              updateMessage(assistantId, {
                content:
                  "You've reached your conversation limit for this month. Upgrade or renew from your dashboard to keep chatting.",
              });
              setLoading(false);
              return;
            }
          } catch {
            // fall through
          }
        }
        let message = "Something went wrong while contacting the AI.";
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
      if (!res.body) {
        throw new Error("No response from the chatbot.");
      }

      const convId = res.headers.get("X-Conversation-Id");
      if (convId) {
        conversationIdRef.current = convId;
        setActiveConversationId(convId);
        try {
          if (chatbotId) window.sessionStorage.setItem(`plainbot-conversation-id:${chatbotId}`, convId);
        } catch {
          /* ignore */
        }
      }
      const ref = res.headers.get("X-Ticket-Ref");
      if (ref) setCurrentTicketRef(ref);
      if (res.headers.get("X-Needs-Forward-Form") === "1" || res.headers.get("X-Forwarded-Support") === "1") {
        setShowForwardForm(true);
      }
      // The server's real ids for this exchange (distinct from our local optimistic `userId`/
      // `assistantId`). Track them so the background sync poll recognizes these exact messages
      // when it re-fetches them later and skips re-adding duplicates — this matters most for
      // fast, non-streamed replies (e.g. the escalation acknowledgment) where the poll can
      // otherwise race ahead of this request finishing and its own `pendingUserMsgsRef` cleanup.
      const realAssistantId = res.headers.get("X-Assistant-Message-Id");
      const realUserId = res.headers.get("X-User-Message-Id");
      if (realUserId) syncedMsgIdsRef.current.add(realUserId);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let chunkCount = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        fullText += chunk;
        chunkCount++;
        // Update immediately on first chunk for instant feedback
        updateMessage(assistantId, { content: fullText || "..." });
      }

      // The exchange we just displayed (via addMessage above) is now persisted server-side.
      // Advance the sync cursor to "now" so the real-time sync effect's next poll doesn't
      // treat this exchange as new and re-add a duplicate. Also register the server's real
      // assistant-message id (not just our local optimistic one) so that even a poll already
      // in flight with a stale cursor recognizes this exact row and skips it.
      lastSyncSinceRef.current = new Date().toISOString();
      pendingUserMsgsRef.current.delete(question);
      if (realAssistantId) syncedMsgIdsRef.current.add(realAssistantId);

      // If AI requested forward to support (e.g. cancel order, refund), strip marker; backend already created ticket and sent email
      const forwardMarker = "[FORWARD_TO_SUPPORT]";
      if (fullText.includes(forwardMarker)) {
        const cleaned = fullText.replace(/\s*\[FORWARD_TO_SUPPORT\]\s*$/i, "").trim();
        updateMessage(assistantId, { content: cleaned || fullText });
        setShowForwardForm(true);
        addTicket({
          type: "forwarded_email",
          customer: "Chat user",
          queryPreview: question.length > 80 ? question.slice(0, 80) + "…" : question,
          outcome: "Forwarded to support",
          status: "open",
          conversationId: conversationIdRef.current ?? undefined,
        });
      }

      if (conversationRemaining < UNLIMITED_CONVERSATIONS_DISPLAY) {
        decrementConversations();
      }
      addActivity({
        type: "resolved",
        title: "Chat query answered",
        detail: question.length > 60 ? question.slice(0, 60) + "…" : question,
      });
    } catch (err: any) {
      lastSyncSinceRef.current = new Date().toISOString();
      pendingUserMsgsRef.current.delete(question);
      updateMessage(assistantId, {
        content:
          "Sorry, I couldn't generate a reply right now. Please try again in a moment.",
      });
      setError(err?.message || "Failed to reach the chatbot API.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const unlimitedRemaining = conversationRemaining >= UNLIMITED_CONVERSATIONS_DISPLAY;
  const disabled = loading || (!unlimitedRemaining && conversationRemaining <= 0);

  // Dynamic chips: initial predefined chips before customer sends messages,
  // followed by queued contextual suggestions based on previous interaction.
  const hasUserMessages = messages.some((m) => m.role === "user");
  const currentChips: QuickChip[] = (() => {
    if (!hasUserMessages) {
      return DEFAULT_INITIAL_CHIPS;
    }
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant" || m.role === "agent");
    return determineFollowUpChips(lastUserMsg?.content || "", lastAssistantMsg?.content || "");
  })();

  const handleChipClick = (chip: QuickChip) => {
    if (disabled || loading) return;
    if (chip.action === "human" || chip.id.includes("human")) {
      handleHumanRequest();
    } else {
      handleSubmit(null, chip.query);
    }
  };

  const paidHidesPlainbotBranding = planHasPaidConversationTier(userPlan);
  const embedAccentFg =
    embed && embedAccent ? contrastingForegroundForHex(embedAccent) : undefined;
  const storeHeaderLabel = (() => {
    const title = (scrapedData?.title || "").trim();
    if (title) return title;
    const raw = (scrapedData?.url || "").trim();
    if (raw) {
      try {
        const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
        const host = u.hostname.replace(/^www\./i, "");
        if (host) return host;
      } catch {
        /* ignore */
      }
    }
    return "Chat";
  })();

  const hasStartedChat = hasUserMessages;

  return (
    <div
      className={`relative flex flex-col rounded-[24px] border-[2.5px] border-[#2B221C] bg-gradient-to-br from-[#2B221C] via-[#352B24] to-[#201814] shadow-2xl overflow-hidden backdrop-blur-md font-poppins ${
        compact ? "h-[530px] sm:h-[570px]" : "h-[610px]"
      }`}
    >
      {/* Past Chat History Drawer Overlay (Triggered by •••) */}
      {historyDrawerOpen && (
        <div
          className={`absolute inset-0 z-50 flex flex-col bg-white text-[#2B221C] p-4 shadow-2xl font-poppins rounded-[22px] border-[2px] border-[#2B221C] overflow-hidden ${
            isHistoryClosing ? "animate-history-close pointer-events-none" : "animate-history-open"
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#2B221C]/15">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#2B221C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-bold text-[13px] text-[#2B221C]">Chat History</h3>
            </div>
            <button
              type="button"
              onClick={handleCloseHistory}
              className="w-7 h-7 rounded-full bg-[#2B221C]/10 hover:bg-[#2B221C]/20 text-[#2B221C] flex items-center justify-center text-xs font-bold transition"
              aria-label="Close history"
            >
              ✕
            </button>
          </div>

          {/* Start New Chat Button */}
          <button
            type="button"
            onClick={() => {
              clearChat();
              handleCloseHistory();
            }}
            className="mt-3 w-full rounded-full bg-[#2B221C] hover:bg-[#3D3027] text-white py-2 px-4 text-[11.5px] font-semibold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Start New Conversation
          </button>

          {/* Past Conversations List */}
          <div className="flex-1 overflow-y-auto no-scrollbar mt-3 space-y-2 pr-1">
            {savedSessions.length === 0 ? (
              <div className="text-center py-10 text-[11.5px] text-[#8C7C6E] leading-relaxed">
                <p className="font-medium text-[#2B221C]">No past conversations yet.</p>
                <p className="mt-1">Conversations with the store assistant will be recorded and accessible here.</p>
              </div>
            ) : (
              savedSessions.map((s, idx) => (
                <div
                  key={s.id || idx}
                  onClick={() => {
                    setMessages(s.messages);
                    handleCloseHistory();
                  }}
                  className="p-3 rounded-xl bg-white border border-[#2B221C]/15 hover:border-[#2B221C] hover:shadow-sm cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between text-[10.5px] text-[#8C7C6E] mb-1">
                    <span>{s.timestamp}</span>
                    <span className="text-[9.5px] bg-[#F3E3D6] text-[#2B221C] font-semibold px-2 py-0.5 rounded-full">
                      {s.messages.length} msgs
                    </span>
                  </div>
                  <p className="text-[11.5px] font-medium text-[#2B221C] truncate group-hover:text-[#2B221C] transition-colors">
                    {s.title || "Conversation"}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Quick Actions Footer - Single Talk to Human Action */}
          <div className="pt-3 border-t border-[#2B221C]/15 flex items-center justify-between text-[11.5px] text-[#8C7C6E]">
            <button
              type="button"
              onClick={() => {
                setShowForwardForm(true);
                handleCloseHistory();
              }}
              className="text-[#2B221C] hover:underline font-medium flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Talk to a human
            </button>
            {savedSessions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(`plainbot_sessions_${chatbotId || "default"}`);
                  setSavedSessions([]);
                }}
                className="text-red-500 hover:underline text-[11px]"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapsible Header: Rich Dark Brown (#2B221C) Palette */}
      <header
        className={`relative transition-all duration-500 ease-in-out px-4 font-poppins ${
          hasStartedChat ? "py-2.5 min-h-[50px] flex items-center" : "pt-3 pb-2.5 min-h-[156px]"
        }`}
      >
        {/* Top Control Buttons (••• History and — Minimize) */}
        <div className={`flex items-center justify-end gap-1.5 absolute right-3.5 z-10 ${hasStartedChat ? "top-1/2 -translate-y-1/2" : "top-3"}`}>
          <button
            type="button"
            onClick={() => setHistoryDrawerOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Past Chat History"
            aria-label="Past Chat History"
          >
            <span className="text-xs font-bold tracking-widest leading-none">•••</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Minimize Chat"
              aria-label="Minimize Chat"
            >
              <span className="text-xs font-bold leading-none">—</span>
            </button>
          )}
        </div>

        {/* Header Visual Layout: Hero Banner vs Compact Bar */}
        {!hasStartedChat ? (
          /* Hero Banner (#2B221C Theme with Staggered Entrance Animations) */
          <div className="flex flex-col items-center justify-center text-center transition-all duration-500">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-white/30 animate-comp-pop">
              <Image src="/logo.svg" alt="Plainbot" width={30} height={30} className="object-contain" priority />
            </div>
            <h2 className="mt-2 text-[13px] font-bold text-white tracking-tight animate-comp-slide-1">
              {paidHidesPlainbotBranding ? storeHeaderLabel : "Vintageshop"}
            </h2>
            <p className="mt-0.5 text-[10.5px] text-white/80 animate-comp-slide-1">
              You can ask me anything
            </p>
            <button
              type="button"
              onClick={handleHumanRequest}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white hover:bg-white/90 px-3.5 py-1.5 text-[10.5px] font-semibold text-[#2B221C] shadow-sm transition active:scale-95 animate-comp-slide-2"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Talk to a human
            </button>
          </div>
        ) : (
          /* Compact Bar: Vertically Centered Icon + Title */
          <div className="flex items-center gap-2.5 transition-all duration-500 pr-16">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-white/30">
              <Image src="/logo.svg" alt="Plainbot" width={18} height={18} className="object-contain" />
            </div>
            <h2 className="truncate text-[13.5px] font-bold text-white leading-none">
              {paidHidesPlainbotBranding ? storeHeaderLabel : "Vintageshop"}
            </h2>
          </div>
        )}
      </header>

      {/* White Chat Container with Curved Top Corners (matches reference UI) */}
      <div className="flex-1 flex flex-col min-h-0 rounded-t-[24px] bg-white overflow-hidden shadow-[0_-4px_24px_rgba(43,34,28,0.12)] animate-comp-slide-1">
        {/* Main Conversation Scroll View (Clean White Background, Hidden Scrollbar) */}
        <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar px-4 py-3 text-sm bg-white">
        {/* Centered Timestamp */}
        <div className="my-1 text-center select-none animate-comp-slide-1">
          <span className="text-[11px] font-medium text-[#8C7C6E]">
            {currentTimeStr}
          </span>
        </div>

        {/* Contact Team Forward Form */}
        {showForwardForm && !forwardFormSubmitted && (
          <form onSubmit={handleForwardToEmail} className="mb-3 rounded-xl border border-[#2B221C]/15 bg-white p-3 space-y-2 shadow-sm">
            <p className="text-xs font-semibold text-[#2B221C]">Contact our team</p>
            <p className="text-[11px] text-[#8C7C6E]">We&apos;ll email your details and full chat to support.</p>
            <input
              type="text"
              placeholder="Your name"
              value={forwardName}
              onChange={(e) => setForwardName(e.target.value)}
              className="w-full rounded-lg border border-[#2B221C]/15 bg-[#FBF7F2] px-3 py-1.5 text-xs text-[#2B221C] placeholder:text-[#8C7C6E] focus:border-[#2B221C] focus:outline-none"
            />
            <input
              type="email"
              placeholder="Your email *"
              value={forwardEmail}
              onChange={(e) => setForwardEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-[#2B221C]/15 bg-[#FBF7F2] px-3 py-1.5 text-xs text-[#2B221C] placeholder:text-[#8C7C6E] focus:border-[#2B221C] focus:outline-none"
            />
            <input
              type="text"
              placeholder="Order number (optional)"
              value={forwardOrderRef}
              onChange={(e) => setForwardOrderRef(e.target.value)}
              className="w-full rounded-lg border border-[#2B221C]/15 bg-[#FBF7F2] px-3 py-1.5 text-xs text-[#2B221C] placeholder:text-[#8C7C6E] focus:border-[#2B221C] focus:outline-none"
            />
            <textarea
              placeholder="How can we help? (optional)"
              value={forwardMessage}
              onChange={(e) => setForwardMessage(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-[#2B221C]/15 bg-[#FBF7F2] px-3 py-1.5 text-xs text-[#2B221C] placeholder:text-[#8C7C6E] focus:border-[#2B221C] focus:outline-none"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="px-3 py-1 text-xs bg-[#2B221C] hover:bg-[#3D3027] text-white" disabled={forwardSubmitting}>
                {forwardSubmitting ? "Sending…" : "Send to support"}
              </Button>
              <button type="button" onClick={() => setShowForwardForm(false)} className="text-xs text-[#8C7C6E] hover:text-[#2B221C]">
                Cancel
              </button>
            </div>
          </form>
        )}

        {handoffMode === "human" && (
          <div className="mb-2 rounded-xl border border-emerald-600/25 bg-[#EAF0E9] px-3 py-2 text-xs text-[#4E6E52] font-medium">
            A team member is chatting with you. Messages go to them in real time.
          </div>
        )}

        {/* Initial Greeting & Vertically Stacked Action Chips */}
        {messages.length === 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2 animate-comp-slide-2">
              <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#2B221C]/20 mt-0.5 shadow-sm">
                <Image src="/logo.svg" alt="Plainbot" width={15} height={15} className="object-contain" />
              </div>
              <div className="rounded-xl rounded-tl-sm bg-[#F3E3D6] text-[#2B221C] border border-[#2B221C]/10 px-3.5 py-2.5 text-[12px] shadow-sm leading-relaxed">
                <p className="font-semibold text-[#2B221C]">Hi There,</p>
                <p className="mt-0.5 text-[#2B221C]/90">How can I help you today?</p>
              </div>
            </div>

            {/* Vertically Stacked Action Chips with Monotone Icons & Staggered Entrance */}
            <div className="flex flex-col items-start gap-1.5 pl-9">
              {currentChips.map((chip, chipIdx) => {
                const animClass =
                  chipIdx === 0
                    ? "animate-chip-cascade-0"
                    : chipIdx === 1
                    ? "animate-chip-cascade-1"
                    : "animate-chip-cascade-2";
                return (
                  <button
                    key={chip.id}
                    type="button"
                    disabled={loading || disabled}
                    onClick={() => handleChipClick(chip)}
                    className={`inline-flex items-center justify-start gap-2 rounded-full border border-[#2B221C]/20 bg-[#F3E3D6] px-3.5 py-1.5 text-[11px] font-semibold text-[#2B221C] shadow-sm transition-all hover:border-[#2B221C] hover:bg-[#2B221C] hover:text-white disabled:opacity-40 group ${animClass}`}
                  >
                    <ChipMonotoneIcon id={chip.id} />
                    <span>{chip.label.replace(/^[^\w\s]+\s*/, "")}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Messages History */}
        {messages.map((m, idx) => {
          const isAgentMsg = m.role === "agent";
          const isSupportReply = supportReplyIds.has(m.id) || isAgentMsg;
          const replyMeta = supportReplyMeta.get(m.id);
          const isWaitNotice = m.role === "assistant" && m.content.startsWith(SUPPORT_WAIT_PREFIX);
          const isFirstUserMessage = m.role === "user" && messages.findIndex((x) => x.role === "user") === idx;
          const isTypingPlaceholder = m.role === "assistant" && m.content === "...";

          if (isWaitNotice) {
            return (
              <div key={m.id} className="flex justify-start pl-9">
                <div className="max-w-[90%] rounded-xl border border-[#2B221C]/20 bg-[#F3E3D6] px-4 py-2.5 text-[11.5px] text-[#2B221C]">
                  <p className="text-[10px] font-bold text-[#2B221C] uppercase">Update</p>
                  <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-[#2B221C]">
                    {m.content.slice(SUPPORT_WAIT_PREFIX.length)}
                  </p>
                </div>
              </div>
            );
          }

          if (isSupportReply) {
            return (
              <div key={m.id} className="flex items-start gap-2">
                <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#2B221C]/20 mt-0.5 shadow-sm">
                  <Image src="/logo.svg" alt="Support" width={15} height={15} className="object-contain" />
                </div>
                <div className="max-w-[85%] rounded-xl border border-[#2B221C]/15 bg-white px-3.5 py-2.5 shadow-sm">
                  <div className="flex items-center gap-2 text-[10.5px] font-semibold text-[#2B221C]">
                    <span>{isAgentMsg ? "Team member" : "Support reply"}</span>
                    {replyMeta?.repliedAt && (
                      <span className="text-[#8C7C6E] font-normal text-[9.5px]">
                        {new Date(replyMeta.repliedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[#2B221C]">
                    {m.content}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className="space-y-1.5">
              <div className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {/* Assistant Avatar Badge */}
                {m.role === "assistant" && (
                  <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#2B221C]/20 mb-0.5 shadow-sm">
                    <Image src="/logo.svg" alt="Bot" width={15} height={15} className="object-contain" />
                  </div>
                )}
                <div
                  className={
                    isTypingPlaceholder
                      ? "px-2.5 py-1 rounded-xl rounded-bl-sm bg-[#F3E3D6] border border-[#2B221C]/10 shadow-sm flex items-center justify-center w-fit"
                      : `max-w-[78%] rounded-xl px-3.5 py-2 text-[12px] leading-[1.45] font-poppins ${
                          m.role === "user"
                            ? embed && embedAccent
                              ? "rounded-br-sm text-white"
                              : "bg-[#2B221C] text-white rounded-br-sm shadow-sm"
                            : "bg-[#F3E3D6] text-[#2B221C] rounded-bl-sm border border-[#2B221C]/10 shadow-sm"
                        }`
                  }
                  style={
                    !isTypingPlaceholder && m.role === "user" && embed && embedAccent
                      ? { backgroundColor: embedAccent, color: embedAccentFg }
                      : undefined
                  }
                >
                  {m.role === "assistant" ? (
                    isTypingPlaceholder ? (
                      /* Centered 3 Dots in Compact Assistant Bubble */
                      <div className="flex items-center justify-center gap-1 h-[14px]">
                        <span className="w-1 h-1 rounded-full bg-[#2B221C] animate-typing-dot-1" />
                        <span className="w-1 h-1 rounded-full bg-[#2B221C] animate-typing-dot-2" />
                        <span className="w-1 h-1 rounded-full bg-[#2B221C] animate-typing-dot-3" />
                      </div>
                    ) : (
                      <AssistantMessageContent content={m.content} />
                    )
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-[12px] leading-relaxed">{m.content}</p>
                  )}
                </div>
              </div>

              {/* Follow-up Quick Action Chips with Monotone Icons */}
              {m.role === "assistant" && idx === messages.length - 1 && !loading && currentChips.length > 0 && (
                <div className="flex flex-col items-start gap-1.5 pl-9 pt-1 animate-fade-in">
                  {currentChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      disabled={loading || disabled}
                      onClick={() => handleChipClick(chip)}
                      className="inline-flex items-center justify-start gap-2 rounded-full border border-[#2B221C]/20 bg-[#F3E3D6] px-3.5 py-1.5 text-[11px] font-semibold text-[#2B221C] shadow-sm transition-all hover:border-[#2B221C] hover:bg-[#2B221C] hover:text-white disabled:opacity-40 group"
                    >
                      <ChipMonotoneIcon id={chip.id} />
                      <span>{chip.label.replace(/^[^\w\s]+\s*/, "")}</span>
                    </button>
                  ))}
                </div>
              )}

              {isFirstUserMessage && currentTicketRef && (
                <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-[#2B221C]/15 bg-white px-3.5 py-2.5 pl-9 shadow-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3E3D6] text-[#2B221C]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-semibold text-[#2B221C] text-[11.5px]">Creating ticket</p>
                    <p className="text-[10.5px] text-[#8C7C6E]">Ticket #{currentTicketRef}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Assistant 3 Dots Typing Indicator during API response generation */}
        {loading && (!messages.length || messages[messages.length - 1]?.content !== "...") && (
          <div className="flex items-end gap-2 pt-0.5 animate-fade-in select-none">
            <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#2B221C]/20 mb-0.5 shadow-sm">
              <Image src="/logo.svg" alt="Bot" width={15} height={15} className="object-contain" />
            </div>
            <div className="flex items-center justify-center gap-1 h-[20px] px-2.5 rounded-xl rounded-bl-sm bg-[#F3E3D6] border border-[#2B221C]/10 shadow-sm">
              <span className="w-1 h-1 rounded-full bg-[#2B221C] animate-typing-dot-1" />
              <span className="w-1 h-1 rounded-full bg-[#2B221C] animate-typing-dot-2" />
              <span className="w-1 h-1 rounded-full bg-[#2B221C] animate-typing-dot-3" />
            </div>
          </div>
        )}

        {ticketResolved && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-600/25 bg-[#EAF0E9] px-3.5 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6B8F71] text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-[#2B221C] text-[11.5px]">Ticket resolved</p>
              <p className="text-[10.5px] text-[#6E5E52]">Our team or the AI has responded.</p>
            </div>
          </div>
        )}

        {/* User-side 3 dots typing bubble while user is actively typing */}
        {input.trim().length > 0 && (
          <div className="flex justify-end pt-0.5 animate-fade-in select-none">
            <div
              className="flex items-center justify-center gap-1 h-[20px] px-2.5 rounded-xl rounded-br-sm bg-[#2B221C] shadow-sm"
              aria-label="You are typing"
            >
              <span className="w-1 h-1 rounded-full bg-white animate-typing-dot-1" />
              <span className="w-1 h-1 rounded-full bg-white animate-typing-dot-2" />
              <span className="w-1 h-1 rounded-full bg-white animate-typing-dot-3" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Sleek Rounded Bottom Input Bar with #2B221C Accents */}
      <form onSubmit={handleSubmit} className="border-t border-[#2B221C]/10 p-2.5 bg-white font-poppins animate-comp-slide-3">
        <div className="relative flex items-center rounded-full border-[1.5px] border-[#2B221C]/25 bg-[#FBF7F2] px-3 py-1 shadow-sm focus-within:border-[#2B221C] focus-within:ring-1 focus-within:ring-[#2B221C] transition-all">
          {/* User Input - Clean, standard, and buttery smooth */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="Ask a question..."
            disabled={disabled}
            className="w-full bg-transparent py-1 text-[12px] font-poppins text-[#2B221C] placeholder:text-[#8C7C6E] caret-[#2B221C] focus:outline-none"
            aria-label="Ask a question"
          />

          {/* Right Controls: Single Talk to Human Icon Button + Circular Send Button */}
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            {/* Single Talk to Human Button */}
            <button
              type="button"
              onClick={() => setShowForwardForm((v) => !v)}
              className={`p-1.5 rounded-full transition-colors ${
                showForwardForm ? "bg-[#2B221C]/10 text-[#2B221C]" : "text-[#8C7C6E] hover:text-[#2B221C] hover:bg-[#2B221C]/10"
              }`}
              title="Talk to a human"
              aria-label="Talk to a human"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {/* Circular Send Button (#2B221C Accent) */}
            <button
              type="submit"
              disabled={disabled || !input.trim()}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2B221C] hover:bg-[#3D3027] text-white shadow-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
            {error}
          </p>
        )}
      </form>
    </div>
  </div>
  );
}

