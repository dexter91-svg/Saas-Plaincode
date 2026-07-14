"use client";

import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import StepIndicator from "@/components/StepIndicator";
import { useBot } from "@/components/BotContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { shopifyThemeLiquidSnippet, widgetScriptTagHtml } from "@/lib/widget-snippet";

const STORE_INSTRUCTIONS: Record<string, { title: string; steps: string[] }> = {
  shopify: {
    title: "Shopify",
    steps: [
      "Online Store → Themes → … → Edit code → open theme.liquid.",
      "Paste the Shopify Liquid snippet (from step 1) just before </body> — not the plain HTML line, so Theme Check stays clean.",
      "Save. Preview your store; the chat button should appear bottom-right.",
    ],
  },
  woocommerce: {
    title: "WooCommerce",
    steps: [
      "Go to Appearance → Theme File Editor (or Theme → Edit).",
      "Open footer.php (or your main layout that has </body>).",
      "Paste the script just before the closing </body> tag, then Update File.",
    ],
  },
  custom: {
    title: "Custom / Other",
    steps: [
      "Open your site’s main layout or template (the one that wraps every page).",
      "Paste the script just before the closing </body> tag.",
      "Save and publish. The chat button will appear in the bottom-right on your site.",
    ],
  },
};

export default function IntegrationPage() {
  const router = useRouter();
  const { chatbotId, setChatbotId } = useBot();
  const [copiedKind, setCopiedKind] = useState<"embed" | "shopify" | null>(null);
  const [storeType, setStoreType] = useState<string>("custom");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (chatbotId) return;
    fetch("/api/chatbots/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.chatbot?.id) setChatbotId(data.chatbot.id);
      })
      .catch(() => {});
  }, [chatbotId, setChatbotId]);

  useEffect(() => {
    fetch("/api/users/store-type")
      .then((r) => r.json())
      .then((data) => {
        if (data.storeType && STORE_INSTRUCTIONS[data.storeType]) setStoreType(data.storeType);
      })
      .catch(() => {});
  }, []);

  const embedSnippet = widgetScriptTagHtml(origin, chatbotId);
  const shopifySnippet = shopifyThemeLiquidSnippet(origin, chatbotId);

  const handleCopy = async (kind: "embed" | "shopify") => {
    try {
      await navigator.clipboard.writeText(kind === "shopify" ? shopifySnippet : embedSnippet);
      setCopiedKind(kind);
      setTimeout(() => setCopiedKind(null), 2000);
    } catch {
      // ignore
    }
  };

  const instructions = STORE_INSTRUCTIONS[storeType] || STORE_INSTRUCTIONS.custom;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <StepIndicator currentStep={5} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Step 5: Install Widget</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">Integration</h1>
          <p className="mt-2 text-slate-400">
            Copy the snippet and add it to your store so the chat widget appears. Instructions depend on your platform.
          </p>
        </div>

        {!chatbotId ? (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <p className="text-sm text-amber-200">
              <strong>Create your chatbot first.</strong> Go to Connect your store, enter your website URL, and analyze. Then return here to get your snippet.
            </p>
            <Button variant="primary" className="mt-4" onClick={() => router.push("/create-bot")}>
              Connect your store
            </Button>
          </Card>
        ) : (
          <>
            <Card className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-100">1. Copy the snippet</h2>
              <p className="text-sm text-slate-400">
                The script uses <code className="rounded bg-slate-800 px-1 text-slate-200">async</code> so it is
                non-blocking. Use the HTML line for WooCommerce and custom sites; for{" "}
                <strong className="text-slate-300">Shopify</strong>, copy the Liquid block (Theme Check–friendly).
              </p>
              <div>
                <p className="text-xs font-medium text-slate-300">WooCommerce / custom (HTML)</p>
                <div className="mt-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-xs font-mono text-slate-100 break-all">
                  {embedSnippet}
                </div>
                <Button variant="secondary" className="mt-2" onClick={() => handleCopy("embed")}>
                  {copiedKind === "embed" ? "Copied!" : "Copy snippet"}
                </Button>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">Shopify — paste in theme.liquid before &lt;/body&gt;</p>
                <div className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-xs font-mono text-slate-100 break-all">
                  {shopifySnippet}
                </div>
                <Button variant="secondary" className="mt-2" onClick={() => handleCopy("shopify")}>
                  {copiedKind === "shopify" ? "Copied!" : "Copy Shopify snippet"}
                </Button>
              </div>
            </Card>

            <Card className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-100">2. Where to paste — {instructions.title}</h2>
              <ul className="list-decimal list-inside space-y-2 text-sm text-slate-400">
                {instructions.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
              <p className="text-xs text-slate-500">
                Paste the script once, just before the closing <code className="rounded bg-slate-800 px-1">&lt;/body&gt;</code>. The widget will appear on every page.
              </p>
            </Card>

            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-100">Test your chatbot</h2>
              <p className="text-sm text-slate-400">
                Open the chat panel and ask a question. The AI uses your store content. You can also forward conversations to your support email from the chat.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => router.push("/test-chatbot")}>
                  Test Chatbot
                </Button>
                <Button variant="outline" onClick={() => router.push("/demo-website")}>
                  Open sample website
                </Button>
                <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                  Dashboard
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
