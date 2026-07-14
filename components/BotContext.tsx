"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { UNLIMITED_CONVERSATIONS_DISPLAY } from "@/lib/plans";
import { BOT_STATE_STORAGE_KEY } from "@/lib/bot-local-storage";

export type Personality =
  | "Friendly"
  | "Professional"
  | "Sales-focused"
  | "Premium Luxury";

export type ChatRole = "user" | "assistant" | "agent";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

export type ForwardMode = "email" | "ticket";

export interface ForwardedConversation {
  id: string;
  conversationId: string;
  customer: string;
  preview: string;
  forwardedAs: ForwardMode;
  createdAt: number;
}

export interface ScrapedData {
  url: string;
  title: string;
  description: string;
  content: string;
  products?: { name: string; price?: string; url?: string }[];
  /** AI guard rails from server — mirrored for UI; chat API loads from DB when chatbotId is sent. */
  guardRails?: string;
}

export type ActivityType = "resolved" | "query" | "forwarded" | "system" | "warning";

export type TicketType =
  | "ai_resolved"
  | "forwarded_email"
  | "forwarded_human"
  | "database_check"
  | "escalated"
  | "other";

export interface Ticket {
  id: string;
  ticketRef: string;
  type: TicketType;
  customer: string;
  queryPreview: string;
  outcome?: string;
  status: "open" | "resolved" | "in_progress";
  conversationId?: string;
  createdAt: number;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  createdAt: number;
}

export type UserPlan = "free" | "pro" | "custom" | "business" | "growth" | "agency";

export type StoreSummary = {
  id: string;
  name: string;
  label: string;
  websiteUrl: string;
};

const VALID_PLANS: UserPlan[] = ["free", "pro", "custom", "business", "growth", "agency"];

interface BotContextValue {
  userPlan: UserPlan;
  setUserPlan: (p: UserPlan) => void;

  chatbotId: string | null;
  setChatbotId: (id: string | null) => void;

  /** Connected stores (chatbots) for this account */
  stores: StoreSummary[];
  setStores: (s: StoreSummary[]) => void;
  /** Max stores for plan, or null = unlimited */
  storeLimit: number | null;
  setStoreLimit: (n: number | null) => void;
  /** Switch dashboard / widget context to another store */
  selectStore: (storeId: string) => Promise<void>;

  scrapedData: ScrapedData | null;
  setScrapedData: (data: ScrapedData | null) => void;

  personality: Personality | null;
  setPersonality: (p: Personality | null) => void;

  conversationRemaining: number;
  setConversationRemaining: (n: number) => void;
  decrementConversations: () => void;

  messages: ChatMessage[];
  setMessages: (msgs: ChatMessage[]) => void;
  addMessage: (msg: Omit<ChatMessage, "id" | "createdAt"> & Partial<Pick<ChatMessage, "id" | "createdAt">>) => string;
  updateMessage: (id: string, patch: Partial<Pick<ChatMessage, "content">>) => void;
  clearMessages: () => void;

  forwarded: ForwardedConversation[];
  addForwarded: (
    item: Omit<ForwardedConversation, "id" | "createdAt"> &
      Partial<Pick<ForwardedConversation, "id" | "createdAt">>
  ) => string;
  clearForwarded: () => void;

  recentActivity: ActivityItem[];
  addActivity: (item: Omit<ActivityItem, "id" | "createdAt"> & Partial<Pick<ActivityItem, "id" | "createdAt">>) => string;

  tickets: Ticket[];
  addTicket: (item: Omit<Ticket, "id" | "ticketRef" | "createdAt"> & Partial<Pick<Ticket, "id" | "ticketRef" | "createdAt">>) => string;
}

function planFromStorage(p: string | undefined): UserPlan {
  if (p && VALID_PLANS.includes(p as UserPlan)) return p as UserPlan;
  return "free";
}

const BotContext = createContext<BotContextValue | undefined>(undefined);

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function nextTicketRef(existing: Ticket[]): string {
  const nums = existing
    .map((t) => {
      const m = t.ticketRef.match(/^TK-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `TK-${String(next).padStart(3, "0")}`;
}

export function BotProvider({ children }: { children: ReactNode }) {
  const [userPlan, setUserPlan] = useState<UserPlan>("free");
  const [chatbotId, setChatbotId] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [storeLimit, setStoreLimit] = useState<number | null>(1);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [conversationRemaining, setConversationRemaining] = useState<number>(100);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [forwarded, setForwarded] = useState<ForwardedConversation[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromStorage = safeParseJson<{
      userPlan?: UserPlan;
      chatbotId: string | null;
      stores?: StoreSummary[];
      storeLimit?: number | null;
      scrapedData: ScrapedData | null;
      personality: Personality | null;
      conversationRemaining: number;
      messages: ChatMessage[];
      forwarded: ForwardedConversation[];
      recentActivity: ActivityItem[];
      tickets: Ticket[];
    }>(window.localStorage.getItem(BOT_STATE_STORAGE_KEY));

    if (fromStorage) {
      setUserPlan(planFromStorage(fromStorage.userPlan));
      setChatbotId(fromStorage.chatbotId ?? null);
      if (Array.isArray(fromStorage.stores)) setStores(fromStorage.stores);
      if (fromStorage.storeLimit !== undefined) setStoreLimit(fromStorage.storeLimit);
      setScrapedData(fromStorage.scrapedData ?? null);
      setPersonality(fromStorage.personality ?? null);
      setConversationRemaining(
        typeof fromStorage.conversationRemaining === "number"
          ? fromStorage.conversationRemaining
          : 100
      );
      setMessages(Array.isArray(fromStorage.messages) ? fromStorage.messages : []);
      setForwarded(Array.isArray(fromStorage.forwarded) ? fromStorage.forwarded : []);
      setRecentActivity(Array.isArray(fromStorage.recentActivity) ? fromStorage.recentActivity : []);
      setTickets(Array.isArray(fromStorage.tickets) ? fromStorage.tickets : []);
    }
  }, []);

  // On load (and after refresh), hydrate from server so nothing is lost
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = safeParseJson<{ chatbotId?: string | null }>(window.localStorage.getItem(BOT_STATE_STORAGE_KEY));
    const preferredStoreId =
      typeof saved?.chatbotId === "string" && saved.chatbotId ? saved.chatbotId : null;
    const botUrl = preferredStoreId
      ? `/api/chatbots/me?storeId=${encodeURIComponent(preferredStoreId)}`
      : "/api/chatbots/me";

    Promise.all([
      fetch("/api/me").then((r) => (r.ok ? r.json() : null)),
      fetch(botUrl).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/conversations/stats").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([me, bot, stats]) => {
        if (me?.plan && VALID_PLANS.includes(me.plan as UserPlan)) {
          setUserPlan(me.plan as UserPlan);
        }
        if (bot && Array.isArray(bot.chatbots)) {
          setStores(bot.chatbots as StoreSummary[]);
        }
        if (bot && "storeLimit" in bot) {
          setStoreLimit((bot as { storeLimit: number | null }).storeLimit ?? 1);
        }
        if (bot?.chatbot) {
          const c = bot.chatbot;
          setChatbotId(c.id);
          setScrapedData({
            url: c.websiteUrl || "",
            title: c.websiteTitle || "",
            description: c.websiteDescription || "",
            content: c.websiteContent || "",
            products: Array.isArray(c.products) ? c.products : [],
            ...(typeof (c as { guardRails?: string }).guardRails === "string" && (c as { guardRails: string }).guardRails
              ? { guardRails: (c as { guardRails: string }).guardRails }
              : {}),
          });
          setPersonality((c.personality as Personality) || "Friendly");
        } else {
          // Server has no chatbot for this account — drop stale localStorage from a previous user/session.
          setChatbotId(null);
          setScrapedData(null);
          setPersonality("Friendly");
          setMessages([]);
          setForwarded([]);
          setRecentActivity([]);
          setTickets([]);
        }
        if (stats?.unlimited) {
          setConversationRemaining(UNLIMITED_CONVERSATIONS_DISPLAY);
        } else if (stats && typeof stats.remaining === "number") {
          setConversationRemaining(Math.max(0, stats.remaining));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      BOT_STATE_STORAGE_KEY,
      JSON.stringify({
        userPlan,
        chatbotId,
        stores,
        storeLimit,
        scrapedData,
        personality,
        conversationRemaining,
        messages,
        forwarded,
        recentActivity,
        tickets,
      })
    );
  }, [userPlan, chatbotId, stores, storeLimit, scrapedData, personality, conversationRemaining, messages, forwarded, recentActivity, tickets]);

  const decrementConversations = useCallback(() => {
    setConversationRemaining((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  const selectStore = useCallback(async (storeId: string) => {
    try {
      const r = await fetch(`/api/chatbots/me?storeId=${encodeURIComponent(storeId)}`);
      const bot = r.ok ? await r.json() : null;
      if (!bot?.chatbot) return;
      if (Array.isArray(bot.chatbots)) setStores(bot.chatbots as StoreSummary[]);
      if ("storeLimit" in bot) setStoreLimit((bot as { storeLimit: number | null }).storeLimit ?? 1);
      const c = bot.chatbot;
      setChatbotId(c.id);
      setScrapedData({
        url: c.websiteUrl || "",
        title: c.websiteTitle || "",
        description: c.websiteDescription || "",
        content: c.websiteContent || "",
        products: Array.isArray(c.products) ? c.products : [],
        ...(typeof (c as { guardRails?: string }).guardRails === "string" && (c as { guardRails: string }).guardRails
          ? { guardRails: (c as { guardRails: string }).guardRails }
          : {}),
      });
      setPersonality((c.personality as Personality) || "Friendly");
    } catch {
      /* ignore */
    }
  }, []);

  const addMessage = useCallback(
    (
      msg: Omit<ChatMessage, "id" | "createdAt"> &
        Partial<Pick<ChatMessage, "id" | "createdAt">>
    ) => {
      const id = msg.id ?? makeId(msg.role);
      const createdAt = msg.createdAt ?? Date.now();
      setMessages((prev) => [...prev, { id, createdAt, role: msg.role, content: msg.content }]);
      return id;
    },
    []
  );

  const updateMessage = useCallback((id: string, patch: Partial<Pick<ChatMessage, "content">>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  const addForwarded = useCallback(
    (
      item: Omit<ForwardedConversation, "id" | "createdAt"> &
        Partial<Pick<ForwardedConversation, "id" | "createdAt">>
    ) => {
      const id = item.id ?? makeId("fwd");
      const createdAt = item.createdAt ?? Date.now();
      setForwarded((prev) => [...prev, { ...item, id, createdAt }]);
      return id;
    },
    []
  );

  const clearForwarded = useCallback(() => setForwarded([]), []);

  const addTicket = useCallback(
    (
      item: Omit<Ticket, "id" | "ticketRef" | "createdAt"> &
        Partial<Pick<Ticket, "id" | "ticketRef" | "createdAt">>
    ) => {
      const id = item.id ?? makeId("tkt");
      const createdAt = item.createdAt ?? Date.now();
      setTickets((prev) => {
        const ticketRef = item.ticketRef ?? nextTicketRef(prev);
        const ticket: Ticket = {
          id,
          ticketRef,
          type: item.type,
          customer: item.customer ?? "Customer",
          queryPreview: item.queryPreview ?? "",
          outcome: item.outcome,
          status: item.status ?? "resolved",
          conversationId: item.conversationId,
          createdAt,
        };
        return [...prev, ticket];
      });
      return id;
    },
    []
  );

  const addActivity = useCallback(
    (item: Omit<ActivityItem, "id" | "createdAt"> & Partial<Pick<ActivityItem, "id" | "createdAt">>) => {
      const id = item.id ?? makeId("act");
      const createdAt = item.createdAt ?? Date.now();
      setRecentActivity((prev) => [{ ...item, id, createdAt }, ...prev].slice(0, 20));
      return id;
    },
    []
  );

  const value = useMemo<BotContextValue>(
    () => ({
      userPlan,
      setUserPlan,
      chatbotId,
      setChatbotId,
      stores,
      setStores,
      storeLimit,
      setStoreLimit,
      selectStore,
      scrapedData,
      setScrapedData,
      personality,
      setPersonality,
      conversationRemaining,
      setConversationRemaining,
      decrementConversations,
      messages,
      setMessages,
      addMessage,
      updateMessage,
      clearMessages,
      forwarded,
      addForwarded,
      clearForwarded,
      recentActivity,
      addActivity,
      tickets,
      addTicket,
    }),
    [
      userPlan,
      chatbotId,
      stores,
      storeLimit,
      selectStore,
      scrapedData,
      personality,
      conversationRemaining,
      decrementConversations,
      messages,
      addMessage,
      updateMessage,
      clearMessages,
      forwarded,
      addForwarded,
      clearForwarded,
      recentActivity,
      addActivity,
      tickets,
      addTicket,
    ]
  );

  return <BotContext.Provider value={value}>{children}</BotContext.Provider>;
}

export function useBot() {
  const ctx = useContext(BotContext);
  if (!ctx) throw new Error("useBot must be used inside BotProvider");
  return ctx;
}

