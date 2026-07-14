/** Shared with FoundingOfferBlock, FAQ, and CTA — matches NEXT_PUBLIC_FOUNDING_OFFER_END. */

export function getFoundingOfferEndMs(): number {
  const raw = process.env.NEXT_PUBLIC_FOUNDING_OFFER_END;
  if (raw) {
    const t = Date.parse(raw);
    if (!Number.isNaN(t)) return t;
  }
  return Date.parse("2026-04-26T23:59:59.000Z");
}

/** en-US + UTC — stable for SSR and hydration when used in server components. */
export function formatFoundingOfferClosingDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(ms));
}
