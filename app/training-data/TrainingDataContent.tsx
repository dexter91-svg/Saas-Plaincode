"use client";

import { useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useBot } from "@/components/BotContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatAssistantMessageForDisplay } from "@/lib/format-assistant-message";

const SITEMAP_INITIAL = 4;
const PRODUCTS_INITIAL = 6;
const DEPLOY_MARKER = "deploy-marker-2026-05-03-vercel-pro";

function statusClass(status: string) {
  if (status === "Fully trained") return "bg-emerald-500/15 text-emerald-300";
  if (status === "Syncing") return "bg-orange-500/15 text-orange-300";
  return "bg-amber-500/15 text-amber-300";
}

const SITEMAP_ITEMS = [
  { label: "Home (root)", status: "Fully trained" },
  { label: "About us", status: "Fully trained" },
  { label: "FAQ and Support", status: "Syncing" },
  { label: "Policies / Privacy policy", status: "Fully trained" },
  { label: "Policies / Refund policy", status: "Outdated" },
  { label: "Contact", status: "Fully trained" },
];

export default function TrainingDataContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { scrapedData } = useBot();
  const [sitemapExpanded, setSitemapExpanded] = useState(false);
  const [productsExpanded, setProductsExpanded] = useState(false);
  const products =
    scrapedData?.products && scrapedData.products.length > 0
      ? scrapedData.products
      : null;
  const websiteFeed = scrapedData?.content || "";
  const websiteFeedFormatted = websiteFeed
    ? formatAssistantMessageForDisplay(websiteFeed)
    : "";
  const scrapeFailed = searchParams?.get("scrape") === "failed";
  const hasDocsOrCatalog = Boolean(products || (scrapedData?.content && scrapedData.content.trim().length > 0));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {(!hasDocsOrCatalog || scrapeFailed) && (
        <Card className="border-primary-500/40 bg-primary-500/10">
          <h2 className="text-sm font-semibold text-slate-100">Add PDFs for better answers</h2>
          <p className="mt-2 text-sm text-slate-300">
            If your site blocks crawling (or the content is incomplete), you can still finish setup. Upload PDFs/TXT with
            product lists, pricing, FAQs, shipping/returns, and policies so the assistant can answer accurately.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/knowledge">
              <Button variant="primary">Upload PDFs / documents</Button>
            </Link>
            <Button variant="outline" onClick={() => router.push("/training-data/manual-products")}>
              Add products manually
            </Button>
          </div>
          {scrapedData?.url && (
            <p className="mt-3 text-xs text-slate-400">
              Your assistant greeting will use: <span className="font-medium text-slate-200">{scrapedData.title || scrapedData.url}</span>
            </p>
          )}
        </Card>
      )}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Website feeds and sitemap
          </h1>
          <p className="mt-1 text-[11px] text-slate-500">
            Deploy marker: <span className="font-medium text-slate-300">{DEPLOY_MARKER}</span>
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Visual overview of pages crawled, product inventory, and an
            AI-generated feed of your website content. All stored locally in
            this demo (no external database yet).
          </p>
          {scrapedData?.url && (
            <p className="mt-1 text-xs text-slate-500">
              Latest crawl source:{" "}
              <span className="text-slate-200">{scrapedData.url}</span>
            </p>
          )}
        </div>
        <div className="text-right text-xs text-slate-400">
          <p>
            Data health:{" "}
            <span className="font-semibold text-emerald-400">
              {products ? "98.2%" : "Waiting for crawl"}
            </span>
          </p>
          <p className="mt-1">
            Last sync:{" "}
            <span className="text-slate-200">Just now (session)</span>
          </p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-900/80">
          <h2 className="text-sm font-semibold text-slate-100">
            Sitemap / knowledge map
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            High-level view of which key pages have been fully trained. Treat
            this as a lightweight sitemap of your most important
            customer-facing pages.
          </p>
          <div className="mt-5 space-y-3 text-xs">
            {(sitemapExpanded ? SITEMAP_ITEMS : SITEMAP_ITEMS.slice(0, SITEMAP_INITIAL)).map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2"
              >
                <span className="text-slate-200">{item.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(item.status)}`}
                >
                  {item.status}
                </span>
              </div>
            ))}
            {SITEMAP_ITEMS.length > SITEMAP_INITIAL && (
              <button
                type="button"
                onClick={() => setSitemapExpanded((e) => !e)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-xs font-medium text-primary-400 hover:bg-slate-800"
              >
                {sitemapExpanded ? "View less" : `View more (${SITEMAP_ITEMS.length - SITEMAP_INITIAL} more)`}
              </button>
            )}
          </div>
        </Card>

        <Card className="bg-slate-900/80">
          <h2 className="text-sm font-semibold text-slate-100">
            Product inventory
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Snapshot of catalog items detected from your latest crawl.
          </p>
            <div className="mt-4 space-y-3 text-xs">
              {products ? (
                <>
                  {(productsExpanded ? products : products.slice(0, PRODUCTS_INITIAL)).map((p, idx) => (
                    <div
                      key={p.name + idx.toString()}
                      className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2"
                    >
                      <div>
                        <p className="text-slate-200">{p.name}</p>
                        <p className="text-[11px] text-slate-500">
                          Imported from crawl - Item #{idx + 1}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        Active
                      </span>
                    </div>
                  ))}
                  {products.length > PRODUCTS_INITIAL && (
                    <button
                      type="button"
                      onClick={() => setProductsExpanded((e) => !e)}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-xs font-medium text-primary-400 hover:bg-slate-800"
                    >
                      {productsExpanded ? "View less" : `View more (${products.length - PRODUCTS_INITIAL} more)`}
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    No products detected yet. Connect a store URL from the Create Bot step or add
                    products manually.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs"
                    onClick={() => router.push("/training-data/manual-products")}
                  >
                    Add products with AI
                  </Button>
                </div>
              )}
            </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="bg-slate-900/80">
          <h2 className="text-sm font-semibold text-slate-100">
            Website feed
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Raw text feed extracted from your website (headings, paragraphs,
            lists, tables). This is what the AI uses as its base knowledge
            about your store.
          </p>
          {websiteFeed ? (
            <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300 whitespace-pre-wrap break-words">
              {(() => {
                if (websiteFeedFormatted.length <= 6000) return websiteFeedFormatted;
                const cut = websiteFeedFormatted.slice(0, 6000);
                const lastSpace = cut.lastIndexOf(" ");
                return lastSpace > 5500 ? cut.slice(0, lastSpace) : cut;
              })()}
              {websiteFeedFormatted.length > 6000 && (
                <span className="block pt-2 text-[11px] text-slate-500">
                  truncated for preview. Full content is still available to the
                  AI.
                </span>
              )}
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              Website content will appear here after a successful crawl.
            </p>
          )}
        </Card>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-xs text-slate-500">
          Products are detected in real time from your latest website crawl.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push("/create-bot")}
          >
            Back to URL input
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push("/bot-personality")}
            disabled={!scrapedData}
          >
            Continue to Personality
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
