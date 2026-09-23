"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StepIndicator from "@/components/StepIndicator";
import WizardHeader from "@/components/WizardHeader";
import { useBot } from "@/components/BotContext";

const INPUT_CLASS =
  "w-full rounded-[10px] border border-ink/[.15] bg-cream px-3.5 py-3 font-manrope text-sm text-ink placeholder:text-warm-muted/70 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20";
const PRIMARY_BUTTON_CLASS =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-terracotta px-5 py-3 font-manrope text-sm font-bold text-cream transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-terracotta-dark hover:shadow-[0_10px_20px_-10px_rgba(190,91,55,.6)] active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";
const OUTLINE_BUTTON_CLASS =
  "inline-flex shrink-0 items-center justify-center rounded-full border border-ink/[.15] bg-white px-5 py-2.5 font-manrope text-sm font-semibold text-ink transition-colors hover:bg-ink/[.05] disabled:pointer-events-none disabled:opacity-50";

type ErrorCode = "RATE_LIMIT" | "ACCESS_DENIED";

type ScanStep = "idle" | "fetching" | "products" | "policies" | "done" | "error";

const PROGRESS_STEPS: { key: ScanStep; label: string; detail: string; done: string }[] = [
  {
    key: "fetching",
    label: "Finding your sitemap",
    detail: "Probing common sitemap locations on your store to map all available pages...",
    done: "Sitemap located",
  },
  {
    key: "products",
    label: "Extracting product catalogue",
    detail: "Reading product names, prices, descriptions, and variants from your listings...",
    done: "Products extracted",
  },
  {
    key: "policies",
    label: "Reading policies & FAQs",
    detail: "Scanning return policy, shipping info, FAQ pages, and contact details...",
    done: "Policy pages scanned",
  },
];

export default function CreateBotPage() {
  const router = useRouter();
  const { setScrapedData, scrapedData, addActivity, setChatbotId, chatbotId, personality } = useBot();
  const [storeType, setStoreType] = useState<string | null>(null);
  const [storeTypeLoading, setStoreTypeLoading] = useState(true);
  const [atStoreLimit, setAtStoreLimit] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/users/store-type").then((r) => r.json()),
      fetch("/api/users/forward-email").then((r) => r.json()),
      fetch("/api/chatbots/me").then((r) => r.json()),
    ])
      .then(([storeData, emailData, botData]) => {
        const st = storeData.storeType || null;
        setStoreType(st);
        if (!st) {
          router.replace("/onboarding/store-type");
          return;
        }
        const hasBots =
          botData &&
          typeof botData === "object" &&
          Array.isArray((botData as { chatbots?: unknown }).chatbots) &&
          (botData as { chatbots: unknown[] }).chatbots.length > 0;
        if (!emailData.forwardEmail && !hasBots) {
          router.replace("/onboarding/forward-email");
        }
      })
      .catch(() => setStoreType("custom"))
      .finally(() => setStoreTypeLoading(false));
  }, [router]);

  useEffect(() => {
    if (storeTypeLoading) return;
    fetch("/api/chatbots/me")
      .then((r) => r.json())
      .then((d) => {
        const lim = d.storeLimit;
        const cnt = typeof d.storeCount === "number" ? d.storeCount : 0;
        setAtStoreLimit(lim !== null && lim !== undefined && cnt >= lim);
      })
      .catch(() => setAtStoreLimit(false));
  }, [storeTypeLoading]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [scanStep, setScanStep] = useState<ScanStep>("idle");
  const [progressPercent, setProgressPercent] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const siteLabelFromUrl = (raw: string): string => {
    const s = (raw || "").trim();
    if (!s) return "your store";
    try {
      const u = new URL(s.startsWith("http") ? s : `https://${s}`);
      return (u.hostname || "your store").replace(/^www\./i, "");
    } catch {
      return s.replace(/^https?:\/\//i, "").split("/")[0] || "your store";
    }
  };

  const continueWithoutCrawl = async (websiteUrl: string) => {
    const trimmed = websiteUrl.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const label = siteLabelFromUrl(trimmed);
      const payload = {
        url: trimmed,
        title: label,
        description: "",
        content: "",
        products: [] as { name: string; price?: string; url?: string }[],
      };
      // Populate client greeting/preview even if scrape failed.
      setScrapedData(payload);
      addActivity({
        type: "warning",
        title: "Website connected (limited access)",
        detail: `We couldn't crawl ${label} right now. Upload PDFs or add products to improve answers.`,
      });
      const botPayload = {
        websiteUrl: trimmed,
        websiteTitle: payload.title,
        websiteDescription: payload.description,
        websiteContent: payload.content,
        products: payload.products,
        personality: personality || "Friendly",
      };
      const botRes = chatbotId
        ? await fetch(`/api/chatbots/${chatbotId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(botPayload),
          })
        : await fetch("/api/chatbots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(botPayload),
          });
      if (botRes.ok) {
        const botData = await botRes.json();
        if (botData.chatbot?.id) setChatbotId(botData.chatbot.id);
      }
      router.push("/training-data?scrape=failed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create bot without crawl.");
    } finally {
      setLoading(false);
    }
  };

  // Simulate progress while request is in flight
  useEffect(() => {
    if (!loading) {
      setElapsedSeconds(0);
      return;
    }
    setElapsedSeconds(0);
    setScanStep("fetching");
    setProgressPercent(10);
    const t1 = setTimeout(() => {
      setScanStep("products");
      setProgressPercent(45);
    }, 600);
    const t2 = setTimeout(() => {
      setScanStep("policies");
      setProgressPercent(75);
    }, 1200);
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(timer);
    };
  }, [loading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a valid website URL.");
      return;
    }

    setLoading(true);
    setProgressPercent(10);
    const controller = new AbortController();
    const clientTimeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          ...(storeType && { storeType }),
        }),
        signal: controller.signal,
      });

      clearTimeout(clientTimeout);

      setProgressPercent(95);
      setScanStep("done");

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = body.error || "Failed to scrape website. Please try another URL.";
        if (body.code === "RATE_LIMIT" || body.code === "ACCESS_DENIED") {
          setErrorCode(body.code);
        }
        throw new Error(message);
      }

      const data = await res.json();
      setProgressPercent(100);
      const payload = {
        url: trimmed,
        title: data.title || "",
        description: data.description || "",
        content: data.content || "",
        products: Array.isArray(data.products) ? data.products : [],
      };

      const hasContent = payload.content.trim().length > 0 || payload.products.length > 0;
      if (!hasContent) {
        // Site returned HTTP 200 but no extractable content — almost certainly JS-rendered.
        setScanStep("error");
        setError(
          "We reached this site but couldn't extract any content — it appears to be JavaScript-rendered. " +
          "You can continue and upload a product list or PDF instead, or try a different URL."
        );
        setErrorCode("ACCESS_DENIED");
        setLoading(false);
        return;
      }

      setScrapedData(payload);
      addActivity({
        type: "system",
        title: "Website connected",
        detail: `AI updated with content from ${trimmed.replace(/^https?:\/\//, "").split("/")[0]}`,
      });
      const botPayload2 = {
        websiteUrl: trimmed,
        websiteTitle: payload.title,
        websiteDescription: payload.description,
        websiteContent: payload.content,
        products: payload.products || [],
        personality: personality || "Friendly",
      };
      const botRes = chatbotId
        ? await fetch(`/api/chatbots/${chatbotId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(botPayload2),
          })
        : await fetch("/api/chatbots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(botPayload2),
          });
      if (botRes.ok) {
        const botData = await botRes.json();
        if (botData.chatbot?.id) setChatbotId(botData.chatbot.id);
      }
      router.push("/training-data");
    } catch (err: unknown) {
      clearTimeout(clientTimeout);
      setScanStep("error");
      if (err instanceof Error && err.name === "AbortError") {
        setError("Website scan timed out after 30 seconds. You can click 'Continue without crawl' below to skip scanning and enter the app.");
        setErrorCode("ACCESS_DENIED");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong while scraping the website.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (storeTypeLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-cream">
        <WizardHeader />
        <div className="flex flex-1 items-center justify-center">
          <p className="font-manrope text-warm-muted">Loading...</p>
        </div>
      </div>
    );
  }

  const isShopify = storeType === "shopify";

  if (atStoreLimit) {
    return (
      <div className="min-h-screen bg-cream">
        <WizardHeader />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-manrope text-lg font-semibold text-amber-800">Store limit reached</h2>
            <p className="mt-2 font-manrope text-sm text-amber-700">
              Your plan allows a limited number of connected stores. Upgrade to add another, or select a store from
              the dropdown in the top bar to open its dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard" className={PRIMARY_BUTTON_CLASS}>
                Go to dashboard
              </Link>
              <Link href="/pricing" className={OUTLINE_BUTTON_CLASS}>
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <WizardHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <StepIndicator currentStep={1} />

        <div className="mt-8">
          <h1 className="font-display text-3xl text-ink sm:text-4xl">
            Connect your store
          </h1>
          <p className="mt-2 font-manrope text-sm text-warm-body">
            Enter your website URL. Our AI will learn your products and brand.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-ink/[.08] bg-white p-6 shadow-[0_4px_20px_-8px_rgba(43,34,28,.08)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block font-manrope text-sm font-semibold text-ink">
                Website URL
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  ref={urlInputRef}
                  type="url"
                  placeholder="https://yourstore.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={`${INPUT_CLASS} flex-1`}
                  inputMode="url"
                  autoCapitalize="off"
                  autoCorrect="off"
                  enterKeyHint="go"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
                >
                  {loading ? "Analyzing…" : "Analyze Website"}
                </button>
              </div>
            </div>
            {error && (
              <div className="animate-plnb-row-in rounded-lg border border-red-200 bg-red-50 px-3 py-3">
                <p className="font-manrope text-sm text-red-600">{error}</p>
                {errorCode === "RATE_LIMIT" && (
                  <p className="mt-2 font-manrope text-xs text-red-500">
                    Waiting 1–2 minutes then retrying often helps.
                  </p>
                )}
                {errorCode === "ACCESS_DENIED" && (
                  <p className="mt-2 font-manrope text-xs text-red-500">
                    Use another store URL; this one blocks automated access.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-red-300 px-4 py-2 font-manrope text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                    onClick={() => handleSubmit({ preventDefault: () => {} } as FormEvent)}
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    className={OUTLINE_BUTTON_CLASS}
                    onClick={() => continueWithoutCrawl(url)}
                    disabled={loading}
                  >
                    Continue without crawl
                  </button>
                  {errorCode === "ACCESS_DENIED" && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full px-4 py-2 font-manrope text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                      onClick={() => {
                        setError(null);
                        setErrorCode(null);
                        urlInputRef.current?.focus();
                        urlInputRef.current?.select();
                      }}
                    >
                      Try a different URL
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {loading && (
          <div className="animate-plnb-row-in mt-6 space-y-5 rounded-2xl border border-ink/[.08] bg-white p-6 shadow-[0_4px_20px_-8px_rgba(43,34,28,.08)]">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-manrope text-sm font-semibold text-ink">Analysing your store</h3>
                  <p className="font-manrope text-xs text-warm-muted">This usually takes 10–30 seconds</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-manrope text-xs text-warm-muted">{progressPercent}%</span>
                <span className="rounded-md bg-ink/[.05] px-2 py-1 font-mono text-xs text-warm-body">
                  {elapsedSeconds}s
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-terracotta/15">
              <div
                className="h-full rounded-full bg-terracotta transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Steps */}
            <ul className="space-y-2">
              {PROGRESS_STEPS.map(({ key, label, detail, done }) => {
                const isDone =
                  (key === "fetching" && scanStep !== "idle") ||
                  (key === "products" && (scanStep === "products" || scanStep === "policies" || scanStep === "done")) ||
                  (key === "policies" && scanStep === "policies") ||
                  scanStep === "done";
                const isActive = scanStep === key && scanStep !== "done";
                const isPending = !isDone && !isActive;

                if (isActive) {
                  return (
                    <li
                      key={key}
                      className="animate-plnb-row-in rounded-lg border border-terracotta/25 bg-terracotta/[.06] px-3.5 py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-terracotta" />
                        <span className="font-manrope text-sm font-semibold text-terracotta">{label}</span>
                      </div>
                      <p className="mt-1.5 pl-4.5 font-manrope text-xs leading-relaxed text-warm-body">{detail}</p>
                    </li>
                  );
                }

                if (isDone) {
                  return (
                    <li
                      key={key}
                      className="animate-plnb-row-in flex items-center justify-between gap-2 rounded-lg bg-sage/[.08] px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <svg
                          className="animate-plnb-step-pop h-4 w-4 shrink-0 text-sage"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-manrope text-sm text-ink">{label}</span>
                      </div>
                      <span className="shrink-0 font-manrope text-xs text-sage">{done}</span>
                    </li>
                  );
                }

                return (
                  <li
                    key={key}
                    className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 transition-opacity duration-300 ${isPending ? "opacity-40" : ""}`}
                  >
                    <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-ink/20" />
                    <span className="font-manrope text-sm text-warm-muted">{label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {scrapedData && !loading && (
          <div className="animate-plnb-row-in mt-6 rounded-2xl border border-ink/[.08] bg-white p-6 shadow-[0_4px_20px_-8px_rgba(43,34,28,.08)]">
            <p className="font-manrope text-sm text-warm-body">
              Store already connected:{" "}
              <span className="font-semibold text-ink">{scrapedData.url}</span>
            </p>
            <p className="mt-2 font-manrope text-sm text-warm-muted">
              {scrapedData.products?.length ?? 0} products detected. After you finish setup, this
              content is saved with your chatbot on the server.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => router.push("/training-data")}>
                View website feeds
              </button>
              <button
                type="button"
                className={OUTLINE_BUTTON_CLASS}
                onClick={() => {
                  setUrl("");
                  setError(null);
                  setErrorCode(null);
                  urlInputRef.current?.focus();
                }}
              >
                Analyze another URL
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-center font-manrope text-xs text-warm-muted">
          Works with Shopify, WooCommerce, BigCommerce, Wix, and custom stores.
        </p>
      </div>
    </div>
  );
}
