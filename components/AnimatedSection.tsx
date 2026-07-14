"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

type Variant = "fade-up" | "fade-in" | "scale-in";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  delay?: number;
  threshold?: number;
}

const variantClasses: Record<Variant, string> = {
  "fade-up": "opacity-0 translate-y-6",
  "fade-in": "opacity-0",
  "scale-in": "opacity-0 scale-[0.98]",
};

const visibleClasses: Record<Variant, string> = {
  "fade-up": "opacity-100 translate-y-0",
  "fade-in": "opacity-100",
  "scale-in": "opacity-100 scale-100",
};

export default function AnimatedSection({
  children,
  className = "",
  variant = "fade-up",
  delay = 0,
  threshold = 0.15,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const t = setTimeout(() => setVisible(true), delay);
          return () => clearTimeout(t);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? visibleClasses[variant] : variantClasses[variant]
      } ${className}`}
    >
      {children}
    </div>
  );
}
