"use client";

import { useEffect, useState } from "react";
import AnimatedNumber from "@/components/AnimatedNumber";

export type FunnelStage = {
  label: string;
  sublabel?: string;
  value: number;
  color: string;
};

function convRate(a: number, b: number): string {
  if (b === 0) return "—";
  return Math.round((a / b) * 100) + "%";
}

export default function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    setGrown(false);
    const t = setTimeout(() => setGrown(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex w-full items-stretch gap-2">
      {stages.map((stage, i) => {
        const rate = i > 0 ? convRate(stage.value, stages[i - 1].value) : null;
        const delay = i * 70;

        return (
          <div key={stage.label} className="flex flex-1 items-center gap-2">
            {/* Conversion rate connector */}
            {i > 0 && (
              <div
                className="flex shrink-0 flex-col items-center gap-1"
                style={{
                  opacity: grown ? 1 : 0,
                  transition: `opacity 0.4s ease ${delay - 20}ms`,
                }}
              >
                <span className="font-manrope text-[11px] font-bold" style={{ color: stage.color }}>
                  {rate}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 8h12M9 4l4 4-4 4"
                    stroke={stage.color}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}

            {/* Card */}
            <div
              className="flex flex-1 flex-col rounded-2xl px-5 py-4"
              style={{
                background: stage.color + "14",
                border: `2px solid ${stage.color}55`,
                opacity: grown ? 1 : 0,
                transform: grown ? "translateY(0)" : "translateY(10px)",
                transition: `opacity 0.45s ease ${delay}ms, transform 0.45s cubic-bezier(.16,1,.3,1) ${delay}ms`,
              }}
            >
              <span
                className="font-manrope text-[10px] font-extrabold uppercase tracking-[0.14em]"
                style={{ color: stage.color }}
              >
                {stage.label}
              </span>

              <span
                className="mt-2 font-display text-[36px] leading-none"
                style={{ color: stage.color }}
              >
                <AnimatedNumber value={stage.value} duration={650} />
              </span>

              {stage.sublabel && (
                <p className="mt-1 font-manrope text-[11px]" style={{ color: stage.color + "99" }}>
                  {stage.sublabel}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
