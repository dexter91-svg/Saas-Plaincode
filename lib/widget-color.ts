/** Default matches Plainbot / Tailwind primary orange. */
export const DEFAULT_WIDGET_ACCENT = "#f97316";

/**
 * Validates and normalizes a hex colour to #rrggbb.
 * Returns null if invalid (caller may fall back to default).
 */
export function normalizeWidgetAccentColor(input: unknown): string | null {
  if (input == null || typeof input !== "string") return null;
  let s = input.trim();
  if (!s) return null;
  if (!s.startsWith("#")) s = `#${s}`;
  const hex = s.slice(1);
  if (!/^[0-9a-fA-F]{3}$/.test(hex) && !/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  return `#${full.toLowerCase()}`;
}

export function resolvedWidgetAccentColor(stored: string | null | undefined): string {
  return normalizeWidgetAccentColor(stored) ?? DEFAULT_WIDGET_ACCENT;
}

/** sRGB relative luminance (WCAG), 0–1. */
function relativeLuminanceFromNormalizedHex(hex: string): number | null {
  const n = normalizeWidgetAccentColor(hex);
  if (!n) return null;
  const h = n.slice(1);
  const r8 = parseInt(h.slice(0, 2), 16);
  const g8 = parseInt(h.slice(2, 4), 16);
  const b8 = parseInt(h.slice(4, 6), 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const R = lin(r8);
  const G = lin(g8);
  const B = lin(b8);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Text colour that stays readable on top of `bgHex` (e.g. widget accent as background).
 * Uses WCAG luminance with a threshold so light accents get dark text and dark accents get white.
 */
export function contrastingForegroundForHex(bgHex: string): string {
  const L = relativeLuminanceFromNormalizedHex(bgHex);
  if (L == null) return "#ffffff";
  return L > 0.55 ? "#0f172a" : "#ffffff";
}
