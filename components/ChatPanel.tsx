"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { useBot } from "@/components/BotContext";
import { planHasPaidConversationTier, UNLIMITED_CONVERSATIONS_DISPLAY } from "@/lib/plans";
import { contrastingForegroundForHex, resolvedWidgetAccentColor } from "@/lib/widget-color";
import AssistantMessageContent from "@/components/AssistantMessageContent";

const SUPPORT_WAIT_PREFIX = "__SUPPORT_WAIT__\n";
const SUPPORT_WAIT_TEXT = `${SUPPORT_WAIT_PREFIX}No one is available in chat right this moment. Your request has been sent to our team—they will follow up with you by email when they respond. Feel free to ask anything else here in the meantime.`;

interface ChatPanelProps {
  compact?: boolean;
  /** When true (snippet/embed): hide "Test your ecommerce assistant", conversation count, Dashboard/Integration links. */
  embed?: boolean;
}

export default function ChatPanel({ compact = false, embed = false }: ChatPanelProps) {
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
  const [showForwardForm, setShowForwardForm] = useState(false);
  const [forwardName, setForwardName] = useState("");
  const [forwardEmail, setForwardEmail] = useState("");
  const [forwardOrderRef, setForwardOrderRef] = useState("");
  const [forwardMessage, setForwardMessage] = useState("");
  const [forwardSubmitting, setForwardSubmitting] = useState(false);
  const [forwardFormSubmitted, setForwardFormSubmitted] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const greetingSentRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const lastReplyShownRef = useRef<string | null>(null);
  const waitNoticeLockRef = useRef(false);
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

  const clearChat = () => {
    lastSyncSinceRef.current = "";
    syncedMsgIdsRef.current = new Set();
    setHandoffMode("ai");
    try {
      const cid = conversationIdRef.current;
      if (cid && chatbotId) {
        window.sessionStorage.removeItem(`plainbot-wait-2m:${chatbotId}:${cid}`);
      }
    } catch {
      /* */
    }
    waitNoticeLockRef.current = false;
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
    const cid = conversationIdRef.current;
    if (!cid) {
      setError("Start the conversation first so we can forward it.");
      return;
    }
    const name = forwardName.trim() || "Customer";
    const email = forwardEmail.trim();
    if (!email) {
      setError("Email is required to forward.");
      return;
    }
    setForwardSubmitting(true);
    setError(null);
    try {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Guards against a fast double-submit (double-click, double form-submit event) that
    // fires before React re-renders the "disabled" Send button — `loading` state alone
    // isn't checked here since the state update from the first call hasn't applied yet.
    if (submittingRef.current) return;
    setError(null);
    const question = input.trim();
    if (!question) return;
    const unlimited = conversationRemaining >= UNLIMITED_CONVERSATIONS_DISPLAY;
    if (!unlimited && conversationRemaining <= 0) {
      setError("You've used all your conversations this month. Upgrade or renew from the dashboard to continue.");
      return;
    }

    submittingRef.current = true;
    const userId = addMessage({ role: "user", content: question });
    syncedMsgIdsRef.current.add(userId);
    const assistantId = addMessage({ role: "assistant", content: "" });
    syncedMsgIdsRef.current.add(assistantId);
    setInput("");
    setLoading(true);

    // Show typing indicator immediately for better perceived performance
    updateMessage(assistantId, { content: "..." });

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
          ...(chatbotId && { chatbotId }),
          ...(conversationIdRef.current && { conversationId: conversationIdRef.current }),
        }),
      });

      if (!res.ok) {
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
      // Advance the sync cursor to "now" so the real-time sync effect's next poll — which
      // dedupes by the server's own message ids, never the client-generated ids used for our
      // optimistic messages above — doesn't treat this exchange as new and re-add a duplicate.
      lastSyncSinceRef.current = new Date().toISOString();

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

  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 shadow-soft ${
        compact ? "h-[420px]" : "h-[560px]"
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        {embed ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">
                {paidHidesPlainbotBranding ? storeHeaderLabel : "Plainbot"}
              </p>
              {!paidHidesPlainbotBranding && (
                <p className="text-[11px] text-slate-500">Powered by Plainbot</p>
              )}
            </div>
            <button
              type="button"
              onClick={clearChat}
              className="shrink-0 text-xs text-slate-400 hover:text-slate-100"
            >
              Clear
            </button>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-semibold text-slate-100">
                Test your ecommerce assistant
              </p>
              <p className="text-xs text-slate-400">
                {unlimitedRemaining
                  ? "Unlimited conversations on your plan"
                  : `${conversationRemaining} conversations remaining in your plan`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard">
                <Button variant="ghost" className="px-3 py-1.5 text-xs">
                  Dashboard
                </Button>
              </Link>
              <Link href="/integration">
                <Button variant="ghost" className="px-3 py-1.5 text-xs">
                  Integration
                </Button>
              </Link>
              <button
                type="button"
                onClick={clearChat}
                className="text-xs text-slate-400 hover:text-slate-100"
              >
                Clear
              </button>
            </div>
          </>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
        {showForwardForm && !forwardFormSubmitted && conversationIdRef.current && (
          <form onSubmit={handleForwardToEmail} className="mb-3 rounded-lg border border-slate-700 bg-slate-800/80 p-3 space-y-2">
            <p className="text-xs font-medium text-slate-200">Contact our team</p>
            <p className="text-[11px] text-slate-400">We&apos;ll email your details and full chat to support.</p>
            <input
              type="text"
              placeholder="Your name"
              value={forwardName}
              onChange={(e) => setForwardName(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <input
              type="email"
              placeholder="Your email *"
              value={forwardEmail}
              onChange={(e) => setForwardEmail(e.target.value)}
              required
              className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <input
              type="text"
              placeholder="Order number (optional)"
              value={forwardOrderRef}
              onChange={(e) => setForwardOrderRef(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <textarea
              placeholder="How can we help? (optional)"
              value={forwardMessage}
              onChange={(e) => setForwardMessage(e.target.value)}
              rows={2}
              className="w-full resize-none rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="px-3 py-1.5 text-xs" disabled={forwardSubmitting}>
                {forwardSubmitting ? "Sending…" : "Send to support"}
              </Button>
              <button type="button" onClick={() => setShowForwardForm(false)} className="text-xs text-slate-400 hover:text-slate-100">
                Cancel
              </button>
            </div>
          </form>
        )}
        {!scrapedData && (
          <div className="mb-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <strong>No store data yet.</strong> The chatbot needs your website to be analyzed first. If you already entered a URL but saw a rate-limit or “access denied” error, the scrape didn’t complete—go to{" "}
            <a href="/create-bot" className="font-semibold text-primary-300 underline hover:text-primary-200">
              Connect your store
            </a>
            , try again or use a different URL, then come back here. You can also keep chatting with a generic assistant below.
          </div>
        )}
        {handoffMode === "human" && (
          <div className="mb-2 rounded-lg border border-emerald-500/35 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
            A team member is chatting with you. Messages go to them in real time.
          </div>
        )}
        {personality && handoffMode === "ai" && (
          <div className="mb-1 text-xs text-slate-400">
            Personality: <span className="font-semibold text-slate-200">{personality}</span>
          </div>
        )}

        {messages.length === 0 && (
          <p className="text-xs text-slate-500">
            Ask something like{" "}
            <span className="italic text-slate-300">
              “What are your shipping and return policies?”
            </span>
            .
          </p>
        )}

        {messages.map((m, idx) => {
          const isAgentMsg = m.role === "agent";
          const isSupportReply = supportReplyIds.has(m.id) || isAgentMsg;
          const replyMeta = supportReplyMeta.get(m.id);
          const isWaitNotice = m.role === "assistant" && m.content.startsWith(SUPPORT_WAIT_PREFIX);
          const isFirstUserMessage = m.role === "user" && messages.findIndex((x) => x.role === "user") === idx;
          if (isWaitNotice) {
            return (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[90%] rounded-xl border border-indigo-500/35 bg-indigo-950/40 px-4 py-3 text-sm text-indigo-100">
                  <p className="text-xs font-medium text-indigo-300/90">Update</p>
                  <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed">
                    {m.content.slice(SUPPORT_WAIT_PREFIX.length)}
                  </p>
                </div>
              </div>
            );
          }
          if (isSupportReply) {
            return (
              <div key={m.id}>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl border border-sky-500/40 bg-sky-950/50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-sky-400">
                      <span>{isAgentMsg ? "Team member" : "Support reply"}</span>
                      {replyMeta?.repliedAt && (
                        <span className="text-slate-500 font-normal">
                          {new Date(replyMeta.repliedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
                      {m.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={m.id}>
              <div
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    m.role === "user"
                      ? embed && embedAccent
                        ? "rounded-br-sm"
                        : "bg-primary-600 text-white rounded-br-sm"
                      : "bg-slate-800 text-slate-100 rounded-bl-sm"
                  }`}
                  style={
                    m.role === "user" && embed && embedAccent
                      ? { backgroundColor: embedAccent, color: embedAccentFg }
                      : undefined
                  }
                >
                  {m.role === "assistant" ? (
                    <AssistantMessageContent content={m.content} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</p>
                  )}
                </div>
              </div>
              {isFirstUserMessage && currentTicketRef && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/20 text-sky-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-semibold text-slate-100">Creating ticket</p>
                    <p className="text-sm text-slate-400">Ticket #{currentTicketRef}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {ticketResolved && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20 text-emerald-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-slate-100">Ticket resolved</p>
              <p className="text-sm text-slate-400">Our team or the AI has responded.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary-400" />
            Thinking...
          </div>
        )}

        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-800 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            rows={compact ? 2 : 3}
            className={`min-h-[44px] flex-1 resize-none rounded-xl border border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              embed
                ? "!bg-[#0f172a] !text-[#f1f5f9] placeholder:!text-slate-500"
                : "bg-slate-900 text-slate-100 placeholder:text-slate-500"
            }`}
            placeholder={
              !unlimitedRemaining && conversationRemaining <= 0
                ? "You have used all conversations for this period."
                : "Ask a question about your store..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={disabled || !input.trim()}
            className="shrink-0"
            style={
              embed && embedAccent
                ? {
                    backgroundColor: embedAccent,
                    backgroundImage: "none",
                    color: embedAccentFg,
                  }
                : undefined
            }
          >
            {!unlimitedRemaining && conversationRemaining <= 0 ? "Upgrade" : loading ? "Sending..." : "Send"}
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-2 py-1.5">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

