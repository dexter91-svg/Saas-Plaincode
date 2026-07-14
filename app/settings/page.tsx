"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useBot } from "@/components/BotContext";
import { DEFAULT_WIDGET_ACCENT, normalizeWidgetAccentColor } from "@/lib/widget-color";
import UploadedDocsList from "@/components/UploadedDocsList";
import {
  conversationLimitForPlan,
  normalizePlanParam,
  storeLimitForPlan,
  UNLIMITED_CONVERSATIONS_DISPLAY,
} from "@/lib/plans";
import { playTestNotificationSound, unlockAgentNotificationAudio } from "@/lib/agent-notification-sounds";

const PERSONALITIES = ["Friendly", "Professional", "Sales-focused", "Premium Luxury"] as const;

const LANGUAGES = [
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

export default function SettingsPage() {
  const {
    userPlan,
    setUserPlan,
    chatbotId,
    setChatbotId,
    setConversationRemaining,
    setStoreLimit,
  } = useBot();

  const [forwardEmail, setForwardEmail] = useState("");
  const [forwardEmailSaving, setForwardEmailSaving] = useState(false);
  const [forwardEmailMessage, setForwardEmailMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [personality, setPersonality] = useState<string>("Friendly");
  const [personalitySaving, setPersonalitySaving] = useState(false);
  const [personalityMessage, setPersonalityMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [language, setLanguage] = useState("en");

  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfMessage, setPdfMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [docsRefresh, setDocsRefresh] = useState(0);

  const [widgetAccentColor, setWidgetAccentColor] = useState(DEFAULT_WIDGET_ACCENT);
  const [widgetColorSaving, setWidgetColorSaving] = useState(false);
  const [widgetColorMessage, setWidgetColorMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifySaving, setNotifySaving] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/users/notification-sounds")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.enabled === "boolean") setNotifyEnabled(data.enabled);
      })
      .catch(() => {});
  }, []);

  const saveNotificationSounds = async (next: boolean) => {
    setNotifySaving(true);
    setNotifyMessage(null);
    try {
      const res = await fetch("/api/users/notification-sounds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setNotifyEnabled(Boolean(data.enabled));
      setNotifyMessage({ type: "ok", text: "Notification settings saved." });
    } catch (e: unknown) {
      setNotifyMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to save",
      });
    } finally {
      setNotifySaving(false);
    }
  };

  useEffect(() => {
    fetch("/api/users/forward-email")
      .then((r) => r.json())
      .then((data) => {
        if (data.forwardEmail != null) setForwardEmail(data.forwardEmail || "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!chatbotId) {
      fetch("/api/chatbots/me")
        .then((r) => r.json())
        .then((data) => {
          if (data.chatbot?.id) setChatbotId(data.chatbot.id);
        })
        .catch(() => {});
    }
  }, [chatbotId, setChatbotId]);

  useEffect(() => {
    const q = chatbotId ? `?storeId=${encodeURIComponent(chatbotId)}` : "";
    fetch(`/api/chatbots/me${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.chatbot?.personality) setPersonality(data.chatbot.personality);
        if (data.chatbot?.language) setLanguage(data.chatbot.language);
        const w = data.chatbot?.widgetAccentColor;
        if (typeof w === "string" && normalizeWidgetAccentColor(w)) {
          setWidgetAccentColor(normalizeWidgetAccentColor(w)!);
        }
      })
      .catch(() => {});
  }, [chatbotId]);

  const handleSaveWidgetColor = () => {
    const n = normalizeWidgetAccentColor(widgetAccentColor);
    if (!n) {
      setWidgetColorMessage({ type: "error", text: "Use a valid hex colour (#RGB or #RRGGBB)." });
      return;
    }
    setWidgetAccentColor(n);
    setWidgetColorMessage(null);
    setWidgetColorSaving(true);
    fetch("/api/chatbots/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetAccentColor: n, ...(chatbotId ? { chatbotId } : {}) }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setWidgetColorMessage({ type: "error", text: data.error });
        } else {
          setWidgetColorMessage({ type: "ok", text: "Widget colour saved. Your embed snippet will use this colour." });
        }
      })
      .catch(() => setWidgetColorMessage({ type: "error", text: "Failed to save." }))
      .finally(() => setWidgetColorSaving(false));
  };

  const handleSaveForwardEmail = () => {
    setForwardEmailMessage(null);
    setForwardEmailSaving(true);
    fetch("/api/users/forward-email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forwardEmail: forwardEmail.trim() }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setForwardEmailMessage({ type: "error", text: data.error });
        } else {
          setForwardEmailMessage({ type: "ok", text: "Forward email saved." });
        }
      })
      .catch(() => setForwardEmailMessage({ type: "error", text: "Failed to save." }))
      .finally(() => setForwardEmailSaving(false));
  };

  const handleSavePersonality = (value: string) => {
    if (!PERSONALITIES.includes(value as (typeof PERSONALITIES)[number])) return;
    setPersonality(value);
    setPersonalityMessage(null);
    setPersonalitySaving(true);
    fetch("/api/chatbots/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personality: value, ...(chatbotId ? { chatbotId } : {}) }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setPersonalityMessage({ type: "error", text: data.error });
        } else {
          setPersonalityMessage({ type: "ok", text: "Personality saved." });
        }
      })
      .catch(() => setPersonalityMessage({ type: "error", text: "Failed to save." }))
      .finally(() => setPersonalitySaving(false));
  };

  const handlePdfUpload = () => {
    if (pdfFiles.length === 0) {
      setPdfMessage({ type: "error", text: "Choose one or more files first." });
      return;
    }
    setPdfMessage(null);
    setPdfUploading(true);
    const formData = new FormData();
    for (const f of pdfFiles) {
      formData.append("files", f);
    }
    if (chatbotId) formData.append("chatbotId", chatbotId);
    fetch("/api/knowledge/upload", { method: "POST", body: formData })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setPdfMessage({ type: "error", text: data.error });
        } else {
          setPdfMessage({
            type: "ok",
            text:
              data.message ||
              data.warning ||
              (pdfFiles.length === 1
                ? `${pdfFiles[0].name} uploaded.`
                : `${data.count ?? pdfFiles.length} file(s) uploaded.`),
          });
          setPdfFiles([]);
          setDocsRefresh((n) => n + 1);
        }
      })
      .catch(() => setPdfMessage({ type: "error", text: "Upload failed." }))
      .finally(() => setPdfUploading(false));
  };

  const handleUpgradeToPro = async () => {
    setCheckoutError(null);
    setCheckoutBusy(true);
    try {
      const res = await fetch("/api/stripe/upgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlan: "pro" }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.useCheckout) {
        const res2 = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: "pro",
            successPath: "/dashboard",
            cancelPath: "/settings",
          }),
        });
        const d2 = await res2.json().catch(() => ({}));
        if (!res2.ok || !d2.url) {
          setCheckoutError(typeof d2.error === "string" ? d2.error : "Could not start checkout.");
          setCheckoutBusy(false);
          return;
        }
        window.location.href = d2.url as string;
        return;
      }
      if (!res.ok || !data.ok) {
        setCheckoutError(typeof data.error === "string" ? data.error : "Upgrade failed.");
        setCheckoutBusy(false);
        return;
      }
      setUserPlan("pro");
      window.location.href = "/dashboard?upgrade=success";
    } catch {
      setCheckoutError("Something went wrong.");
      setCheckoutBusy(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;
    const t = setTimeout(async () => {
      await fetch("/api/auth/refresh-session", { method: "POST" });
      try {
        const [meRes, statsRes, botRes] = await Promise.all([
          fetch("/api/me"),
          fetch("/api/conversations/stats"),
          fetch(
            chatbotId
              ? `/api/chatbots/me?storeId=${encodeURIComponent(chatbotId)}`
              : "/api/chatbots/me"
          ),
        ]);
        if (meRes.ok) {
          const me = await meRes.json();
          if (
            me?.plan === "growth" ||
            me?.plan === "pro" ||
            me?.plan === "agency" ||
            me?.plan === "custom" ||
            me?.plan === "business"
          ) {
            setUserPlan(me.plan);
          }
        }
        if (statsRes.ok) {
          const s = await statsRes.json();
          if (s.unlimited) {
            setConversationRemaining(UNLIMITED_CONVERSATIONS_DISPLAY);
          } else if (typeof s.remaining === "number") {
            setConversationRemaining(Math.max(0, s.remaining));
          }
        }
        if (botRes.ok) {
          const bot = await botRes.json();
          if (bot && typeof bot.storeLimit === "number") {
            setStoreLimit(bot.storeLimit);
          }
        }
      } finally {
        window.history.replaceState({}, "", "/settings");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [chatbotId, setUserPlan, setConversationRemaining, setStoreLimit]);

  const billingPlan = normalizePlanParam(userPlan);
  const proMonthlyConversations = conversationLimitForPlan("pro");
  const proStoreCap = storeLimitForPlan("pro");

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="mt-1 text-slate-400">
          Manage forward email, chatbot personality, and AI training documents for the store selected in the top bar.
        </p>

        {/* Forward email */}
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Forward email</h2>
          <p className="text-xs text-slate-500">
            When conversations are forwarded, they can be sent to this inbox. Leave blank to disable.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={forwardEmail}
              onChange={(e) => setForwardEmail(e.target.value)}
              placeholder="support@yourstore.com"
              className="min-w-[220px] rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <Button
              variant="primary"
              disabled={forwardEmailSaving}
              onClick={handleSaveForwardEmail}
            >
              {forwardEmailSaving ? "Saving…" : "Save"}
            </Button>
          </div>
          {forwardEmailMessage && (
            <p className={`text-xs ${forwardEmailMessage.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
              {forwardEmailMessage.text}
            </p>
          )}
        </Card>

        {/* Notification sounds */}
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Notification sounds</h2>
          <p className="text-xs text-slate-500">
            Play a multi-beep alert on the Live conversations page for new customer messages — a new
            customer&apos;s first message, or any new message in a conversation still awaiting a reply. Click
            anywhere in the app once after login so your browser allows sound.
          </p>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              className="mt-1 rounded border-slate-600"
              checked={notifyEnabled}
              disabled={notifySaving}
              onChange={(e) => {
                const v = e.target.checked;
                setNotifyEnabled(v);
                void saveNotificationSounds(v);
              }}
            />
            <span>
              <span className="font-medium">New message notifications</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Multi-beep sound for new customer messages. Enabled by default.
              </span>
            </span>
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="text-xs"
              onClick={() => {
                unlockAgentNotificationAudio();
                playTestNotificationSound();
              }}
            >
              Test sound
            </Button>
          </div>
          {notifyMessage && (
            <p className={`text-xs ${notifyMessage.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
              {notifyMessage.text}
            </p>
          )}
        </Card>

        {/* Personality */}
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Chatbot personality</h2>
          <p className="text-xs text-slate-500">
            Tone of the AI when replying to customers.
          </p>
          <div className="flex flex-wrap gap-2">
            {PERSONALITIES.map((p) => (
              <Button
                key={p}
                variant={personality === p ? "primary" : "outline"}
                disabled={personalitySaving}
                onClick={() => handleSavePersonality(p)}
              >
                {p}
              </Button>
            ))}
          </div>
          {personalityMessage && (
            <p className={`text-xs ${personalityMessage.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
              {personalityMessage.text}
            </p>
          )}
        </Card>

        {/* Language */}
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Chatbot response language</h2>
          <p className="text-xs text-slate-500">
            The chatbot will always reply in this language.
          </p>
          <select
            value={language}
            onChange={(e) => {
              const v = e.target.value;
              setLanguage(v);
              fetch("/api/chatbots/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ language: v, ...(chatbotId ? { chatbotId } : {}) }),
              }).catch(() => {});
            }}
            className="w-full max-w-xs rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </Card>

        {/* Embed widget colour */}
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Widget colour (embed)</h2>
          <p className="text-xs text-slate-500">
            Floating button and send button on your site. Works alongside document uploads and guard rails. Paid plans
            remove &quot;Powered by Plainbot&quot;; your colour still applies.
          </p>
          <div className="flex flex-wrap items-center gap-3">
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
              className="w-40 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <Button variant="primary" disabled={widgetColorSaving} onClick={handleSaveWidgetColor}>
              {widgetColorSaving ? "Saving…" : "Save colour"}
            </Button>
          </div>
          {widgetColorMessage && (
            <p className={`text-xs ${widgetColorMessage.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
              {widgetColorMessage.text}
            </p>
          )}
        </Card>

        {/* Extra PDF / TXT for AI training */}
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Extra documents for AI training</h2>
          <p className="text-xs text-slate-500">
            PDF or TXT — you can select multiple files (total up to 4 MB per upload). Each file is stored for this chatbot;
            remove any you no longer need below.
          </p>
          <div className="rounded-lg border border-dashed border-slate-600 bg-slate-900/50 p-4 space-y-3">
            <input
              type="file"
              multiple
              accept=".pdf,.txt,application/pdf,text/plain"
              className="block w-full text-sm text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-primary-500/20 file:px-3 file:py-2 file:text-primary-400"
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                setPdfFiles(list);
                setPdfMessage(null);
              }}
            />
            {pdfFiles.length > 0 && (
              <p className="text-xs text-slate-400">Selected: {pdfFiles.map((f) => f.name).join(", ")}</p>
            )}
            <Button
              type="button"
              variant="secondary"
              disabled={pdfUploading || pdfFiles.length === 0}
              onClick={handlePdfUpload}
            >
              {pdfUploading ? "Uploading…" : "Upload document(s)"}
            </Button>
            {pdfMessage && (
              <p className={`text-xs ${pdfMessage.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                {pdfMessage.text}
              </p>
            )}
          </div>
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-medium text-slate-400">Uploaded documents</h3>
            <UploadedDocsList chatbotId={chatbotId} refreshTrigger={docsRefresh} />
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Plan & billing</h2>
            <p className="mt-1 text-xs text-slate-500">
              Pro is billed monthly in Stripe. After payment, your account updates automatically: higher conversation
              allowance and up to {proStoreCap ?? 5} stores at once (vs 1 on Free).
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
            <p className="text-xs text-slate-500">Current plan</p>
            <p className="mt-1 text-sm font-semibold capitalize text-slate-100">{billingPlan}</p>
          </div>

          {(billingPlan === "free" || billingPlan === "growth") && (
            <div className="space-y-2">
              <Button variant="primary" disabled={checkoutBusy} onClick={handleUpgradeToPro}>
                {checkoutBusy ? "Opening Stripe…" : "Upgrade to Pro"}
              </Button>
              <p className="text-xs text-slate-500">
                You&apos;ll pay securely on Stripe, then land on your dashboard with Pro limits (about{" "}
                {proMonthlyConversations != null ? proMonthlyConversations.toLocaleString() : "3,000"} conversations / month
                and multiple stores).
              </p>
            </div>
          )}

          {billingPlan === "pro" && (
            <p className="text-xs text-emerald-400">
              You&apos;re on Pro. You can connect up to {proStoreCap ?? 5} stores and use the higher monthly conversation
              pool. Switch stores from the sidebar or dashboard.
            </p>
          )}

          {billingPlan === "agency" && (
            <p className="text-xs text-slate-400">
              You&apos;re on the Agency plan. For billing changes, use the arrangement from your onboarding.
            </p>
          )}

          {checkoutError && <p className="text-xs text-red-400">{checkoutError}</p>}

          <p className="text-xs text-slate-600">
            <Link href="/dashboard" className="text-primary-400 hover:text-primary-300">
              Dashboard
            </Link>
            {" · "}
            <Link href="/pricing" className="text-primary-400 hover:text-primary-300">
              Compare plans
            </Link>
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
