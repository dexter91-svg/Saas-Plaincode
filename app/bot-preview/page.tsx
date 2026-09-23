"use client";

import AppShell from "@/components/AppShell";
import { useBot } from "@/components/BotContext";
import { useRouter } from "next/navigation";
import { WIZARD_CARD_CLASS, WIZARD_PRIMARY_BUTTON_CLASS, WIZARD_OUTLINE_BUTTON_CLASS } from "@/lib/wizard-ui";

function buildDescription(url: string | undefined, personality: string | null) {
  const base = url ? `An AI assistant for ${url}` : "An AI assistant for your ecommerce store";
  switch (personality) {
    case "Friendly":
      return `${base} that answers in a warm, conversational tone and helps customers quickly find products, orders, and support.`;
    case "Professional":
      return `${base} that replies with crisp, accurate, and on-brand messaging suitable for serious ecommerce operations.`;
    case "Sales-focused":
      return `${base} that nudges customers toward purchases, suggests relevant products, and reduces cart abandonment.`;
    case "Premium Luxury":
      return `${base} that feels like a personal concierge, ideal for luxury brands with high-touch customer experiences.`;
    default:
      return `${base} that can answer questions about products, shipping, and policies using your website content.`;
  }
}

export default function BotPreviewPage() {
  const router = useRouter();
  const { scrapedData, personality } = useBot();

  const description = buildDescription(scrapedData?.url, personality);

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-56px)] bg-cream">
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <h1 className="font-display text-3xl text-ink">Preview your assistant</h1>
            <p className="mt-1.5 font-manrope text-sm text-warm-body">
              Step 3 of 5 — Confirm the setup, then add knowledge & memory, then get your snippet.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={`min-w-0 ${WIZARD_CARD_CLASS} space-y-3`}>
              <h2 className="font-manrope text-sm font-bold text-ink">
                Configuration summary
              </h2>
              <dl className="space-y-2 font-manrope text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-warm-muted">Website</dt>
                  <dd className="min-w-0 break-all text-right text-ink">
                    {scrapedData?.url || "Not connected"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-warm-muted">Personality</dt>
                  <dd className="text-right text-ink">
                    {personality ?? "Not selected"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-warm-muted">Plan</dt>
                  <dd className="text-right font-semibold text-terracotta">Starter (100 chats)</dd>
                </div>
              </dl>
            </div>

            <div className={`min-w-0 ${WIZARD_CARD_CLASS} space-y-3`}>
              <h2 className="font-manrope text-sm font-bold text-ink">
                Generated bot description
              </h2>
              <p className="break-words font-manrope text-sm text-warm-body">{description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/bot-personality")}
              className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-5 py-2.5 text-sm`}
            >
              Back to personality
            </button>
            <button
              type="button"
              onClick={() => router.push("/knowledge")}
              className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-sm`}
            >
              Continue to knowledge & memory
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

