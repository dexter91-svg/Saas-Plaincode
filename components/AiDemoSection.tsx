"use client";

import { useEffect, useRef, useState } from "react";
import Card from "./Card";

const ACTIVITY_STEPS = [
  { label: "Searching orders", detail: "Q 12345", icon: "search", done: false },
  { label: "Getting order", detail: "Order #12345", icon: "order", done: false },
  { label: "Cancelling order", detail: "Order #12345", icon: "cancel", done: false },
  { label: "Creating ticket", detail: "Ticket #TK-001", icon: "ticket", done: false },
];

const STEP_DELAY = 700;

function StepIcon({ icon, done }: { icon: string; done: boolean }) {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold";
  if (done) {
    return (
      <span className={`${base} bg-emerald-500/20 text-emerald-400`}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  switch (icon) {
    case "search":
      return (
        <span className={`${base} bg-primary-500/20 text-primary-400`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
      );
    case "order":
      return (
        <span className={`${base} bg-primary-500/20 text-primary-400`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </span>
      );
    case "cancel":
      return (
        <span className={`${base} bg-amber-500/20 text-amber-400`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      );
    case "ticket":
      return (
        <span className={`${base} bg-sky-500/20 text-sky-400`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        </span>
      );
    default:
      return <span className={`${base} bg-slate-700 text-slate-400`}>?</span>;
  }
}

export default function AiDemoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visibleStep, setVisibleStep] = useState(-1);
  const [showResponse, setShowResponse] = useState(false);
  const hasPlayed = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayed.current) {
          hasPlayed.current = true;
          ACTIVITY_STEPS.forEach((_, i) => {
            setTimeout(() => setVisibleStep(i), STEP_DELAY * (i + 1));
          });
          setTimeout(
            () => setShowResponse(true),
            STEP_DELAY * (ACTIVITY_STEPS.length + 1)
          );
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative border-t border-slate-800 bg-black px-4 py-16 sm:px-6 lg:px-8 lg:py-24 overflow-hidden"
    >
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 h-64 w-96 rounded-full bg-primary-500/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-48 w-72 rounded-full bg-sky-500/5 blur-[80px]" />
      </div>
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
            See it in action
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-100 sm:text-4xl">
            Watch the AI resolve a real query
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            From customer message to resolution and ticket creation in seconds.
            This is what your Pro plan customers will experience.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Chat conversation - left 3 cols */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="bg-slate-900/80 border-slate-700/80 transition-all hover:border-slate-600/80">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Customer conversation
              </p>

              {/* Customer message */}
              <div className="mb-4">
                <p className="mb-1 text-[11px] text-slate-500">Anna wrote 2m ago</p>
                <div className="rounded-xl rounded-tl-sm border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200">
                  I would like to cancel my order #12345. I ordered the wrong
                  size by mistake.
                </div>
              </div>

              {/* Thinking badge */}
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs text-slate-400">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary-400" />
                  Thought for 9s
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2.5 py-1 text-[11px] font-semibold text-primary-400">
                  Autopilot
                </span>
              </div>

              {/* Order card */}
              {visibleStep >= 1 && (
                <div className="mb-4 inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 transition-opacity duration-500">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Order #12345
                    </p>
                    <p className="text-xs text-slate-500">
                      {visibleStep >= 2 ? (
                        <span className="text-red-400">Cancelled</span>
                      ) : (
                        "Processing"
                      )}
                      {" "}&middot; $89.00
                    </p>
                  </div>
                  <svg className="ml-2 h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}

              {/* AI response */}
              {showResponse && (
                <div className="space-y-2 transition-opacity duration-700">
                  <p className="text-[11px] text-slate-500">
                    AI replied 1m ago
                  </p>
                  <div className="rounded-xl rounded-tl-sm border border-slate-700 bg-slate-800 px-4 py-3 text-sm leading-relaxed text-slate-200">
                    <p>Hi Anna,</p>
                    <p className="mt-2">
                      I&apos;ve just cancelled order #12345 for you. Your refund
                      of $89.00 will be processed within 3-5 business days.
                    </p>
                    <p className="mt-2">
                      A support ticket{" "}
                      <span className="font-semibold text-sky-400">
                        #TK-001
                      </span>{" "}
                      has been created for your reference.
                    </p>
                    <p className="mt-2">I hope you have a wonderful day.</p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Activity panel - right 2 cols */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900/80 h-full border-slate-700/80 transition-all hover:border-slate-600/80">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-200">
                  Activity &middot;{" "}
                  <span className="text-slate-500">9s</span>
                </p>
                <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <svg className="h-3.5 w-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Thinking process
              </p>

              <div className="space-y-4">
                {ACTIVITY_STEPS.map((step, i) => {
                  const isVisible = i <= visibleStep;
                  const isDone = i < visibleStep;
                  return (
                    <div
                      key={step.label}
                      className={`flex items-center gap-3 transition-all duration-700 ease-out ${
                        isVisible
                          ? "translate-y-0 opacity-100"
                          : "translate-y-3 opacity-0"
                      }`}
                    >
                      <StepIcon icon={step.icon} done={isDone} />
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {step.label}
                          {isDone && step.icon === "cancel" && (
                            <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20">
                              <svg className="h-2.5 w-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{step.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {showResponse && (
                <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                  <p className="text-xs font-medium text-emerald-400">
                    Resolved in 9 seconds
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Ticket #TK-001 created for tracking
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
