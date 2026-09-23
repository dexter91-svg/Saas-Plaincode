"use client";

import StepIndicator from "@/components/StepIndicator";
import WizardHeader from "@/components/WizardHeader";
import { useBot } from "@/components/BotContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { shopifyThemeLiquidSnippet, widgetScriptTagHtml } from "@/lib/widget-snippet";
import { WIZARD_PRIMARY_BUTTON_CLASS, WIZARD_OUTLINE_BUTTON_CLASS, WIZARD_CARD_CLASS } from "@/lib/wizard-ui";

const STORE_INSTRUCTIONS: Record<string, { title: string; steps: string[] }> = {
  shopify: {
    title: "Shopify",
    steps: [
      "Online Store → Themes → … → Edit code → open theme.liquid.",
      "Paste the Shopify Liquid snippet (above) just before </body> — not the plain HTML line, so Theme Check stays clean.",
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
      "Open your site's main layout or template (the one that wraps every page).",
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
    <div className="min-h-screen bg-cream">
      <WizardHeader />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <StepIndicator currentStep={5} />

        <div className="mt-8 text-center">
          <h1 className="font-display text-3xl text-ink sm:text-4xl">One last step: add this to your site</h1>
          <p className="mt-2 font-manrope text-sm text-warm-body">
            Copy this snippet and paste it before <code className="rounded bg-ink/[.06] px-1">&lt;/body&gt;</code> on
            your site. Or skip for now and do it later from your dashboard.
          </p>
        </div>

        {!chatbotId ? (
          <div className={`mt-6 ${WIZARD_CARD_CLASS} border-amber-200 bg-amber-50`}>
            <p className="font-manrope text-sm text-amber-800">
              <strong>Create your chatbot first.</strong> Go to Connect your store, enter your website URL, and
              analyze. Then return here to get your snippet.
            </p>
            <button
              type="button"
              className={`${WIZARD_PRIMARY_BUTTON_CLASS} mt-4`}
              onClick={() => router.push("/create-bot")}
            >
              Connect your store
            </button>
          </div>
        ) : (
          <>
            <div className={`mt-6 ${WIZARD_CARD_CLASS}`}>
              <p className="font-manrope text-xs font-semibold text-ink">WooCommerce / custom (HTML)</p>
              <div className="mt-1.5 overflow-x-auto rounded-lg border border-ink/[.1] bg-ink px-3 py-3 font-mono text-xs text-cream/90">
                {embedSnippet}
              </div>
              <button type="button" className={`${WIZARD_OUTLINE_BUTTON_CLASS} mt-2 text-xs`} onClick={() => handleCopy("embed")}>
                {copiedKind === "embed" ? "Copied!" : "Copy snippet"}
              </button>

              <p className="mt-5 font-manrope text-xs font-semibold text-ink">
                Shopify — paste in theme.liquid before &lt;/body&gt;
              </p>
              <div className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-ink/[.1] bg-ink px-3 py-3 font-mono text-xs text-cream/90">
                {shopifySnippet}
              </div>
              <button type="button" className={`${WIZARD_OUTLINE_BUTTON_CLASS} mt-2 text-xs`} onClick={() => handleCopy("shopify")}>
                {copiedKind === "shopify" ? "Copied!" : "Copy Shopify snippet"}
              </button>
            </div>

            <div className={`mt-4 ${WIZARD_CARD_CLASS}`}>
              <h2 className="font-manrope text-sm font-semibold text-ink">Where to paste — {instructions.title}</h2>
              <ol className="mt-2 list-inside list-decimal space-y-2 font-manrope text-sm text-warm-body">
                {instructions.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className={`${WIZARD_PRIMARY_BUTTON_CLASS} mt-6 w-full`}
            >
              Finish setup
            </button>
            <p className="mt-3 text-center font-manrope text-sm text-warm-muted">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="font-semibold text-terracotta hover:text-terracotta-dark"
              >
                I&apos;ll do this later, take me to the dashboard
              </button>
            </p>

            <div className={`mt-10 ${WIZARD_CARD_CLASS}`}>
              <h2 className="font-manrope text-sm font-semibold text-ink">Test your chatbot</h2>
              <p className="mt-1 font-manrope text-sm text-warm-body">
                Open the chat panel and ask a question. The AI uses your store content. You can also forward
                conversations to your support email from the chat.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" className={WIZARD_PRIMARY_BUTTON_CLASS} onClick={() => router.push("/test-chatbot")}>
                  Test Chatbot
                </button>
                <button type="button" className={WIZARD_OUTLINE_BUTTON_CLASS} onClick={() => router.push("/demo-website")}>
                  Open sample website
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
