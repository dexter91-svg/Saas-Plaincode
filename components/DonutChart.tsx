"use client";

import { useEffect, useState } from "react";

export type DonutSegment = { label: string; value: number; color: string };

const SEAM_OVERLAP = 1.2; // small forward bleed on every arc so antialiasing never reveals the track underneath at a seam

/** Two-color donut: composition of a whole (Free vs Paid), not a time trend -
 * deliberately a different shape from the bar chart next to it. */
export default function DonutChart({
  segments,
  size = 148,
  strokeWidth = 22,
  centerLabel,
  animationKey,
}: {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: { value: string; caption: string };
  animationKey?: string;
}) {
  const [grown, setGrown] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // The pop-in (fade + scale) plays once, on mount, and never resets - a later filter
  // switch leaves the ring fully drawn and visible throughout; only the dasharray/offset
  // below transition, so the ring redistributes instead of vanishing and reappearing.
  // (Deliberately not keyed to `animationKey` or guarded by a ref: either one can get
  // out of sync with React 18 Strict Mode's mount->cleanup->remount dance in dev and
  // leave `grown` stuck false forever, permanently hiding the chart.)
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 20);
    return () => clearTimeout(t);
  }, []);

  // Extra canvas headroom beyond the resting-state circle, so the hover-thickened
  // stroke (+5px, so +2.5px per side) never gets clipped by the SVG's own viewport edge.
  const margin = 8;
  const viewSize = size + margin * 2;

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  let cursor = 0;
  const arcs = segments.map((s) => {
    const pct = total > 0 ? s.value / total : 0;
    const len = pct * circumference;
    const offset = -cursor;
    cursor += len;
    return { ...s, len, offset };
  });

  const hovered = hoverIndex !== null ? segments[hoverIndex] : null;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg
        width={viewSize}
        height={viewSize}
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        style={{
          position: "absolute",
          left: -margin,
          top: -margin,
          opacity: grown ? 1 : 0,
          transform: `rotate(-90deg) scale(${grown ? 1 : 0.85})`,
          transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <circle cx={viewSize / 2} cy={viewSize / 2} r={r} fill="none" stroke="rgba(43,34,28,.06)" strokeWidth={strokeWidth} />
        {arcs.map((a, i) => {
          const isHover = hoverIndex === i;
          const isDimmed = hoverIndex !== null && !isHover;
          // Every dash bleeds slightly forward past its true end - the next segment
          // (painted after it, on top) always covers the overlap, so the seam is wherever
          // the later segment starts, never a hairline of bare track showing through.
          const dashLen = Math.min(circumference, a.len + SEAM_OVERLAP);
          return (
            <circle
              key={i}
              cx={viewSize / 2}
              cy={viewSize / 2}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={isHover ? strokeWidth + 5 : strokeWidth}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={a.offset}
              opacity={isDimmed ? 0.45 : 1}
              pointerEvents="stroke"
              onPointerEnter={() => setHoverIndex(i)}
              onPointerLeave={() => setHoverIndex((cur) => (cur === i ? null : cur))}
              style={{
                transition:
                  "stroke-width 0.2s cubic-bezier(.16,1,.3,1), opacity 0.2s ease, " +
                  "stroke-dasharray 0.6s cubic-bezier(.16,1,.3,1), stroke-dashoffset 0.6s cubic-bezier(.16,1,.3,1)",
                cursor: "pointer",
              }}
            />
          );
        })}
      </svg>
      {(hovered || centerLabel) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-150">
          {hovered ? (
            <>
              <span className="font-display text-2xl text-ink">{hovered.value}</span>
              <span className="font-manrope text-[10px] text-warm-muted">{hovered.label}</span>
            </>
          ) : (
            centerLabel && (
              <>
                <span className="font-display text-2xl text-ink">{centerLabel.value}</span>
                <span className="font-manrope text-[10px] text-warm-muted">{centerLabel.caption}</span>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
