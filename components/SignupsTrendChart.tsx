"use client";

import { useEffect, useRef, useState } from "react";

export type TrendPoint = { label: string; value: number; tooltipLabel: string };

const TERRACOTTA = "#BE5B37";
const SAGE = "#5C8A6B";
const H = 190;
const PAD_LEFT = 30;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 26;
const BAR_GAP = 1;
const GROUP_GAP = 1;

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export default function SignupsTrendChart({
  data,
  activationData,
  labelEvery = 1,
  animationKey,
}: {
  data: TrendPoint[];
  activationData?: TrendPoint[];
  labelEvery?: number;
  animationKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [grown, setGrown] = useState(false);
  const [W, setW] = useState(600);

  useEffect(() => {
    setGrown(false);
    const t = setTimeout(() => setGrown(true), 20);
    return () => clearTimeout(t);
  }, [animationKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) setW(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dual = !!activationData && activationData.length > 0;
  const n = data.length;
  const allValues = [...data.map((d) => d.value), ...(activationData ?? []).map((d) => d.value), 1];
  const max = niceMax(Math.max(...allValues));
  const plotWidth = W - PAD_LEFT - PAD_RIGHT;
  const plotHeight = H - PAD_TOP - PAD_BOTTOM;
  const slotWidth = n > 0 ? plotWidth / n : plotWidth;

  // Fill as much of each slot as possible, but cap so bars stay consistent.
  const barWidth = dual
    ? Math.max(2, Math.min(18, Math.floor((slotWidth - GROUP_GAP) / 2 - BAR_GAP)))
    : Math.max(2, Math.min(36, Math.floor(slotWidth - BAR_GAP * 2)));

  const yTicks = [0, 0.33, 0.66, 1].map((t) => Math.round(max * t));
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoveredActiv = hoverIndex !== null && activationData ? activationData[hoverIndex] : null;
  const hoverCenterPct = hoverIndex !== null && n > 0 ? ((hoverIndex + 0.5) / n) * 100 : 50;

  function barY(value: number, grown: boolean) {
    const h = Math.max((value / max) * plotHeight, value > 0 ? 3 : 1);
    return { h: grown ? h : 0, y: PAD_TOP + plotHeight - (grown ? h : 0) };
  }

  return (
    <div ref={containerRef} className="relative" style={{ opacity: grown ? 1 : 0, transition: "opacity 0.3s ease" }}>
      {/* Legend */}
      {dual && (
        <div className="mb-2 flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-manrope text-[11px] font-semibold text-warm-muted">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TERRACOTTA, opacity: 0.85 }} />
            Signups
          </span>
          <span className="flex items-center gap-1.5 font-manrope text-[11px] font-semibold text-warm-muted">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SAGE, opacity: 0.85 }} />
            Activations
          </span>
        </div>
      )}

      {/* Tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-ink px-3 py-1.5 shadow-soft-lg transition-[left] duration-150 ease-out"
          style={{ left: `${hoverCenterPct}%`, top: dual ? 26 : 0 }}
        >
          <div className="mb-0.5 font-manrope text-[10px] text-white/50">{hovered.tooltipLabel}</div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-manrope text-sm font-bold text-white">
              <span className="h-2 w-2 rounded-sm" style={{ background: TERRACOTTA }} />
              {hovered.value}
            </span>
            {dual && hoveredActiv && (
              <span className="flex items-center gap-1.5 font-manrope text-sm font-bold text-white">
                <span className="h-2 w-2 rounded-sm" style={{ background: SAGE }} />
                {hoveredActiv.value}
              </span>
            )}
          </div>
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Grid + y-axis */}
        {yTicks.map((tick, i) => {
          const y = PAD_TOP + plotHeight - (tick / max) * plotHeight;
          return (
            <g key={i}>
              <line x1={PAD_LEFT} y1={y} x2={W - PAD_RIGHT} y2={y}
                stroke="#2B221C" strokeOpacity={0.06} strokeWidth={1} />
              <text x={PAD_LEFT - 8} y={y + 3} textAnchor="end" fontSize={9} fill="#8C7C6E"
                style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}>
                {tick.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* x-axis labels */}
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={PAD_LEFT + slotWidth * (i + 0.5)} y={H - 6}
              textAnchor="middle" fontSize={9} fill="#8C7C6E"
              style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}>
              {d.label}
            </text>
          ) : null
        )}

        {/* Bars */}
        {data.map((d, i) => {
          const slotCx = PAD_LEFT + slotWidth * (i + 0.5);
          const isHover = hoverIndex === i;
          const activ = activationData?.[i];

          // In dual mode: signup bar left of center, activation bar right
          const sgCx = dual ? slotCx - GROUP_GAP / 2 - barWidth / 2 : slotCx;
          const acCx = dual ? slotCx + GROUP_GAP / 2 + barWidth / 2 : slotCx;

          const sg = barY(d.value, grown);
          const ac = activ ? barY(activ.value, grown) : null;

          const transBase = (idx: number) =>
            `height 0.5s cubic-bezier(.16,1,.3,1) ${idx * 10}ms, y 0.5s cubic-bezier(.16,1,.3,1) ${idx * 10}ms, opacity 0.15s`;

          return (
            <g key={i}>
              {/* Hover target */}
              <rect x={PAD_LEFT + slotWidth * i} y={PAD_TOP} width={slotWidth} height={plotHeight}
                fill="transparent"
                onPointerEnter={() => setHoverIndex(i)}
                onPointerLeave={() => setHoverIndex((c) => (c === i ? null : c))}
                tabIndex={0} role="img"
                aria-label={`${d.tooltipLabel}: ${d.value}${activ ? ` / ${activ.value}` : ""}`}
              />

              {/* Signup bar */}
              <rect x={sgCx - barWidth / 2} y={sg.y} width={barWidth} height={sg.h} rx={3} ry={3}
                fill={TERRACOTTA} opacity={d.value === 0 ? 0.15 : isHover ? 1 : 0.85} pointerEvents="none"
                style={{ transition: transBase(i) }}
              />
              <rect x={sgCx - barWidth / 2} y={sg.y + Math.max(sg.h - 3, 0)} width={barWidth} height={Math.min(3, sg.h)}
                fill={TERRACOTTA} opacity={d.value === 0 ? 0.15 : isHover ? 1 : 0.85} pointerEvents="none"
                style={{ transition: transBase(i) }}
              />

              {/* Activation bar */}
              {dual && ac && (
                <>
                  <rect x={acCx - barWidth / 2} y={ac.y} width={barWidth} height={ac.h} rx={3} ry={3}
                    fill={SAGE} opacity={(activ?.value ?? 0) === 0 ? 0.15 : isHover ? 1 : 0.8} pointerEvents="none"
                    style={{ transition: transBase(i) }}
                  />
                  <rect x={acCx - barWidth / 2} y={ac.y + Math.max(ac.h - 3, 0)} width={barWidth} height={Math.min(3, ac.h)}
                    fill={SAGE} opacity={(activ?.value ?? 0) === 0 ? 0.15 : isHover ? 1 : 0.8} pointerEvents="none"
                    style={{ transition: transBase(i) }}
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
