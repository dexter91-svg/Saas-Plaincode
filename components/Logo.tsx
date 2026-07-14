"use client";

import Image from "next/image";

type LogoSize = "sm" | "md" | "lg";

const sizeMap: Record<LogoSize, { width: number; height: number }> = {
  sm: { width: 52, height: 44 },
  md: { width: 72, height: 54 },
  lg: { width: 112, height: 84 },
};

export default function Logo({ size = "md" }: { size?: LogoSize }) {
  const { width, height } = sizeMap[size];
  return (
    <span
      className="relative flex shrink-0 overflow-hidden rounded-lg bg-transparent"
      style={{ width, height }}
    >
      <Image
        src="/logo.png"
        alt="Plainbot"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
    </span>
  );
}
