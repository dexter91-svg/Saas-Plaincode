"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import StepIndicator from "@/components/StepIndicator";
import { useBot } from "@/components/BotContext";

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
      <AppShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-slate-400">Loading...</p>
        </div>
      </AppShell>
    );
  }

  const isShopify = storeType === "shopify";

  if (atStoreLimit) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="border-amber-500/30 bg-amber-500/10 p-6">
            <h2 className="text-lg font-semibold text-amber-200">Store limit reached</h2>
            <p className="mt-2 text-slate-300">
              Your plan allows a limited number of connected stores. Upgrade to add another, or select a store from the
              dropdown in the top bar to open its dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard">
                <Button variant="primary">Go to dashboard</Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline">View pricing</Button>
              </Link>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <StepIndicator currentStep={1} />

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">
            Step 1: Connect your store
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">
            Connect your store
          </h1>
          <p className="mt-2 text-slate-400">
            Enter your website URL. Our AI will learn your products and brand.
          </p>
        </div>

        <Card className="mt-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Website URL
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  ref={urlInputRef}
                  type="url"
                  placeholder="https://yourstore.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                  inputMode="url"
                  autoCapitalize="off"
                  autoCorrect="off"
                  enterKeyHint="go"
                  spellCheck={false}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  variant="primary"
                  className="w-full shrink-0 sm:w-auto"
                >
                  {loading ? "Analyzing…" : "Analyze Website"}
                </Button>
              </div>
            </div>
            {error && (
              <div className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-3">
                <p className="text-sm text-red-400">{error}</p>
                {errorCode === "RATE_LIMIT" && (
                  <p className="mt-2 text-xs text-red-300/90">
                    Waiting 1–2 minutes then retrying often helps.
                  </p>
                )}
                {errorCode === "ACCESS_DENIED" && (
                  <p className="mt-2 text-xs text-red-300/90">
                    Use another store URL; this one blocks automated access.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-800 text-red-300 hover:bg-red-900/40"
                    onClick={() => handleSubmit({ preventDefault: () => {} } as FormEvent)}
                  >
                    Try again
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => continueWithoutCrawl(url)}
                    disabled={loading}
                  >
                    Continue without crawl
                  </Button>
                  {errorCode === "ACCESS_DENIED" && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-300 hover:bg-red-900/40"
                      onClick={() => {
                        setError(null);
                        setErrorCode(null);
                        urlInputRef.current?.focus();
                        urlInputRef.current?.select();
                      }}
                    >
                      Try a different URL
                    </Button>
                  )}
                </div>
              </div>
            )}
          </form>
        </Card>

        {loading && (
          <Card className="mt-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/20 text-primary-400">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Analysing your store</h3>
                  <p className="text-xs text-slate-500">This usually takes 10–30 seconds</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{progressPercent}%</span>
                <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-mono text-slate-400">
                  {elapsedSeconds}s
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-700 ease-out"
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
                    <li key={key} className="rounded-lg border border-primary-500/25 bg-primary-500/8 px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-primary-400 animate-pulse" />
                        <span className="text-sm font-semibold text-primary-300">{label}</span>
                      </div>
                      <p className="mt-1.5 pl-4.5 text-xs leading-relaxed text-slate-400">{detail}</p>
                    </li>
                  );
                }

                if (isDone) {
                  return (
                    <li key={key} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/5 px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <svg className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-slate-300">{label}</span>
                      </div>
                      <span className="shrink-0 text-xs text-emerald-600">{done}</span>
                    </li>
                  );
                }

                return (
                  <li key={key} className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 ${isPending ? "opacity-40" : ""}`}>
                    <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-slate-600" />
                    <span className="text-sm text-slate-500">{label}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        {scrapedData && !loading && (
          <Card className="mt-6">
            <p className="text-slate-400">
              Store already connected:{" "}
              <span className="font-medium text-slate-200">{scrapedData.url}</span>
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {scrapedData.products?.length ?? 0} products detected. After you finish setup, this
              content is saved with your chatbot on the server.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => router.push("/training-data")}>
                View website feeds
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setUrl("");
                  setError(null);
                  setErrorCode(null);
                  urlInputRef.current?.focus();
                }}
              >
                Analyze another URL
              </Button>
            </div>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Works with Shopify, WooCommerce, BigCommerce, Wix, and custom stores.
        </p>
      </div>
    </AppShell>
  );
}
