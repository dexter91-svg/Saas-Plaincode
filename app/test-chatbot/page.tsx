"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import ChatPanel from "@/components/ChatPanel";
import { useBot } from "@/components/BotContext";

export default function TestChatbotPage() {
  const { scrapedData } = useBot();

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Test chatbot</h1>
          <p className="mt-2 text-slate-400">
            Chat with your assistant in real time.
          </p>
        </div>

        {scrapedData ? (
          <Card className="text-xs text-slate-400">
            <p>
              Using content from:{" "}
              <span className="text-slate-200">{scrapedData.url}</span>
            </p>
            <p className="mt-1 line-clamp-2">
              {scrapedData.description || scrapedData.title}
            </p>
          </Card>
        ) : (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <p className="text-sm text-amber-200">
              <strong>Your website hasn’t been connected yet.</strong> The chatbot only has generic answers until a URL is analyzed successfully. If you already tried but got a rate-limit or “access denied” error, the scrape didn’t complete.
            </p>
            <p className="mt-2 text-xs text-amber-200/80">
              Go to Connect your store, enter a URL, and click &quot;Analyze Website&quot;. If it fails, try again in a few minutes or use a different store URL.
            </p>
            <Link href="/create-bot" className="mt-4 inline-block">
              <Button variant="primary">Connect your store</Button>
            </Link>
          </Card>
        )}

        <ChatPanel />
      </div>
    </AppShell>
  );
}

