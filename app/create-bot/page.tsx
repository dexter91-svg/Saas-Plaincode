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

const PROGRESS_STEPS: { key: ScanStep; label: string }[] = [
  { key: "fetching", label: "Fetching website..." },
  { key: "products", label: "Products found" },
  { key: "policies", label: "Extracting policies & help content..." },
];

export default function CreateBotPage() {
  const router = useRouter();
  const { setScrapedData, scrapedData, addActivity, setChatbotId, personality } = useBot();
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
      const botRes = await fetch("/api/chatbots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: trimmed,
          websiteTitle: payload.title,
          websiteDescription: payload.description,
          websiteContent: payload.content,
          products: payload.products,
          personality: personality || "Friendly",
        }),
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
    if (!loading) return;
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
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
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
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          ...(storeType && { storeType }),
        }),
      });

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
      setScrapedData(payload);
      addActivity({
        type: "system",
        title: "Website connected",
        detail: `AI updated with content from ${trimmed.replace(/^https?:\/\//, "").split("/")[0]}`,
      });
      const botRes = await fetch("/api/chatbots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: trimmed,
          websiteTitle: payload.title,
          websiteDescription: payload.description,
          websiteContent: payload.content,
          products: payload.products || [],
          personality: personality || "Friendly",
        }),
      });
      if (botRes.ok) {
        const botData = await botRes.json();
        if (botData.chatbot?.id) setChatbotId(botData.chatbot.id);
      }
      router.push("/training-data");
    } catch (err: unknown) {
      setScanStep("error");
      setError(err instanceof Error ? err.message : "Something went wrong while scraping the website.");
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

        {!isShopify && loading && (
          <Card className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/20 text-primary-400">
                <svg className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Scanning your content</h3>
                <p className="text-xs text-slate-400">Fetching products, policies, and FAQs...</p>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <ul className="space-y-2 text-sm text-slate-400">
              {PROGRESS_STEPS.map(({ key, label }) => (
                <li key={key} className="flex items-center gap-2">
                  {scanStep === key && !(key === "products" && scanStep === "done") ? (
                    <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-primary-400 animate-pulse" />
                  ) : (key === "fetching" && scanStep !== "idle") || (key === "products" && (scanStep === "products" || scanStep === "policies" || scanStep === "done")) || (key === "policies" && scanStep === "policies") || scanStep === "done" ? (
                    <span className="text-emerald-400">✔</span>
                  ) : null}
                  <span className={scanStep === key ? "text-slate-200" : ""}>{label}</span>
                </li>
              ))}
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
