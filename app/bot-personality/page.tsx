"use client";

import { useEffect, useState } from "react";
import StepIndicator from "@/components/StepIndicator";
import WizardHeader from "@/components/WizardHeader";
import { useBot, Personality } from "@/components/BotContext";
import { useRouter } from "next/navigation";
import { DEFAULT_WIDGET_ACCENT, normalizeWidgetAccentColor } from "@/lib/widget-color";
import { WIZARD_INPUT_CLASS, WIZARD_PRIMARY_BUTTON_CLASS, WIZARD_CARD_CLASS } from "@/lib/wizard-ui";

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
    router.push("/knowledge");
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
    <div className="min-h-screen bg-cream">
      <WizardHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <StepIndicator currentStep={3} />

        <div className="mt-8 text-center">
          <h1 className="font-display text-3xl text-ink sm:text-4xl">How should Plainbot sound?</h1>
          <p className="mt-2 font-manrope text-sm text-warm-body">Pick a tone. You can change this anytime in Settings.</p>
          {scrapedData && (
            <p className="mt-1 font-manrope text-xs text-warm-muted">
              Connected store: <span className="text-ink">{scrapedData.url}</span>
            </p>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {PERSONALITIES.map((p) => {
            const selected = personality === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id)}
                className={`w-full rounded-xl px-5 py-4 text-left transition-colors ${
                  selected
                    ? "bg-terracotta"
                    : "border border-terracotta/30 bg-white hover:border-terracotta/50"
                }`}
              >
                <p className={`font-manrope text-sm font-semibold ${selected ? "text-cream" : "text-terracotta"}`}>
                  {p.title}
                </p>
                <p className={`mt-0.5 font-manrope text-xs ${selected ? "text-cream/80" : "text-warm-muted"}`}>
                  {p.description}
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!personality}
          className={`${WIZARD_PRIMARY_BUTTON_CLASS} mt-6 w-full`}
        >
          Continue to Knowledge & memory
        </button>

        <div className="mt-12 space-y-6">
          <h2 className="font-display text-2xl text-ink">Fine-tune your assistant</h2>

          <div className={WIZARD_CARD_CLASS}>
            <h3 className="font-manrope text-sm font-semibold text-ink">Response language</h3>
            <p className="mt-1 font-manrope text-xs text-warm-muted">The chatbot will always respond in this language.</p>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className={`${WIZARD_INPUT_CLASS} mt-3 max-w-xs`}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className={WIZARD_CARD_CLASS}>
            <h3 className="font-manrope text-sm font-semibold text-ink">AI guard rails (optional)</h3>
            <p className="mt-1 font-manrope text-xs text-warm-muted">
              Rules for how the AI should behave. One per line. Saved for this chatbot.
            </p>
            <textarea
              value={guardRails}
              onChange={(e) => setGuardRails(e.target.value)}
              placeholder="e.g. Always be polite. Never share competitor prices. Keep answers under 3 sentences."
              className={`${WIZARD_INPUT_CLASS} mt-3 min-h-[100px]`}
              rows={4}
            />
          </div>

          <div className={WIZARD_CARD_CLASS}>
            <h3 className="font-manrope text-sm font-semibold text-ink">Widget colour</h3>
            <p className="mt-1 font-manrope text-xs text-warm-muted">
              Colour of the floating chat button and send button in your site snippet. Choose any colour. Paid plans
              remove &quot;Powered by Plainbot&quot; from the widget; your accent still applies on every plan.
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="font-manrope text-xs font-semibold text-ink">Widget header name</p>
                <input
                  type="text"
                  value={widgetName}
                  onChange={(e) => setWidgetName(e.target.value)}
                  placeholder={scrapedData?.title || "Your store name"}
                  className={WIZARD_INPUT_CLASS}
                />
                <p className="font-manrope text-[11px] text-warm-muted">
                  This is the title customers see in the chat widget header.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-manrope text-xs font-semibold text-ink">Logo</p>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                    className="block w-full font-manrope text-xs text-warm-body file:mr-3 file:rounded-md file:border-0 file:bg-ink/[.06] file:px-3 file:py-2 file:font-manrope file:text-xs file:font-semibold file:text-ink hover:file:bg-ink/[.1]"
                  />
                  {widgetLogoDataUrl ? (
                    <img
                      src={widgetLogoDataUrl}
                      alt="Widget logo preview"
                      className="h-10 w-10 rounded-md border border-ink/[.15] bg-white object-contain"
                    />
                  ) : null}
                </div>
                {logoError ? <p className="font-manrope text-xs text-red-600">{logoError}</p> : null}
                <div className="flex items-center justify-between">
                  <p className="font-manrope text-[11px] text-warm-muted">PNG/JPEG/WebP/SVG · under 220KB</p>
                  {widgetLogoDataUrl ? (
                    <button
                      type="button"
                      onClick={() => setWidgetLogoDataUrl(null)}
                      className="font-manrope text-[11px] font-semibold text-warm-body hover:text-ink"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={normalizeWidgetAccentColor(widgetAccentColor) ?? DEFAULT_WIDGET_ACCENT}
                onChange={(e) => setWidgetAccentColor(e.target.value)}
                className="h-11 w-16 cursor-pointer rounded border border-ink/[.15] bg-white p-1"
                aria-label="Widget accent colour"
              />
              <input
                type="text"
                value={widgetAccentColor}
                onChange={(e) => setWidgetAccentColor(e.target.value)}
                placeholder="#f97316"
                spellCheck={false}
                className={`${WIZARD_INPUT_CLASS} w-40 font-mono`}
              />
            </div>
          </div>

          <p className="font-manrope text-xs text-warm-muted">
            You can change personality, guard rails, and widget colour later without re-scraping your website.
          </p>
        </div>
      </div>
    </div>
  );
}
