"use client";

import { useEffect, useId, useRef, useState } from "react";

export type TrendPoint = { label: string; value: number; tooltipLabel: string };

// A separate file from SignupsTrendChart (not a shared/parameterized component) so
// work here can never regress that chart. Smooth line + gradient area, rather than
// bars - churn volume is low/sparse enough that bars read as near-empty; a curve still
// reads as "a dashboard chart" even with few events. Rust-red: churn is a "something
// went wrong" metric, a different color story from signups' growth-positive terracotta.
const CHURN_COLOR = "#BE5B37";
const H = 190;
const PAD_LEFT = 28;
const PAD_RIGHT = 8;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

// Lower than the textbook Catmull-Rom tangent (1/6) - a shorter tangent hugs the curve
// closer to each data point instead of overshooting into a rounded hump, so a local
// peak/valley reads as more of a point than a bump.
const TENSION = 1 / 14;

/** Catmull-Rom -> cubic Bezier smoothing, so the line reads as a curve, not a zigzag. */
function smoothPath(xs: number[], ys: number[]): string {
  const n = xs.length;
  if (n === 0) return "";
  if (n === 1) return `M ${xs[0]} ${ys[0]}`;
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const p0x = xs[Math.max(0, i - 1)];
    const p0y = ys[Math.max(0, i - 1)];
    const p1x = xs[i];
    const p1y = ys[i];
    const p2x = xs[i + 1];
    const p2y = ys[i + 1];
    const p3x = xs[Math.min(n - 1, i + 2)];
    const p3y = ys[Math.min(n - 1, i + 2)];
    const c1x = p1x + (p2x - p0x) * TENSION;
    const c1y = p1y + (p2y - p0y) * TENSION;
    const c2x = p2x - (p3x - p1x) * TENSION;
    const c2y = p2y - (p3y - p1y) * TENSION;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2x} ${p2y}`;
  }
  return d;
}

export default function ChurnTrendChart({
  data,
  labelEvery = 1,
  animationKey,
}: {
  data: TrendPoint[];
  labelEvery?: number;
  animationKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [W, setW] = useState(600);
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const lineKeyframes = `churnLine_${rawId}`;
  const areaKeyframes = `churnArea_${rawId}`;

  // Measure the container's real pixel width so viewBox units map 1:1 to CSS pixels -
  // a mismatch forces the browser to scale x and y differently, visibly distorting
  // the curve (the exact bug the signups chart hit earlier).
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

  const n = data.length;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const plotWidth = W - PAD_LEFT - PAD_RIGHT;
  const plotHeight = H - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) => PAD_LEFT + (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  const yFor = (v: number) => PAD_TOP + plotHeight - (v / max) * plotHeight;

  const xs = data.map((_, i) => xFor(i));
  const ys = data.map((d) => yFor(d.value));
  const linePath = smoothPath(xs, ys);
  const areaPath = n > 0 ? `${linePath} L ${xs[n - 1]} ${PAD_TOP + plotHeight} L ${xs[0]} ${PAD_TOP + plotHeight} Z` : "";

  const yTicks = [0, 0.5, 1].map((t) => Math.round(max * t));

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (n === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const dist = Math.abs(xFor(i) - relX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    setHoverIndex(closest);
  };

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoverX = hoverIndex !== null ? xFor(hoverIndex) : 0;
  const hoverY = hoverIndex !== null ? yFor(data[hoverIndex].value) : 0;
  const tooltipLeftPct = n > 1 ? Math.min(92, Math.max(8, (hoverX / W) * 100)) : 50;

  return (
    <div ref={containerRef} className="relative">
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-ink px-3 py-1.5 shadow-soft-lg transition-[left] duration-150 ease-out"
          style={{ left: `${tooltipLeftPct}%`, top: `${(hoverY / H) * 100 - 16}%` }}
        >
          <div className="font-manrope text-sm font-bold text-white">{hovered.value}</div>
          <div className="font-manrope text-[11px] text-white/70">{hovered.tooltipLabel}</div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="churnAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHURN_COLOR} stopOpacity={0.5} />
            <stop offset="45%" stopColor={CHURN_COLOR} stopOpacity={0.22} />
            <stop offset="100%" stopColor={CHURN_COLOR} stopOpacity={0.02} />
          </linearGradient>
          <style>{`
            @keyframes ${lineKeyframes} { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
            @keyframes ${areaKeyframes} { from { opacity: 0; } to { opacity: 1; } }
          `}</style>
        </defs>

        {yTicks.map((tick, i) => {
          const y = yFor(tick);
          return (
            <g key={i}>
              <line x1={PAD_LEFT} y1={y} x2={W - PAD_RIGHT} y2={y} stroke="#2B221C" strokeOpacity={0.06} strokeWidth={1} />
              <text
                x={PAD_LEFT - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                fill="#8C7C6E"
                style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
              >
                {tick.toLocaleString()}
              </text>
            </g>
          );
        })}

        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text
              key={i}
              x={xFor(i)}
              y={H - 6}
              textAnchor="middle"
              fontSize={9}
              fill="#8C7C6E"
              style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
            >
              {d.label}
            </text>
          ) : null
        )}

        {areaPath && (
          <path
            key={`area-${animationKey}`}
            d={areaPath}
            fill="url(#churnAreaGradient)"
            style={{ opacity: 0, animation: `${areaKeyframes} 0.9s ease 0.9s forwards` }}
          />
        )}
        {linePath && (
          <path
            key={`line-${animationKey}`}
            d={linePath}
            fill="none"
            stroke={CHURN_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1,
              animation: `${lineKeyframes} 1.8s cubic-bezier(.16,1,.3,1) forwards`,
            }}
          />
        )}

        {hoverIndex !== null && (
          <>
            <line
              x1={hoverX}
              y1={PAD_TOP}
              x2={hoverX}
              y2={PAD_TOP + plotHeight}
              stroke="#2B221C"
              strokeOpacity={0.15}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle cx={hoverX} cy={hoverY} r={5} fill={CHURN_COLOR} stroke="#fff" strokeWidth={2} />
          </>
        )}

        {/* Wide, transparent hit area spanning the whole plot - pointer position maps to
            the nearest data point via handlePointerMove, not individual per-point targets. */}
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={Math.max(0, plotWidth)}
          height={Math.max(0, plotHeight)}
          fill="transparent"
          pointerEvents="all"
        />
      </svg>
    </div>
  );
}
