"use client";

import Link from "next/link";
import { useEffect } from "react";
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

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("demo") === "1") {
        setScrapedData(DEMO_STORE_DATA);
        window.history.replaceState({}, "", "/test-chatbot");
        return;
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && (e.key === "S" || e.key === "s")) {
          e.preventDefault();
          setScrapedData(DEMO_STORE_DATA);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [setScrapedData]);

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
            <div className={`${WIZARD_CARD_CLASS} !p-4 font-manrope text-xs text-warm-muted`}>
              <p>
                Using content from: <span className="font-semibold text-ink">{scrapedData.url}</span>
              </p>
              <p className="mt-1 line-clamp-2">
                {scrapedData.description || scrapedData.title}
              </p>
            </div>
          ) : (
            <div className={`${WIZARD_CARD_CLASS} border-amber-300 bg-amber-50`}>
              <p className="font-manrope text-sm text-amber-800">
                <strong>Your website hasn&apos;t been connected yet.</strong> The chatbot only has generic answers
                until a URL is analyzed successfully. If you already tried but got a rate-limit or &quot;access
                denied&quot; error, the scrape didn&apos;t complete.
              </p>
              <p className="mt-2 font-manrope text-xs text-amber-700">
                Go to Connect your store, enter a URL, and click &quot;Analyze Website&quot;. If it fails, try
                again in a few minutes or use a different store URL.
              </p>
              <Link href="/create-bot" className={`mt-4 inline-flex ${WIZARD_PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-sm`}>
                Connect your store
              </Link>
            </div>
          )}

          <ChatPanel />
        </div>
      </div>
    </AppShell>
  );
}

