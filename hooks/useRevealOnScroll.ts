"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref for a section and `visible`, which flips to true once (and stays true) the first time the section
 * scrolls into view. Visitors who prefer reduced motion, and browsers without IntersectionObserver, get `true` at once.
 */
export function useRevealOnScroll<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible] as const;
}
