"use client";

import Link from "next/link";
import { Fragment } from "react";

const STEPS = [
  { num: 1, label: "Connect Store", path: "/create-bot" },
  { num: 2, label: "Website Feeds", path: "/training-data" },
  { num: 3, label: "Train AI", path: "/bot-personality" },
  { num: 4, label: "Knowledge & memory", path: "/knowledge" },
  { num: 5, label: "Install Widget", path: "/integration" },
] as const;

export default function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <nav
      className="-mx-1 flex max-w-full items-center justify-start gap-1 overflow-x-auto overflow-y-hidden px-1 py-2 pb-3 sm:mx-0 sm:justify-center sm:gap-2 sm:overflow-visible sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Onboarding steps"
    >
      {STEPS.map((step, idx) => {
        const isActive = step.num === currentStep;
        const isPast = step.num < currentStep;
        return (
          <Fragment key={step.num}>
            <Link
              href={step.path}
              className={`group flex shrink-0 items-center gap-2 rounded-lg px-1 py-0.5 text-sm font-medium transition-colors sm:px-1.5 ${
                isActive
                  ? "text-primary-400"
                  : isPast
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-300"
              }`}
              aria-current={isActive ? "step" : undefined}
              title={`Go to: ${step.label}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  isActive
                    ? "border-primary-500 bg-primary-500/20 text-primary-400"
                    : isPast
                      ? "border-slate-500 bg-slate-800 text-slate-400 group-hover:border-slate-400"
                      : "border-slate-600 bg-transparent text-slate-500 group-hover:border-slate-500"
                }`}
              >
                {step.num}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </Link>
            {idx < STEPS.length - 1 && (
              <span className="mx-0.5 h-px w-3 shrink-0 bg-slate-600 sm:mx-1 sm:w-6" aria-hidden />
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
