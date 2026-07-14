"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import StepIndicator from "@/components/StepIndicator";
import { useBot, Personality } from "@/components/BotContext";
import { useRouter } from "next/navigation";
import { DEFAULT_WIDGET_ACCENT, normalizeWidgetAccentColor } from "@/lib/widget-color";

const PERSONALITIES: { id: Personality; title: string; description: string }[] = [
  {
    id: "Friendly",
    title: "Friendly",
    description: "Warm, casual tone that feels like chatting with a human.",
  },
  {
    id: "Professional",
    title: "Professional",
    description: "Clear, concise, and on-brand for serious ecommerce stores.",
  },
  {
    id: "Sales-focused",
    title: "Sales-focused",
    description: "Always nudging towards conversion, upsells, and cross-sells.",
  },
  {
    id: "Premium Luxury",
    title: "Premium Luxury",
    description: "High-end, concierge-style tone for luxury brands.",
  },
];

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "da", label: "Danish" },
  { code: "sv", label: "Swedish" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
];

export default function BotPersonalityPage() {
  const router = useRouter();
  const { scrapedData, personality, setPersonality, chatbotId } = useBot();
  const [guardRails, setGuardRails] = useState("");
  const [language, setLanguage] = useState("en");
  const [widgetAccentColor, setWidgetAccentColor] = useState(DEFAULT_WIDGET_ACCENT);
  const [widgetName, setWidgetName] = useState("");
  const [widgetLogoDataUrl, setWidgetLogoDataUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  useEffect(() => {
    const q = chatbotId ? `?storeId=${encodeURIComponent(chatbotId)}` : "";
    fetch(`/api/chatbots/me${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.chatbot?.personality) setPersonality(data.chatbot.personality);
        if (typeof data.chatbot?.guardRails === "string") setGuardRails(data.chatbot.guardRails);
        if (data.chatbot?.language) setLanguage(data.chatbot.language);
        if (typeof data.chatbot?.name === "string") setWidgetName(data.chatbot.name);
        if (typeof data.chatbot?.widgetLogoDataUrl === "string" && data.chatbot.widgetLogoDataUrl.trim()) {
          setWidgetLogoDataUrl(data.chatbot.widgetLogoDataUrl.trim());
        }
        const w = data.chatbot?.widgetAccentColor;
        if (typeof w === "string" && normalizeWidgetAccentColor(w)) {
          setWidgetAccentColor(normalizeWidgetAccentColor(w)!);
        }
      })
      .catch(() => {});
  }, [setPersonality, chatbotId]);

  const handleSelect = async (p: Personality) => {
    setPersonality(p);
    try {
      await fetch("/api/chatbots/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personality: p, ...(chatbotId ? { chatbotId } : {}) }),
      });
    } catch {
      // still update UI
    }
  };

  const handleLanguageChange = (code: string) => {
    setLanguage(code);
    fetch("/api/chatbots/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: code, ...(chatbotId ? { chatbotId } : {}) }),
    }).catch(() => {});
  };

  const handleContinue = async () => {
    const accent = normalizeWidgetAccentColor(widgetAccentColor) ?? DEFAULT_WIDGET_ACCENT;
    try {
      await fetch("/api/chatbots/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personality: personality || undefined,
          name: widgetName || undefined,
          guardRails,
          language,
          widgetAccentColor: accent,
          widgetLogoDataUrl: widgetLogoDataUrl ?? "",
          ...(chatbotId ? { chatbotId } : {}),
        }),
      });
    } catch {
      // continue anyway
    }
    router.push("/bot-preview");
  };

  const handleLogoChange = async (file: File | null) => {
    setLogoError(null);
    if (!file) {
      setWidgetLogoDataUrl(null);
      return;
    }
    const allowed = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]);
    if (!allowed.has(file.type)) {
      setLogoError("Please upload a PNG, JPEG, WebP, or SVG logo.");
      return;
    }
    // Hard cap ~220KB to match server validation.
    if (file.size > 220 * 1024) {
      setLogoError("Logo is too large. Please upload a file under 220KB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read_failed"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      setLogoError("Could not read the logo file. Try another image.");
      return;
    }
    setWidgetLogoDataUrl(dataUrl);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StepIndicator currentStep={3} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">
            Step 3: Train AI
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">
            Choose your bot personality
          </h1>
          <p className="mt-2 text-slate-400">
            Pick how your AI assistant should speak to customers.
          </p>
          {scrapedData && (
            <p className="mt-1 text-xs text-slate-500">
              Connected store:{" "}
              <span className="text-slate-300">{scrapedData.url}</span>
            </p>
          )}
        </div>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">Response language</h2>
          <p className="text-xs text-slate-400">
            The chatbot will always respond in this language.
          </p>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          {PERSONALITIES.map((p) => {
            const selected = personality === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id)}
                className="text-left"
              >
                <Card
                  className={`h-full transition-colors ${
                    selected ? "border-primary-500 bg-primary-500/10" : ""
                  }`}
                >
                  <h2 className="text-sm font-semibold text-slate-100">
                    {p.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">{p.description}</p>
                  {selected && (
                    <p className="mt-3 text-xs font-medium text-primary-400">
                      Selected
                    </p>
                  )}
                </Card>
              </button>
            );
          })}
        </div>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            AI guard rails (optional)
          </h2>
          <p className="text-xs text-slate-400">
            Rules for how the AI should behave. One per line. Saved for this chatbot.
          </p>
          <textarea
            value={guardRails}
            onChange={(e) => setGuardRails(e.target.value)}
            placeholder="e.g. Always be polite. Never share competitor prices. Keep answers under 3 sentences."
            className="w-full min-h-[100px] rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none"
            rows={4}
          />
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">Widget colour</h2>
          <p className="text-xs text-slate-400">
            Colour of the floating chat button and send button in your site snippet. Choose any colour. Paid plans
            remove &quot;Powered by Plainbot&quot; from the widget; your accent still applies on every plan.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-300">Widget header name</p>
              <input
                type="text"
                value={widgetName}
                onChange={(e) => setWidgetName(e.target.value)}
                placeholder={scrapedData?.title || "Your store name"}
                className="w-full rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                This is the title customers see in the chat widget header.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-300">Logo</p>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-slate-700"
                />
                {widgetLogoDataUrl ? (
                  <img
                    src={widgetLogoDataUrl}
                    alt="Widget logo preview"
                    className="h-10 w-10 rounded-md border border-slate-700 bg-slate-900 object-contain"
                  />
                ) : null}
              </div>
              {logoError ? <p className="text-xs text-red-400">{logoError}</p> : null}
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500">PNG/JPEG/WebP/SVG • under 220KB</p>
                {widgetLogoDataUrl ? (
                  <button
                    type="button"
                    onClick={() => setWidgetLogoDataUrl(null)}
                    className="text-[11px] font-medium text-slate-300 hover:text-slate-100"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={normalizeWidgetAccentColor(widgetAccentColor) ?? DEFAULT_WIDGET_ACCENT}
              onChange={(e) => setWidgetAccentColor(e.target.value)}
              className="h-11 w-16 cursor-pointer rounded border border-slate-600 bg-slate-900 p-1"
              aria-label="Widget accent colour"
            />
            <input
              type="text"
              value={widgetAccentColor}
              onChange={(e) => setWidgetAccentColor(e.target.value)}
              placeholder="#f97316"
              spellCheck={false}
              className="w-40 rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 font-mono text-sm text-slate-200 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none"
            />
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            You can change personality, guard raises, and widget colour later without re-scraping your website.
          </p>
          <Button
            variant="outline"
            onClick={handleContinue}
            disabled={!personality}
          >
            Continue to preview
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

