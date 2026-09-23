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
      className="-mx-1 flex max-w-full items-start justify-start overflow-x-auto overflow-y-hidden px-1 py-2 sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Onboarding steps"
    >
      {STEPS.map((step, idx) => {
        const isActive = step.num === currentStep;
        const isPast = step.num < currentStep;
        const isDone = isPast;
        const isReachable = step.num <= currentStep;

        const circle = (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
              isActive
                ? "animate-plnb-step-pop scale-100 bg-terracotta text-cream shadow-[0_4px_12px_-2px_rgba(190,91,55,.5)]"
                : isDone
                  ? "border border-terracotta/40 bg-terracotta/10 text-terracotta"
                  : `border border-ink/15 bg-white text-warm-muted ${isReachable ? "group-hover:border-ink/30 group-hover:text-ink" : ""}`
            }`}
          >
            {isDone ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              step.num
            )}
          </span>
        );
        const label = (
          <span
            className={`hidden font-manrope text-xs sm:block ${
              isActive ? "font-semibold text-ink" : "text-warm-muted"
            }`}
          >
            {step.label}
          </span>
        );

        return (
          <Fragment key={step.num}>
            {isReachable ? (
              <Link
                href={step.path}
                className="group flex shrink-0 flex-col items-center gap-2 px-2 text-center"
                aria-current={isActive ? "step" : undefined}
                title={`Go to: ${step.label}`}
              >
                {circle}
                {label}
              </Link>
            ) : (
              <div
                className="flex shrink-0 cursor-not-allowed flex-col items-center gap-2 px-2 text-center"
                title={`Finish step ${currentStep} first`}
                aria-disabled="true"
              >
                {circle}
                {label}
              </div>
            )}
            {idx < STEPS.length - 1 && (
              <span
                className={`mt-4 h-px w-6 shrink-0 transition-colors duration-500 sm:w-16 ${
                  step.num < currentStep ? "bg-terracotta/40" : "bg-ink/15"
                }`}
                aria-hidden
              />
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
