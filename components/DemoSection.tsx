"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = { type: "customer" | "bot" | "system" | "agent"; text: string; /** agent only */ name?: string };
/** Optional "behind the scenes" side panel for a chat slide: what Plainbot does while it writes its reply. */
type SidePanel = {
  /** Index of the bot message during whose typing indicator the activity steps run. */
  triggerIndex: number;
  stepMs: number;
  steps: string[];
  /** The record Plainbot found or created (an order, a return, ...) with a progress timeline. */
  card: {
    icon: "bag" | "return" | "person";
    title: string;
    subtitle: string;
    badge: string;
    stages: string[];
    current: number;
    /** Stage to show once the conversation has finished (defaults to `current`). */
    currentWhenDone?: number;
    footerLabel: string;
    footerValue: string;
  };
  /** Message count at which the card's timeline moves on to `currentWhenDone` (defaults to the end of the chat). */
  advanceAt?: number;
  /** Outcome badge shown once the conversation has finished. */
  outcome: string;
};
type ChatTab = { key: string; label: string; type: "chat"; messages: ChatMessage[]; panel?: SidePanel };
type DashboardTab = {
  key: string;
  label: string;
  type: "dashboard";
  /** `hero` marks the one number the eye should land on. */
  kpis: { label: string; value: number; suffix?: string; hero?: boolean }[];
  stores: { name: string; platform: string; count: number; auto: number }[];
};
type SetupTab = {
  key: string;
  label: string;
  type: "setup";
  steps: { title: string; body: string }[];
  /** The example store the setup preview walks through. */
  store: { domain: string; platform: string; stats: { label: string; value: number }[] };
};
type Tab = ChatTab | DashboardTab | SetupTab;

// Illustrative demo content (design.md §2.3). Not real customer data.
const TABS: Tab[] = [
  {
    key: "order",
    label: "Order Status",
    type: "chat",
    messages: [
      { type: "customer", text: "Hey, any update on order #4821?" },
      {
        type: "bot",
        text: "Order #4821 shipped yesterday via UPS — arriving Thu, Sep 18. Tracking: 1Z4X 29A 0311 284 512.",
      },
      { type: "customer", text: "Perfect, thank you!" },
      { type: "bot", text: "Anytime — I've also emailed you the tracking link." },
    ],
    panel: {
      triggerIndex: 1,
      stepMs: 300,
      steps: ["Read the customer's question", "Found order #4821 in Shopify", "Checked UPS tracking"],
      card: {
        icon: "bag",
        title: "Order #4821",
        subtitle: "Everyday Hoodie · Sage, M",
        badge: "UPS",
        stages: ["Ordered", "Shipped", "Out for delivery", "Delivered"],
        current: 1,
        footerLabel: "Arriving",
        footerValue: "Thu, Sep 18",
      },
      outcome: "Resolved automatically in 6 seconds · no human needed",
    },
  },
  {
    key: "returns",
    label: "Returns & Refunds",
    type: "chat",
    messages: [
      { type: "customer", text: "I need to return this hoodie — wrong size." },
      {
        type: "bot",
        text: "Started a return for order #4790. Once it's back with us, $42.00 refunds to your card in 3–5 business days.",
      },
      { type: "customer", text: "That was easy, thanks!" },
    ],
    panel: {
      triggerIndex: 1,
      stepMs: 300,
      steps: ["Found order #4790 in Shopify", "Checked the 30-day return policy", "Started the return and refund"],
      card: {
        icon: "return",
        title: "Return · Order #4790",
        subtitle: "Everyday Hoodie · Wrong size",
        badge: "Eligible",
        stages: ["Requested", "Label sent", "Received", "Refunded"],
        current: 1,
        footerLabel: "Refund to card",
        footerValue: "$42.00 · 3–5 business days",
      },
      outcome: "Resolved automatically in 8 seconds · no human needed",
    },
  },
  {
    key: "escalate",
    label: "Escalation to a Human",
    type: "chat",
    messages: [
      { type: "customer", text: "This is the third time my order's been delayed. I'm frustrated." },
      {
        type: "bot",
        text: "I understand — this needs a real person. Looping in Maya from support now, she has your full order history.",
      },
      { type: "system", text: "Maya has joined the chat." },
      {
        type: "agent",
        name: "Maya",
        text: "Hi, it's Maya. I can see your order history and I'm sorry about the third delay. I'm chasing the carrier now and will email you an update within the hour.",
      },
      { type: "customer", text: "Thank you, I appreciate it." },
    ],
    panel: {
      triggerIndex: 1,
      stepMs: 300,
      steps: [
        "Noticed the customer is frustrated",
        "Pulled the order history (3 contacts)",
        "Picked an available agent: Maya",
      ],
      card: {
        icon: "person",
        title: "Handoff to Maya",
        subtitle: "Delayed shipment · 3rd contact",
        badge: "High priority",
        stages: ["Flagged", "Assigned", "Joined chat", "Resolved"],
        current: 1,
        currentWhenDone: 2,
        footerLabel: "Sent to Maya:",
        footerValue: "full order history + chat",
      },
      advanceAt: 3,
      outcome: "Handed to a human in 4 seconds · full context attached",
    },
  },
  {
    key: "dashboard",
    label: "Multi-Store Dashboard",
    type: "dashboard",
    kpis: [
      { label: "Conversations", value: 255 },
      { label: "Auto-resolved", value: 92, suffix: "%", hero: true },
      { label: "Escalated", value: 18 },
    ],
    stores: [
      { name: "Sunny Threads Co.", platform: "Shopify", count: 128, auto: 94 },
      { name: "Northwind Outdoors", platform: "WooCommerce", count: 76, auto: 88 },
      { name: "Casa Botanica", platform: "Shopify", count: 51, auto: 91 },
    ],
  },
  {
    key: "setup",
    label: "Setup",
    type: "setup",
    steps: [
      { title: "Connect your store", body: "One-click for Shopify, a quick plugin for WooCommerce." },
      { title: "Plainbot learns your store", body: "Products, policies, and FAQs — automatically." },
      { title: "Go live", body: "Widget appears immediately, on the free tier." },
    ],
    store: {
      domain: "sunnythreads.com",
      platform: "Shopify",
      stats: [
        { label: "Products", value: 48 },
        { label: "Policy pages", value: 6 },
        { label: "FAQs", value: 12 },
      ],
    },
  },
];

/** A timeout that remembers how much time is left, so the demo can be paused and resumed exactly. */
type PausableTimer = {
  id: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
  arm: () => void;
};

const AUTO_ADVANCE_HOLD_MS = 2600;
/** Dashboard reveal stages: 1 the three numbers, 2 to 4 one store each. */
const DASHBOARD_STEPS = 4;
/** Setup slide: each step gets this long, enough for its preview to play out. */
const SETUP_STEP_MS = 900;
const SWIPE_THRESHOLD_PX = 50;

/** How long a slide plays (mirrors the timings in runSequence) plus the hold before auto-advancing. */
function tabDurationMs(tab: Tab): number {
  let ms = 0;
  if (tab.type === "chat") {
    for (const m of tab.messages) ms += m.type === "bot" || m.type === "agent" ? 900 + 450 : 350 + 400;
  } else if (tab.type === "dashboard") {
    ms = DASHBOARD_STEPS * 380;
  } else {
    ms = tab.steps.length * SETUP_STEP_MS;
  }
  return ms + AUTO_ADVANCE_HOLD_MS;
}

const BOT_AVATAR =
  "flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-terracotta text-[11px] font-bold text-cream";
const AGENT_AVATAR =
  "flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-sage text-[11px] font-bold text-white";
const RISE = "motion-safe:animate-plnb-rise";
const SEGMENT_GAP_PX = 6;
/** When the last slide hands over to the first, the bar wipes clear from left to right, one segment at a time. */
const WIPE_MS = 110;
/** Each segment starts exactly when the previous one has finished, so wipes never overlap. */
const WIPE_STEP_MS = WIPE_MS;
/** The whole sweep; the next slide waits this long before it starts playing. */
const WIPE_TOTAL_MS = TABS.length * WIPE_STEP_MS;
/** Selecting a slide: each segment on the way fills (going forward) or empties (going back), this long each. */
const JUMP_FILL_MS = 110;
/** Width of one segment in the control bar (segments share the row equally, separated by gaps). */
const SEGMENT_WIDTH = `calc((100% - ${(TABS.length - 1) * SEGMENT_GAP_PX}px) / ${TABS.length})`;
/** Left edge of segment i within the row. */
const segmentLeft = (i: number) => `calc(${i} * (${SEGMENT_WIDTH} + ${SEGMENT_GAP_PX}px))`;

const ARROW_BTN =
  "flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border border-ink/[.12] text-ink outline-none transition-colors duration-200 hover:bg-peach focus-visible:ring-2 focus-visible:ring-terracotta/60";

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

/** Number that counts up from 0 once `active` (jumps straight to the value for reduced motion). */
function CountUp({ to, active, ms = 900 }: { to: number; active: boolean; ms?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) {
      setN(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const progress = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to, ms]);
  return <>{n}</>;
}

function Check({ className = "h-2.5 w-2.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.5l2.3 2.3L9.5 3.5" />
    </svg>
  );
}

/** Record card (an order, a return, ...) with a timeline whose progress line fills in on arrival. */
function InfoCard({ card, finished }: { card: SidePanel["card"]; finished: boolean }) {
  const last = card.stages.length - 1;
  const activeStage = finished && card.currentWhenDone !== undefined ? card.currentWhenDone : card.current;
  return (
    <div
      className={`${RISE} mt-5 rounded-2xl border border-ink/[.08] bg-white p-4 shadow-[0_12px_30px_-18px_rgba(43,34,28,.3)]`}
      style={{ animationDuration: ".5s" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-peach text-terracotta-dark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={
                card.icon === "bag"
                  ? "M6 8h12l1 12H5L6 8zM9 8V6a3 3 0 016 0v2"
                  : card.icon === "person"
                    ? "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-3.5 3.6-6 8-6s8 2.5 8 6"
                    : "M9 14l-4-4 4-4M5 10h9a5 5 0 010 10h-3"
              }
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-ink">{card.title}</div>
          <div className="truncate text-xs text-warm-muted">{card.subtitle}</div>
        </div>
        <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-bold text-warm-body">{card.badge}</span>
      </div>

      <div className="relative mt-5">
        {/* track + animated progress up to the current stage */}
        <div className="absolute inset-x-8 top-[6px] h-[2px] rounded-full bg-ink/10">
          <div
            className="h-full origin-left rounded-full bg-sage transition-[width] duration-500 ease-out motion-safe:[animation:plnb-progress_900ms_ease-out_300ms_both]"
            style={{ width: `${(activeStage / last) * 100}%` }}
          />
        </div>
        <div className="relative flex justify-between">
          {card.stages.map((stage, i) => {
            const done = i < activeStage;
            const current = i === activeStage;
            return (
              <div key={stage} className="flex w-16 flex-col items-center gap-1.5 text-center">
                <span
                  className={`relative flex h-[14px] w-[14px] items-center justify-center rounded-full border-2 ${
                    done
                      ? "border-sage bg-sage text-white"
                      : current
                        ? "border-terracotta bg-terracotta"
                        : "border-ink/15 bg-white"
                  }`}
                >
                  {done && <Check className="h-2 w-2" />}
                  {current && (
                    <span className="absolute inset-[-4px] rounded-full bg-terracotta/30 motion-safe:animate-ping" />
                  )}
                </span>
                <span
                  className={`text-[10px] leading-tight ${current ? "font-bold text-ink" : "font-medium text-warm-muted"}`}
                >
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-ink/[.06] pt-3 text-xs text-warm-body">
        {card.footerLabel} <span className="font-bold text-ink">{card.footerValue}</span>
      </div>
    </div>
  );
}

/** Side panel next to the chat: the steps Plainbot runs, the order it found, and the outcome. */
function ActivityPanel({
  panel,
  panelStep,
  working,
  cardVisible,
  resolved,
  advanced,
}: {
  panel: SidePanel;
  panelStep: number;
  working: boolean;
  cardVisible: boolean;
  resolved: boolean;
  advanced: boolean;
}) {
  const started = working || cardVisible || panelStep > 0;
  return (
    <aside
      className="hidden flex-col border-l border-ink/[.06] bg-cream/60 px-6 py-6 font-manrope md:flex"
      aria-label="What Plainbot does behind the scenes (illustrative)"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.06em] text-warm-muted">
          <span
            className={`h-1.5 w-1.5 rounded-full ${started ? "bg-terracotta motion-safe:animate-pulse" : "bg-ink/20"}`}
          />
          Behind the scenes
        </div>
        <span className="text-[11px] italic text-warm-muted">Illustrative</span>
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {panel.steps.map((label, i) => {
          const done = cardVisible || i < panelStep;
          const running = !done && working && i === panelStep;
          return (
            <li
              key={label}
              className={`flex items-center gap-2.5 text-[13px] transition-opacity duration-300 ${
                done || running ? "opacity-100" : "opacity-35"
              }`}
            >
              <span
                className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full ${
                  done ? "bg-sage text-white" : "border border-ink/15 bg-white"
                }`}
              >
                {done && <Check />}
                {running && (
                  <span className="h-3 w-3 rounded-full border-2 border-terracotta/30 border-t-terracotta motion-safe:animate-spin" />
                )}
              </span>
              <span className={done ? "text-ink" : "text-warm-body"}>{label}</span>
            </li>
          );
        })}
      </ul>
      {!started && <p className="mt-3 text-[13px] text-warm-muted">Waiting for a customer question…</p>}

      {cardVisible && <InfoCard card={panel.card} finished={advanced} />}

      {resolved && (
        <div
          className={`${RISE} mt-4 inline-flex items-center gap-2 self-start rounded-full bg-[#EAF0E9] px-3.5 py-2 text-xs font-bold text-[#4E6E52]`}
          style={{ animationDuration: ".5s" }}
        >
          <Check className="h-3 w-3" />
          {panel.outcome}
        </div>
      )}
    </aside>
  );
}

/** Right-hand preview of the Setup slide: shows what the current step is doing, one step at a time. */
function SetupPreview({ tab, step, finished }: { tab: SetupTab; step: number; finished: boolean }) {
  const { domain, platform, stats } = tab.store;
  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((d) => (
          <span key={d} className="h-2 w-2 rounded-full bg-ink/15" />
        ))}
        <span className="ml-2 rounded-full bg-white px-3 py-1 text-[11px] text-warm-muted">{domain}</span>
      </div>
      {step === 2 && (
        <span
          className={`flex items-center gap-1.5 text-[11px] font-bold ${finished ? "text-[#4E6E52]" : "text-terracotta-dark"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${finished ? "bg-sage" : "bg-terracotta motion-safe:animate-pulse"}`}
          />
          {finished ? "Live" : "Going live…"}
        </span>
      )}
    </div>
  );

  return (
    <div>
      <div className="relative h-[290px] overflow-hidden rounded-2xl border border-ink/[.08] bg-cream/60 p-5">
        <div key={step} className={`${RISE} h-full`} style={{ animationDuration: ".35s" }}>
          {step === 0 && (
            <div className="flex h-full flex-col justify-center gap-3">
              <div className="text-xs font-bold text-warm-muted">Your store URL</div>
              <div className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-[15px] text-ink">
                <span className="inline-block" style={{ animation: "plnb-type 500ms steps(16) both" }}>
                  {domain}
                </span>
              </div>
              <div
                className={`${RISE} inline-flex items-center gap-2 self-start rounded-full bg-[#EAF0E9] px-3.5 py-2 text-xs font-bold text-[#4E6E52]`}
                style={{ animationDuration: ".35s", animationDelay: "550ms" }}
              >
                <Check className="h-3 w-3" />
                {platform} store detected
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex h-full flex-col">
              {header}
              <div className="mt-8 grid grid-cols-3 gap-3">
                {stats.map((st) => (
                  <div key={st.label} className="rounded-2xl border border-ink/[.06] bg-white px-4 py-4">
                    <div className="font-display text-[34px] leading-none text-ink">
                      <CountUp to={st.value} active ms={700} />
                    </div>
                    <div className="mt-2 text-[11px] font-bold uppercase tracking-[.04em] text-warm-muted">
                      {st.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full origin-left rounded-full bg-terracotta"
                  style={{ animation: "plnb-progress 800ms ease-out both" }}
                />
              </div>
              <div className="mt-2 text-xs text-warm-muted">Reading products, policies and FAQs…</div>
            </div>
          )}

          {step === 2 && (
            <div className="relative flex h-full flex-col">
              {header}
              <div className="mt-6 space-y-2.5">
                <div className="h-3 w-2/3 rounded-full bg-ink/10" />
                <div className="h-3 w-1/2 rounded-full bg-ink/10" />
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((b) => (
                    <div key={b} className="h-16 rounded-xl bg-ink/[.06]" />
                  ))}
                </div>
              </div>
              <div className="absolute bottom-0 right-0 flex flex-col items-end gap-2">
                <div
                  className={`${RISE} rounded-2xl rounded-br-md bg-peach px-4 py-2.5 text-[13px] text-ink`}
                  style={{ animationDuration: ".4s", animationDelay: "350ms" }}
                >
                  Hi! Need help with an order?
                </div>
                <div
                  className={`${RISE} flex h-11 w-11 items-center justify-center rounded-full bg-terracotta text-base font-bold text-cream shadow-[0_10px_24px_-10px_rgba(190,91,55,.7)]`}
                  style={{ animationDuration: ".4s", animationDelay: "150ms" }}
                >
                  P
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 text-right text-[11px] italic text-warm-muted">Illustrative example</div>
    </div>
  );
}

/** "See it in action" demo (design.md §2.3): a self-playing carousel of chat / dashboard / setup slides. */
export default function DemoSection({ autoAdvance = true }: { autoAdvance?: boolean }) {
  const [activeTab, setActiveTab] = useState(0);
  const [chatStep, setChatStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  // How many of the side panel's activity steps have finished (order slide).
  const [panelStep, setPanelStep] = useState(0);
  const [revealCount, setRevealCount] = useState(0);
  const [visible, setVisible] = useState(false);
  // Bumped every time a slide sequence (re)starts, so the countdown line restarts with it.
  const [runId, setRunId] = useState(0);
  // Direction of the last navigation; null until the first one so the initial slide doesn't animate.
  const [slideDir, setSlideDir] = useState<"next" | "prev" | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const timers = useRef<PausableTimer[]>([]);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const started = useRef(false);
  const touchStartX = useRef<number | null>(null);
  // The running countdown fill, read when the user navigates so the segment can continue from where it was.
  const countdownRef = useRef<HTMLSpanElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  // True right after the loop wraps from the last slide to the first, until the next navigation.
  const [wiping, setWiping] = useState(false);
  // Bumped on each wrap so the highlight remounts at the start (and fades in) instead of sliding back.
  const [wrapCount, setWrapCount] = useState(0);
  // True while the wrap sweep is running, before the first slide starts playing again.
  const [sweeping, setSweeping] = useState(false);
  // How long the current sweep lasts; the highlight waits this long before reappearing.
  const [sweepMs, setSweepMs] = useState(0);
  // The last manual navigation: segments fill in turn (forward) or empty in turn (back), starting from the
  // countdown's progress in the segment that was active. Cleared when the demo advances on its own.
  const [sweepPlan, setSweepPlan] = useState<{
    kind: "fill" | "unfill";
    from: number;
    to: number;
    progress: number;
  } | null>(null);

  const later = useCallback((fn: () => void, ms: number) => {
    const timer: PausableTimer = {
      id: null,
      remaining: ms,
      startedAt: 0,
      arm: () => {
        timer.startedAt = performance.now();
        timer.id = setTimeout(() => {
          timers.current = timers.current.filter((t) => t !== timer);
          fn();
        }, timer.remaining);
      },
    };
    timers.current.push(timer);
    if (!pausedRef.current) timer.arm();
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => t.id !== null && clearTimeout(t.id));
    timers.current = [];
  }, []);

  /** Freeze every pending step, keeping how long each still has to wait. */
  const pauseAll = useCallback(() => {
    const now = performance.now();
    timers.current.forEach((t) => {
      if (t.id === null) return;
      clearTimeout(t.id);
      t.id = null;
      t.remaining = Math.max(0, t.remaining - (now - t.startedAt));
    });
  }, []);

  const resumeAll = useCallback(() => {
    timers.current.forEach((t) => t.arm());
  }, []);

  const setPlaying = (playing: boolean) => {
    if (playing === !pausedRef.current) return;
    pausedRef.current = !playing;
    setPaused(!playing);
    if (playing) resumeAll();
    else pauseAll();
  };

  // Sweeps (loop restart, or jumping ahead): empty the playback state right away (so the first slide doesn't flash old content) and
  // hold the countdown back until the left-to-right sweep has finished.
  const beginSweep = useCallback((totalMs: number) => {
    setWrapCount((n) => n + 1);
    setSweepMs(totalMs);
    setSweeping(true);
    setChatStep(0);
    setIsTyping(false);
    setRevealCount(0);
    setPanelStep(0);
  }, []);

  const runSequence = useCallback(
    (index: number) => {
      clearTimers();
      setSweeping(false);
      setPanelStep(0);
      setRunId((n) => n + 1);
      const tab = TABS[index];

      const afterSequence = () => {
        if (!autoAdvance) return;
        later(() => {
          const next = (index + 1) % TABS.length;
          setSlideDir("next");
          setWiping(next === 0);
          setSweepPlan(null);
          setActiveTab(next);
          if (next === 0) {
            beginSweep(WIPE_TOTAL_MS);
            later(() => runSequence(next), WIPE_TOTAL_MS);
          } else {
            runSequence(next);
          }
        }, AUTO_ADVANCE_HOLD_MS);
      };

      if (tab.type === "chat") {
        setChatStep(0);
        setIsTyping(false);
        const stepChat = (idx: number) => {
          if (idx >= tab.messages.length) return afterSequence();
          if (tab.messages[idx].type === "bot" || tab.messages[idx].type === "agent") {
            setIsTyping(true);
            if (tab.panel && idx === tab.panel.triggerIndex) {
              const { steps, stepMs } = tab.panel;
              steps.forEach((_, n) => later(() => setPanelStep(n + 1), (n + 1) * stepMs));
            }
            later(() => {
              setIsTyping(false);
              setChatStep(idx + 1);
              later(() => stepChat(idx + 1), 450);
            }, 900);
          } else {
            later(() => {
              setChatStep(idx + 1);
              later(() => stepChat(idx + 1), 400);
            }, 350);
          }
        };
        stepChat(0);
      } else {
        setRevealCount(0);
        const total = tab.type === "dashboard" ? DASHBOARD_STEPS : tab.steps.length;
        const stepReveal = (idx: number) => {
          if (idx >= total) return afterSequence();
          later(
            () => {
              setRevealCount(idx + 1);
              stepReveal(idx + 1);
            },
            tab.type === "dashboard" ? 380 : SETUP_STEP_MS
          );
        };
        stepReveal(0);
      }
    },
    [autoAdvance, beginSweep, clearTimers, later]
  );

  // Reveal on scroll; start the demo the first time the section is in view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (visible && !started.current) {
      started.current = true;
      later(() => runSequence(0), 600);
    }
  }, [visible, runSequence, later]);

  useEffect(() => clearTimers, [clearTimers]);

  // Chat windows keep the newest message (or the typing indicator) in view.
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatStep, isTyping, activeTab]);

  /** How far the active segment's countdown has got (0 to 1), so a sweep can continue from there. */
  const currentProgress = () => {
    if (!autoAdvance) return 1;
    if (sweeping) return 0;
    const anim = countdownRef.current?.getAnimations()[0];
    const duration = Number(anim?.effect?.getTiming().duration);
    if (!anim || !duration) return 0;
    return Math.min(1, Math.max(0, Number(anim.currentTime) / duration));
  };

  const goTo = (i: number, dir: "next" | "prev") => {
    if (i === activeTab) return;
    const progress = currentProgress();
    clearTimers();
    pausedRef.current = false;
    setPaused(false);
    setSlideDir(dir);
    const wraps = dir === "next" && activeTab === TABS.length - 1 && i === 0;
    setWiping(wraps);
    setActiveTab(i);
    if (wraps) {
      setSweepPlan(null);
      beginSweep(WIPE_TOTAL_MS);
      later(() => runSequence(i), WIPE_TOTAL_MS);
      return;
    }
    // Same treatment for every selection: forward fills the segments on the way one after another, going
    // back empties them one after another (starting with the active one), then the chosen slide starts.
    const kind = i > activeTab ? "fill" : "unfill";
    const steps = kind === "fill" ? i - activeTab : activeTab - i + 1;
    setSweepPlan({ kind, from: activeTab, to: i, progress });
    const total = steps * JUMP_FILL_MS;
    beginSweep(total);
    later(() => runSequence(i), total);
  };
  const goNext = () => goTo((activeTab + 1) % TABS.length, "next");
  const goPrev = () => goTo((activeTab - 1 + TABS.length) % TABS.length, "prev");

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  const tab = TABS[activeTab];
  const nextMessage = tab.type === "chat" ? tab.messages[chatStep] : undefined;

  const renderChat = (chatTab: ChatTab) => {
    // The message being prepared while the typing indicator shows.
    const pendingAgent = nextMessage?.type === "agent";
    return (
      <>
        {chatTab.messages.slice(0, chatStep).map((m, i) => {
          if (m.type === "system") {
            return (
              <div
                key={i}
                className={`${RISE} text-[15px] italic leading-[1.5] text-terracotta-dark`}
                style={{ animationDuration: ".45s" }}
              >
                {m.text}
              </div>
            );
          }
          if (m.type === "agent") {
            return (
              <div key={i} className="flex w-full items-start justify-start gap-2">
                <div className={`${AGENT_AVATAR} mt-[31px]`}>{(m.name ?? "A")[0]}</div>
                <div className={`${RISE} flex max-w-[78%] flex-col gap-1`} style={{ animationDuration: ".45s" }}>
                  <span className="text-[11px] font-bold leading-4 text-[#4E6E52]">{m.name} · Support</span>
                  <div className="rounded-2xl bg-[#EAF0E9] px-[17px] py-[13px] text-[15px] leading-[1.5] text-ink">
                    {m.text}
                  </div>
                </div>
              </div>
            );
          }
          const isBot = m.type === "bot";
          return (
            <div key={i} className={`flex w-full items-start gap-2 ${isBot ? "justify-start" : "justify-end"}`}>
              {isBot && <div className={`${BOT_AVATAR} mt-[11px]`}>P</div>}
              <div
                className={`${RISE} max-w-[78%] rounded-2xl px-[17px] py-[13px] text-[15px] leading-[1.5] ${
                  isBot ? "bg-peach text-ink" : "bg-ink text-cream"
                }`}
                style={{ animationDuration: ".45s" }}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-center justify-start gap-2">
            <div className={pendingAgent ? AGENT_AVATAR : BOT_AVATAR}>
              {pendingAgent ? (nextMessage?.name ?? "A")[0] : "P"}
            </div>
            <div
              className={`flex w-fit gap-[5px] rounded-2xl px-[17px] py-[13px] ${pendingAgent ? "bg-[#EAF0E9]" : "bg-peach"}`}
              aria-hidden
            >
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className={`inline-block h-[7px] w-[7px] rounded-full motion-safe:animate-plnb-dot ${
                    pendingAgent ? "bg-[#4E6E52]" : "bg-terracotta-dark"
                  }`}
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
            <span className={`text-xs ${pendingAgent ? "text-[#4E6E52]" : "text-terracotta-dark"}`}>
              {pendingAgent ? `${nextMessage?.name} is typing…` : "Plainbot is typing…"}
            </span>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="bg-cream pb-16">
      <section
        id="demo"
        ref={sectionRef}
        className={`${paused ? "plnb-paused " : ""}mx-[6vw] rounded-[32px] bg-[radial-gradient(120%_160%_at_15%_0%,#F3E3D6_0%,#FBF7F2_55%)] px-[5vw] pb-14 pt-14 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)] ${
          visible ? "translate-y-0 opacity-100" : "translate-y-7 opacity-0"
        }`}
      >
        <div className="mx-auto max-w-[1120px]" role="group" aria-roledescription="carousel" aria-label="Plainbot demo">
          <div className="max-w-[640px]">
            <div className="font-manrope text-[13px] font-bold uppercase tracking-[.04em] text-terracotta-dark">
              See it in action
            </div>
            <h2 className="mt-3 font-display text-[clamp(28px,3.6vw,42px)] font-normal text-ink">
              One widget, every kind of question.
            </h2>
            <p className="mt-3 font-manrope text-base text-warm-body">
              Real conversations. Real dashboards. No generic UI chrome.
            </p>
          </div>

          <div
            className="mt-9 overflow-hidden rounded-3xl border border-ink/[.08] bg-white shadow-[0_24px_60px_-24px_rgba(43,34,28,.2)]"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              key={activeTab}
              role="group"
              aria-roledescription="slide"
              aria-label={`${activeTab + 1} of ${TABS.length}: ${tab.label}`}
              className={`flex min-h-[460px] items-center ${
                slideDir === "next" ? "plnb-slide-next" : slideDir === "prev" ? "plnb-slide-prev" : ""
              }`}
            >
              {tab.type === "chat" && !tab.panel && (
                <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3.5 px-8 pb-11 pt-9 font-manrope">
                  {renderChat(tab)}
                </div>
              )}

              {tab.type === "chat" && tab.panel && (
                <div className="grid h-[460px] w-full grid-rows-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="flex min-h-0 min-w-0 flex-col font-manrope">
                    <div className="flex items-center gap-3 border-b border-ink/[.06] px-6 py-3.5">
                      <div className="relative flex-none">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-sm font-bold text-cream">
                          P
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-sage" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-ink">Plainbot</div>
                        <div className="truncate text-xs text-warm-muted">Sunny Threads Co. · Online</div>
                      </div>
                    </div>
                    <div
                      ref={chatScrollRef}
                      className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-6 pb-6 pt-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {renderChat(tab)}
                    </div>
                  </div>
                  <ActivityPanel
                    panel={tab.panel}
                    panelStep={panelStep}
                    working={isTyping && chatStep === tab.panel.triggerIndex}
                    cardVisible={chatStep > tab.panel.triggerIndex}
                    resolved={chatStep >= tab.messages.length}
                    advanced={chatStep >= (tab.panel.advanceAt ?? tab.messages.length)}
                  />
                </div>
              )}

              {tab.type === "dashboard" && (
                <div className="w-full px-6 pb-6 pt-6 font-manrope md:px-10">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-ink">All stores</span>
                      <span className="rounded-full bg-peach px-2.5 py-1 text-[11px] font-bold text-terracotta-dark">
                        Last 7 days
                      </span>
                    </div>
                    <span className="text-[11px] italic text-warm-muted">
                      Sample data — illustrative dashboard, not live numbers
                    </span>
                  </div>

                  <div
                    className={`grid grid-cols-3 gap-3 transition-[opacity,transform] duration-500 ${
                      revealCount >= 1 ? "translate-y-0 opacity-100" : "translate-y-2.5 opacity-0"
                    }`}
                  >
                    {tab.kpis.map((k) => (
                      <div
                        key={k.label}
                        className={`rounded-2xl border px-4 py-4 sm:px-5 ${
                          k.hero ? "border-transparent bg-peach/60" : "border-ink/[.06] bg-cream/60"
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-[.04em] text-warm-muted sm:text-[11px]">
                          {k.label}
                        </div>
                        <div
                          className={`mt-2 font-display text-[30px] leading-none sm:text-[44px] ${
                            k.hero ? "text-terracotta" : "text-ink"
                          }`}
                        >
                          <CountUp to={k.value} active={revealCount >= 1} />
                          {k.suffix}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col gap-2.5">
                    {tab.stores.map((st, i) => {
                      const shown = revealCount >= i + 2;
                      return (
                        <div
                          key={st.name}
                          className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-ink/[.08] bg-white px-4 py-3 text-ink transition-[opacity,transform] duration-500 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_72px] ${
                            shown ? "translate-y-0 opacity-100" : "translate-y-2.5 opacity-0"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-peach text-sm font-bold text-terracotta-dark">
                              {st.name[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold">{st.name}</div>
                              <div className="text-[11px] text-warm-muted">{st.platform}</div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-sm font-bold text-sage">{st.auto}%</span>
                              <span className="text-[11px] text-warm-muted">auto-resolved</span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
                              <div
                                className="h-full rounded-full bg-sage transition-[width] duration-700 ease-out"
                                style={{ width: shown ? `${st.auto}%` : "0%", transitionDelay: "150ms" }}
                              />
                            </div>
                          </div>
                          <div className="hidden text-right sm:block">
                            <div className="text-sm font-bold">{st.count}</div>
                            <div className="text-[11px] text-warm-muted">chats</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {tab.type === "setup" && (
                <div className="mx-auto grid w-full max-w-[980px] items-center gap-8 px-6 py-8 font-manrope md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-12 md:px-10">
                  <ol className="flex flex-col">
                    {tab.steps.map((st, i) => {
                      const done = i < revealCount;
                      const running = i === revealCount;
                      const last = i === tab.steps.length - 1;
                      return (
                        <li
                          key={st.title}
                          className={`flex items-stretch gap-4 transition-opacity duration-300 ${
                            done || running ? "opacity-100" : "opacity-40"
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 text-sm font-bold transition-colors duration-300 ${
                                done
                                  ? "border-sage bg-sage text-white"
                                  : running
                                    ? "border-terracotta bg-white text-terracotta"
                                    : "border-ink/20 bg-white text-warm-muted"
                              }`}
                            >
                              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                            </div>
                            {!last && (
                              <span
                                className={`my-1.5 w-px flex-1 transition-colors duration-300 ${done ? "bg-sage" : "bg-ink/10"}`}
                              />
                            )}
                          </div>
                          <div className={last ? "" : "pb-7"}>
                            <div className="text-[17px] font-bold leading-8 text-ink">{st.title}</div>
                            <div className="text-sm text-warm-body">{st.body}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  <SetupPreview tab={tab} step={Math.min(revealCount, 2)} finished={revealCount >= tab.steps.length} />
                </div>
              )}
            </div>
          </div>

          {/* Carousel controls: one pill with arrows at the ends and a segment per slide. The active
              segment fills with colour over the slide's play time, which doubles as the countdown. */}
          <div className="mt-6 flex items-center gap-1.5 rounded-full border border-ink/[.08] bg-white p-1.5 font-manrope shadow-[0_10px_30px_-18px_rgba(43,34,28,.25)]">
            <button type="button" className={ARROW_BTN} onClick={goPrev} aria-label="Previous slide">
              <Arrow dir="prev" />
            </button>
            <button
              type="button"
              className={ARROW_BTN}
              onClick={() => setPlaying(paused)}
              aria-label={paused ? "Play demo" : "Pause demo"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                {paused ? <path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" /> : (
                  <>
                    <rect x="6" y="5" width="4" height="14" rx="1.2" />
                    <rect x="14" y="5" width="4" height="14" rx="1.2" />
                  </>
                )}
              </svg>
            </button>

            <div className="relative flex min-w-0 flex-1 gap-1.5">
              {/* Highlight behind the labels: glides to the selected segment. Finished segments each fill as their
                  own pill (see the buttons below), so the gaps between segments always stay visible. */}
              <span
                key={wrapCount}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 overflow-hidden rounded-full bg-peach/30 transition-[left] duration-500 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none"
                style={{
                  left: segmentLeft(activeTab),
                  width: SEGMENT_WIDTH,
                  ...(wrapCount > 0 && {
                    animation: `plnb-fade-in 300ms ease-out ${sweepMs}ms both`,
                  }),
                }}
              >
                {autoAdvance ? (
                  runId > 0 &&
                  !sweeping && (
                    <span
                      key={runId}
                      ref={countdownRef}
                      className="absolute inset-0 bg-no-repeat"
                      style={{
                        backgroundImage: "linear-gradient(#F3E3D6, #F3E3D6)",
                        backgroundSize: "0% 100%",
                        animation: `plnb-fill ${tabDurationMs(tab)}ms linear forwards`,
                      }}
                    />
                  )
                ) : (
                  <span className="absolute inset-0 rounded-full bg-peach" />
                )}
              </span>

              {TABS.map((t, i) => {
                const active = i === activeTab;
                const done = i < activeTab;
                // Style for this segment's own fill layer.
                let fillStyle: React.CSSProperties;
                if (sweepPlan && sweepPlan.kind === "fill" && i >= sweepPlan.from && i < sweepPlan.to) {
                  // Going forward: this segment fills left to right once the previous one is full. The segment
                  // we left carries on from where its countdown had got to.
                  const idx = i - sweepPlan.from;
                  fillStyle = {
                    width: "100%",
                    ["--from-w" as string]: `${idx === 0 ? sweepPlan.progress * 100 : 0}%`,
                    animation: `plnb-grow-from ${JUMP_FILL_MS}ms ease-out ${idx * JUMP_FILL_MS}ms both`,
                  };
                } else if (sweepPlan && sweepPlan.kind === "unfill" && i >= sweepPlan.to && i <= sweepPlan.from) {
                  // Going back: empty the segments right to left, starting with the one that was active.
                  const idx = sweepPlan.from - i;
                  fillStyle = {
                    width: "0%",
                    ["--from-w" as string]: `${idx === 0 ? sweepPlan.progress * 100 : 100}%`,
                    animation: `plnb-shrink-from ${JUMP_FILL_MS}ms ease-out ${idx * JUMP_FILL_MS}ms both`,
                  };
                } else if (wiping) {
                  // Loop restart: clear left to right, anchored on the right so the colour retreats from the
                  // left edge, one segment after another.
                  fillStyle = {
                    left: "auto",
                    right: 0,
                    width: "0%",
                    animation: `plnb-wipe ${WIPE_MS}ms ease-out ${i * WIPE_STEP_MS}ms both`,
                  };
                } else {
                  // No transition: the demo advancing on its own only ever finishes a segment its countdown
                  // has already filled.
                  fillStyle = { width: done ? "100%" : "0%" };
                }
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => goTo(i, i > activeTab ? "next" : "prev")}
                    aria-label={`Go to slide ${i + 1}: ${t.label}`}
                    aria-current={active ? "true" : undefined}
                    className={`relative z-10 flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-ink/[.12] px-2 text-[13px] font-bold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-terracotta/60 ${
                      active || done ? "text-ink" : "text-warm-muted hover:bg-cream hover:text-ink"
                    }`}
                  >
                    <span aria-hidden className="absolute inset-y-0 left-0 bg-peach" style={fillStyle} />
                    <span className="relative truncate">
                      <span className="xl:hidden">{i + 1}</span>
                      <span className="hidden xl:inline">{t.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button type="button" className={ARROW_BTN} onClick={goNext} aria-label="Next slide">
              <Arrow dir="next" />
            </button>
          </div>
          {/* Below the xl breakpoint there is only room for numbers, so name the active slide */}
          <div className="mt-3 text-center font-manrope text-[13px] font-bold text-ink xl:hidden" aria-hidden>
            {activeTab + 1} / {TABS.length} · {tab.label}
          </div>
        </div>
      </section>
    </div>
  );
}
