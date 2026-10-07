"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import ChatPanel from "@/components/ChatPanel";
import { useBot } from "@/components/BotContext";
import { WIZARD_CARD_CLASS, WIZARD_PRIMARY_BUTTON_CLASS } from "@/lib/wizard-ui";

const DEMO_STORE_DATA = {
  url: "https://demooutfitters.com",
  title: "Demo Outfitters",
  description: "Premium everyday apparel and sustainably crafted organic goods.",
  content:
    "Demo Outfitters specializes in ethical slow fashion using 100% organic cotton, zero-waste packaging, and lifetime stitching repair. We offer 30-day hassle-free returns and free shipping on orders over $50.",
  products: [
    { name: "Everyday Hoodie", price: "$68", url: "https://demooutfitters.com/products/everyday-hoodie" },
    { name: "Classic Tee", price: "$29", url: "https://demooutfitters.com/products/classic-tee" },
    { name: "Canvas Tote", price: "$45", url: "https://demooutfitters.com/products/canvas-tote" },
  ],
};

export default function TestChatbotPage() {
  const { scrapedData, setScrapedData } = useBot();

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-56px)] bg-cream">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <h1 className="font-display text-3xl text-ink">Test chatbot</h1>
            <p className="mt-1.5 font-manrope text-sm text-warm-body">
              Chat with your assistant in real time.
            </p>
          </div>

          {scrapedData ? (
            <div className={`${WIZARD_CARD_CLASS} !p-4 font-manrope text-xs text-warm-muted flex flex-wrap items-center justify-between gap-3`}>
              <div className="min-w-0">
                <p>
                  Using content from: <span className="font-semibold text-ink">{scrapedData.url}</span> ({scrapedData.products?.length || 0} products)
                </p>
                <p className="mt-1 line-clamp-2">
                  {scrapedData.description || scrapedData.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScrapedData(null)}
                className="shrink-0 rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5"
              >
                Clear store data
              </button>
            </div>
          ) : (
            <div className={`${WIZARD_CARD_CLASS} border-amber-300 bg-amber-50`}>
              <p className="font-manrope text-sm text-amber-800">
                <strong>Your website hasn&apos;t been connected yet.</strong> The chatbot only has generic answers
                until a store is loaded.
              </p>
              <p className="mt-2 font-manrope text-xs text-amber-700">
                Want to test real product queries, prices, and policies without crawling a site? Click below to instantly load a sample store.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setScrapedData(DEMO_STORE_DATA)}
                  className={`inline-flex ${WIZARD_PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-sm bg-amber-700 hover:bg-amber-800`}
                >
                  📦 Load Sample Store (Demo Outfitters)
                </button>
                <Link href="/create-bot" className={`inline-flex rounded-full border border-amber-400 bg-white px-5 py-2.5 font-manrope text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100/60`}>
                  Connect real store URL
                </Link>
              </div>
            </div>
          )}

          <ChatPanel />
        </div>
      </div>
    </AppShell>
  );
}

