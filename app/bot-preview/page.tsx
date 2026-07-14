"use client";

import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useBot } from "@/components/BotContext";
import { useRouter } from "next/navigation";

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
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Preview your assistant</h1>
            <p className="mt-2 text-slate-400">
              Step 3 of 5 — Confirm the setup, then add knowledge & memory, then get your snippet.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="min-w-0 space-y-3">
              <h2 className="text-sm font-semibold text-slate-200">
                Configuration summary
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-slate-400">Website</dt>
                  <dd className="min-w-0 break-all text-right text-slate-100">
                    {scrapedData?.url || "Not connected"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400">Personality</dt>
                  <dd className="text-right text-slate-100">
                    {personality ?? "Not selected"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400">Plan</dt>
                  <dd className="text-right text-primary-400">Starter (100 chats)</dd>
                </div>
              </dl>
            </Card>

            <Card className="min-w-0 space-y-3">
              <h2 className="text-sm font-semibold text-slate-200">
                Generated bot description
              </h2>
              <p className="break-words text-sm text-slate-300">{description}</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push("/bot-personality")}
            >
              Back to personality
            </Button>
            <Button
              variant="primary"
              onClick={() => router.push("/knowledge")}
            >
              Continue to knowledge & memory
            </Button>
          </div>
      </div>
    </AppShell>
  );
}

