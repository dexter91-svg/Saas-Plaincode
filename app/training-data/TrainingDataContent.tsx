"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import StepIndicator from "@/components/StepIndicator";
import { useBot } from "@/components/BotContext";
import { formatAssistantMessageForDisplay } from "@/lib/format-assistant-message";
import { WIZARD_PRIMARY_BUTTON_CLASS, WIZARD_OUTLINE_BUTTON_CLASS, WIZARD_CARD_CLASS } from "@/lib/wizard-ui";

const SITEMAP_INITIAL = 4;
const PRODUCTS_INITIAL = 6;

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
  const showSuccess = hasDocsOrCatalog && !scrapeFailed;

  const pages = [
    ...(scrapedData?.content?.includes("return") || scrapedData?.content?.includes("refund") ? [{ label: "Return / Refund policy" }] : []),
    ...(scrapedData?.content?.includes("shipping") ? [{ label: "Shipping policy" }] : []),
    ...(scrapedData?.content?.includes("faq") || scrapedData?.content?.includes("FAQ") ? [{ label: "FAQ / Help" }] : []),
    ...(scrapedData?.content?.includes("contact") ? [{ label: "Contact page" }] : []),
    ...(scrapedData?.content?.includes("about") ? [{ label: "About us" }] : []),
    { label: "Home (root)" },
  ];
  const hasPolicyPages = pages.length > 1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <StepIndicator currentStep={2} />

      {showSuccess ? (
        <>
          <div className="mt-8 text-center">
            <h1 className="font-display text-3xl text-ink sm:text-4xl">Great, we read your site</h1>
            <p className="mt-2 font-manrope text-sm text-warm-body">
              Here&apos;s what we found. You don&apos;t need to double-check any of this now.
            </p>
          </div>

          <div className={`mt-6 divide-y divide-ink/[.08] overflow-hidden ${WIZARD_CARD_CLASS} !p-0`}>
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage/10 text-sage">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="font-manrope text-sm font-semibold text-ink">{pages.length} pages found</p>
                <p className="font-manrope text-xs text-warm-muted">Sitemap located and read</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage/10 text-sage">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="font-manrope text-sm font-semibold text-ink">
                  {products?.length ?? 0} products extracted
                </p>
                <p className="font-manrope text-xs text-warm-muted">Names, prices, and descriptions</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage/10 text-sage">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="font-manrope text-sm font-semibold text-ink">
                  {hasPolicyPages ? "Policies & FAQs read" : "Homepage read"}
                </p>
                <p className="font-manrope text-xs text-warm-muted">Shipping, returns, and common questions</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/bot-personality")}
            className={`${WIZARD_PRIMARY_BUTTON_CLASS} mt-6 w-full`}
          >
            Continue to Train AI
          </button>
        </>
      ) : (
        <div className={`mt-8 ${WIZARD_CARD_CLASS} border-amber-200 bg-amber-50`}>
          <h2 className="font-manrope text-sm font-semibold text-amber-800">Add PDFs for better answers</h2>
          <p className="mt-2 font-manrope text-sm text-amber-700">
            If your site blocks crawling (or the content is incomplete), you can still finish setup. Upload PDFs/TXT
            with product lists, pricing, FAQs, shipping/returns, and policies so the assistant can answer accurately.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/knowledge" className={WIZARD_PRIMARY_BUTTON_CLASS}>
              Upload PDFs / documents
            </Link>
            <button
              type="button"
              className={WIZARD_OUTLINE_BUTTON_CLASS}
              onClick={() => router.push("/training-data/manual-products")}
            >
              Add products manually
            </button>
          </div>
          {scrapedData?.url && (
            <p className="mt-3 font-manrope text-xs text-amber-700/80">
              Your assistant greeting will use:{" "}
              <span className="font-semibold text-amber-800">{scrapedData.title || scrapedData.url}</span>
            </p>
          )}
        </div>
      )}

      <div className="mt-10">
        <h2 className="font-display text-xl text-ink">Website feeds and sitemap</h2>
        <p className="mt-1.5 font-manrope text-xs text-warm-body">
          Overview of your store&apos;s crawled content, product inventory, and the text feed your AI assistant uses
          to answer customer questions.
        </p>
        {scrapedData?.url && (
          <p className="mt-1 font-manrope text-xs text-warm-muted">
            Store URL: <span className="text-ink">{scrapedData.url}</span>
          </p>
        )}

        <section className="mt-4 grid items-start gap-4 lg:grid-cols-2">
          <div className={`${WIZARD_CARD_CLASS} !p-4`}>
            <h3 className="font-manrope text-sm font-semibold text-ink">Sitemap / knowledge map</h3>
            <p className="mt-1 font-manrope text-xs text-warm-muted">
              Pages discovered and read during the crawl. This is what your AI assistant has been trained on.
            </p>
            <div className="mt-3">
              {hasDocsOrCatalog ? (
                (() => {
                  const visible = sitemapExpanded ? pages : pages.slice(0, SITEMAP_INITIAL);
                  return (
                    <div className="space-y-1.5 font-manrope text-xs">
                      {visible.map((item) => (
                        <div key={item.label} className="flex items-center justify-between rounded-lg bg-cream px-3 py-1.5">
                          <span className="text-ink">{item.label}</span>
                          <span className="rounded-full bg-sage/10 px-2 py-0.5 text-[10px] font-semibold text-sage">
                            Trained
                          </span>
                        </div>
                      ))}
                      {pages.length > SITEMAP_INITIAL && (
                        <button
                          type="button"
                          onClick={() => setSitemapExpanded((e) => !e)}
                          className="mt-1 w-full rounded-lg border border-ink/[.12] bg-white px-3 py-1.5 text-xs font-semibold text-terracotta transition-colors hover:bg-ink/[.03]"
                        >
                          {sitemapExpanded ? "View less" : `View more (${pages.length - SITEMAP_INITIAL} more)`}
                        </button>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="rounded-lg border border-ink/[.08] bg-cream px-4 py-5 text-center">
                  <p className="font-manrope text-xs text-warm-body">No pages crawled yet.</p>
                  <p className="mt-1 font-manrope text-xs text-warm-muted">
                    {scrapeFailed
                      ? "The crawl was skipped or blocked. Upload PDFs above to train your assistant instead."
                      : "Analyse a store URL from the previous step to populate this."}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className={`${WIZARD_CARD_CLASS} !p-4`}>
            <h3 className="font-manrope text-sm font-semibold text-ink">Product inventory</h3>
            <p className="mt-1 font-manrope text-xs text-warm-muted">
              Snapshot of catalog items detected from your latest crawl.
            </p>
            <div className="mt-3 space-y-1.5 font-manrope text-xs">
              {products ? (
                <>
                  {(productsExpanded ? products : products.slice(0, PRODUCTS_INITIAL)).map((p, idx) => (
                    <div
                      key={p.name + idx.toString()}
                      className="flex items-center justify-between rounded-lg bg-cream px-3 py-1.5"
                    >
                      <div>
                        <p className="text-ink">{p.name}</p>
                        <p className="text-[11px] text-warm-muted">Imported from crawl · Item #{idx + 1}</p>
                      </div>
                      <span className="rounded-full bg-sage/10 px-2 py-0.5 text-[10px] font-semibold text-sage">
                        Active
                      </span>
                    </div>
                  ))}
                  {products.length > PRODUCTS_INITIAL && (
                    <button
                      type="button"
                      onClick={() => setProductsExpanded((e) => !e)}
                      className="mt-1 w-full rounded-lg border border-ink/[.12] bg-white px-3 py-1.5 text-xs font-semibold text-terracotta transition-colors hover:bg-ink/[.03]"
                    >
                      {productsExpanded ? "View less" : `View more (${products.length - PRODUCTS_INITIAL} more)`}
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-warm-muted">
                    No products detected yet. Connect a store URL from the Create Bot step or add products manually.
                  </p>
                  <button
                    type="button"
                    className={`${WIZARD_OUTLINE_BUTTON_CLASS} text-xs`}
                    onClick={() => router.push("/training-data/manual-products")}
                  >
                    Add products with AI
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className={`${WIZARD_CARD_CLASS} !p-4`}>
            <h3 className="font-manrope text-sm font-semibold text-ink">Website feed</h3>
            <p className="mt-1 font-manrope text-xs text-warm-muted">
              Raw text feed extracted from your website (headings, paragraphs, lists, tables). This is what the AI
              uses as its base knowledge about your store.
            </p>
            {websiteFeed ? (
              <div className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-ink/[.08] bg-cream p-3 font-manrope text-xs text-warm-body">
                {(() => {
                  if (websiteFeedFormatted.length <= 6000) return websiteFeedFormatted;
                  const cut = websiteFeedFormatted.slice(0, 6000);
                  const lastSpace = cut.lastIndexOf(" ");
                  return lastSpace > 5500 ? cut.slice(0, lastSpace) : cut;
                })()}
                {websiteFeedFormatted.length > 6000 && (
                  <span className="block pt-2 text-[11px] text-warm-muted">
                    truncated for preview. Full content is still available to the AI.
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-3 font-manrope text-xs text-warm-muted">
                Website content will appear here after a successful crawl.
              </p>
            )}
          </div>
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="font-manrope text-xs text-warm-muted">
            {hasDocsOrCatalog
              ? "Products and content are sourced from your latest website crawl."
              : "No crawl data yet — upload PDFs or add products manually to train your assistant."}
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={WIZARD_OUTLINE_BUTTON_CLASS} onClick={() => router.push("/create-bot")}>
              Back to URL input
            </button>
            {!showSuccess && (
              <button
                type="button"
                className={WIZARD_PRIMARY_BUTTON_CLASS}
                onClick={() => router.push("/bot-personality")}
                disabled={!scrapedData}
              >
                Continue to Personality
              </button>
            )}
            <button type="button" className={WIZARD_OUTLINE_BUTTON_CLASS} onClick={() => router.push("/dashboard")}>
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
