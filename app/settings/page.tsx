"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
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
import { WIZARD_CARD_CLASS, WIZARD_INPUT_CLASS, WIZARD_PRIMARY_BUTTON_CLASS, WIZARD_OUTLINE_BUTTON_CLASS } from "@/lib/wizard-ui";

const PERSONALITIES = ["Friendly", "Professional", "Sales-focused", "Premium Luxury"] as const;

const ALERT_PRESETS: { value: string; label: string; minutes: number | null }[] = [
  { value: "off", label: "Off", minutes: null },
  { value: "0", label: "Instant (sent at the next check, within 5 min)", minutes: 0 },
  { value: "1440", label: "24 hours", minutes: 1440 },
  { value: "custom", label: "Custom… (hours)", minutes: null },
];

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

  const [alertEmail, setAlertEmail] = useState("");
  const [alertPreset, setAlertPreset] = useState<string>("off");
  const [alertCustom, setAlertCustom] = useState("");
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertTesting, setAlertTesting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [resendKey, setResendKey] = useState("");
  const [resendHasKey, setResendHasKey] = useState(false);
  const [resendSaving, setResendSaving] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [resendKeyVisible, setResendKeyVisible] = useState(false);

  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifySaving, setNotifySaving] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/users/escalation-alerts")
      .then((r) => r.json())
      .then((data: { email: string | null; minutes: number | null }) => {
        setAlertEmail(data.email ?? "");
        if (data.minutes === null || data.minutes === undefined) {
          setAlertPreset("off");
        } else {
          const match = ALERT_PRESETS.find((p) => p.minutes === data.minutes);
          if (match) {
            setAlertPreset(match.value);
          } else {
            setAlertPreset("custom");
            setAlertCustom(String(Math.round(data.minutes / 60)));
          }
        }
      })
      .catch(() => {});
  }, []);

  const saveEscalationAlerts = async () => {
    setAlertMessage(null);
    let minutes: number | null = null;
    if (alertPreset === "custom") {
      const n = Number(alertCustom);
      if (alertCustom.trim() === "" || !Number.isInteger(n) || n < 1) {
        setAlertMessage({ type: "error", text: "Enter a whole number of hours (1 or more)." });
        return;
      }
      minutes = n * 60;
    } else if (alertPreset !== "off") {
      minutes = ALERT_PRESETS.find((p) => p.value === alertPreset)?.minutes ?? null;
    }
    setAlertSaving(true);
    try {
      const res = await fetch("/api/users/escalation-alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: alertEmail.trim(), minutes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      setAlertMessage({ type: "ok", text: "Alert settings saved." });
    } catch (e: unknown) {
      setAlertMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save." });
    } finally {
      setAlertSaving(false);
    }
  };

  const sendTestAlert = async () => {
    setAlertMessage(null);
    setAlertTesting(true);
    try {
      const res = await fetch("/api/users/escalation-alerts/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Test failed.");
      setAlertMessage({ type: "ok", text: `Test email sent to ${data.sentTo}.` });
    } catch (e: unknown) {
      setAlertMessage({ type: "error", text: e instanceof Error ? e.message : "Test failed." });
    } finally {
      setAlertTesting(false);
    }
  };

  useEffect(() => {
    fetch("/api/users/resend-key")
      .then((r) => r.json())
      .then((data) => { if (typeof data.hasKey === "boolean") setResendHasKey(data.hasKey); })
      .catch(() => {});
  }, []);

  const saveResendKey = async () => {
    setResendMessage(null);
    setResendSaving(true);
    try {
      const res = await fetch("/api/users/resend-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resendApiKey: resendKey.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      setResendHasKey(data.hasKey);
      setResendKey("");
      setResendMessage({ type: "ok", text: data.hasKey ? "API key saved." : "API key removed." });
    } catch (e: unknown) {
      setResendMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save." });
    } finally {
      setResendSaving(false);
    }
  };

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
      <div className="min-h-full bg-cream">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-display text-[28px] text-ink">Settings</h1>
          <p className="mt-1.5 font-manrope text-sm text-warm-body">
            Manage forward email, chatbot personality, and AI training documents for the store selected in the top bar.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            {/* Forward email */}
            <div className={WIZARD_CARD_CLASS}>
              <h2 className="font-manrope text-[15px] font-bold text-ink">Forward email</h2>
              <p className="mt-1.5 font-manrope text-[13px] text-warm-body">
                When conversations are forwarded, they can be sent to this inbox. Leave blank to disable.
              </p>
              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <input
                  type="email"
                  value={forwardEmail}
                  onChange={(e) => setForwardEmail(e.target.value)}
                  placeholder="support@yourstore.com"
                  className={`min-w-[220px] flex-1 ${WIZARD_INPUT_CLASS}`}
                />
                <button
                  type="button"
                  disabled={forwardEmailSaving}
                  onClick={handleSaveForwardEmail}
                  className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-xs`}
                >
                  {forwardEmailSaving ? "Saving…" : "Save"}
                </button>
              </div>
              {forwardEmailMessage && (
                <p className={`mt-2 font-manrope text-xs ${forwardEmailMessage.type === "ok" ? "text-sage" : "text-red-600"}`}>
                  {forwardEmailMessage.text}
                </p>
              )}
            </div>

            {/* Escalation alerts */}
            <div className={WIZARD_CARD_CLASS}>
              <h2 className="font-manrope text-[15px] font-bold text-ink">Escalation alerts</h2>
              <p className="mt-1.5 font-manrope text-[13px] text-warm-body">
                Get an email when an escalation has been sitting unacknowledged for too long, so nothing gets missed.
              </p>

              <label className="mt-3.5 block">
                <span className="block font-manrope text-sm font-semibold text-ink">Send alerts to</span>
                <input
                  type="email"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder="you@yourstore.com"
                  className={`mt-1.5 ${WIZARD_INPUT_CLASS}`}
                />
              </label>

              <label className="mt-3.5 block">
                <span className="block font-manrope text-sm font-semibold text-ink">Alert after</span>
                <select
                  value={alertPreset}
                  onChange={(e) => setAlertPreset(e.target.value)}
                  className={`mt-1.5 w-full max-w-xs ${WIZARD_INPUT_CLASS}`}
                >
                  {ALERT_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              {alertPreset === "custom" && (
                <label className="mt-3.5 block">
                  <span className="block font-manrope text-sm font-semibold text-ink">Hours</span>
                  <input
                    type="number"
                    min={1}
                    value={alertCustom}
                    onChange={(e) => setAlertCustom(e.target.value)}
                    placeholder="e.g. 48"
                    className={`mt-1.5 w-40 ${WIZARD_INPUT_CLASS}`}
                  />
                </label>
              )}

              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={alertSaving}
                  onClick={saveEscalationAlerts}
                  className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-xs`}
                >
                  {alertSaving ? "Saving…" : "Save alert settings"}
                </button>
                <button
                  type="button"
                  disabled={alertTesting || !alertEmail.trim()}
                  onClick={sendTestAlert}
                  className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-5 py-2.5 text-xs`}
                >
                  {alertTesting ? "Sending…" : "Send test email"}
                </button>
              </div>

              {alertMessage && (
                <p className={`mt-2 font-manrope text-xs ${alertMessage.type === "ok" ? "text-sage" : "text-red-600"}`}>
                  {alertMessage.text}
                </p>
              )}
            </div>

            {/* Resend API key */}
            <div className={WIZARD_CARD_CLASS}>
              <h2 className="font-manrope text-[15px] font-bold text-ink">Email provider (Resend)</h2>
              <p className="mt-1.5 font-manrope text-[13px] text-warm-body">
                By default, forwarded emails are sent via Plainbot&apos;s shared Resend account. Paste your own{" "}
                <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">
                  Resend
                </a>{" "}
                API key to send from your own account instead.
              </p>
              {resendHasKey && (
                <p className="mt-2 font-manrope text-xs text-sage">A Resend API key is saved. Paste a new one to replace it, or clear the field and save to remove it.</p>
              )}
              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[220px] flex-1">
                  <input
                    type={resendKeyVisible ? "text" : "password"}
                    value={resendKey}
                    onChange={(e) => setResendKey(e.target.value)}
                    placeholder={resendHasKey ? "Paste new key to replace…" : "re_…"}
                    className={`w-full pr-16 ${WIZARD_INPUT_CLASS}`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setResendKeyVisible((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 font-manrope text-xs text-warm-muted hover:text-ink"
                  >
                    {resendKeyVisible ? "Hide" : "Show"}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={resendSaving}
                  onClick={saveResendKey}
                  className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-xs`}
                >
                  {resendSaving ? "Saving…" : "Save"}
                </button>
              </div>
              {resendMessage && (
                <p className={`mt-2 font-manrope text-xs ${resendMessage.type === "ok" ? "text-sage" : "text-red-600"}`}>
                  {resendMessage.text}
                </p>
              )}
            </div>

            {/* Notification sounds */}
            <div className={WIZARD_CARD_CLASS}>
              <h2 className="font-manrope text-[15px] font-bold text-ink">Notification sounds</h2>
              <p className="mt-1.5 font-manrope text-[13px] leading-relaxed text-warm-body">
                Play a multi-beep alert on the Live conversations page for new customer messages — a new
                customer&apos;s first message, or any new message in a conversation still awaiting a reply. Click
                anywhere in the app once after login so your browser allows sound.
              </p>
              <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 font-manrope text-sm font-bold text-ink">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-ink/[.25] text-terracotta focus:ring-terracotta/30"
                  checked={notifyEnabled}
                  disabled={notifySaving}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setNotifyEnabled(v);
                    void saveNotificationSounds(v);
                  }}
                />
                <span>
                  New message notifications
                  <span className="mt-0.5 block font-manrope text-xs font-normal text-warm-muted">
                    Multi-beep sound for new customer messages. Enabled by default.
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => {
                  unlockAgentNotificationAudio();
                  playTestNotificationSound();
                }}
                className={`mt-3.5 ${WIZARD_OUTLINE_BUTTON_CLASS} border-terracotta px-5 py-2.5 text-xs text-terracotta hover:bg-terracotta/5`}
              >
                Test sound
              </button>
              {notifyMessage && (
                <p className={`mt-2 font-manrope text-xs ${notifyMessage.type === "ok" ? "text-sage" : "text-red-600"}`}>
                  {notifyMessage.text}
                </p>
              )}
            </div>

            {/* Personality */}
            <div className={WIZARD_CARD_CLASS}>
              <h2 className="font-manrope text-[15px] font-bold text-ink">Chatbot personality</h2>
              <p className="mt-1.5 font-manrope text-[13px] text-warm-body">
                Tone of the AI when replying to customers.
              </p>
              <div className="mt-3.5 flex flex-wrap gap-2.5">
                {PERSONALITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={personalitySaving}
                    onClick={() => handleSavePersonality(p)}
                    className={`rounded-full px-[18px] py-2.5 font-manrope text-[13px] font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                      personality === p
                        ? "bg-terracotta text-cream"
                        : "border border-ink/[.15] bg-white text-ink hover:bg-ink/[.05]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {personalityMessage && (
                <p className={`mt-2 font-manrope text-xs ${personalityMessage.type === "ok" ? "text-sage" : "text-red-600"}`}>
                  {personalityMessage.text}
                </p>
              )}
            </div>

            {/* Language */}
            <div className={WIZARD_CARD_CLASS}>
              <h2 className="font-manrope text-[15px] font-bold text-ink">Chatbot response language</h2>
              <p className="mt-1.5 font-manrope text-[13px] text-warm-body">
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
                className={`mt-3.5 w-full max-w-xs ${WIZARD_INPUT_CLASS}`}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Embed widget colour */}
            <div className={WIZARD_CARD_CLASS}>
              <h2 className="font-manrope text-[15px] font-bold text-ink">Widget colour (embed)</h2>
              <p className="mt-1.5 font-manrope text-[13px] text-warm-body">
                Floating button and send button on your site. Works alongside document uploads and guard rails. Paid plans
                remove &quot;Powered by Plainbot&quot;; your colour still applies.
              </p>
              <div className="mt-3.5 flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={normalizeWidgetAccentColor(widgetAccentColor) ?? DEFAULT_WIDGET_ACCENT}
                  onChange={(e) => setWidgetAccentColor(e.target.value)}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-ink/[.15] bg-white p-1"
                  aria-label="Widget accent colour"
                />
                <input
                  type="text"
                  value={widgetAccentColor}
                  onChange={(e) => setWidgetAccentColor(e.target.value)}
                  placeholder="#f97316"
                  spellCheck={false}
                  className={`w-40 font-mono ${WIZARD_INPUT_CLASS}`}
                />
                <button
                  type="button"
                  disabled={widgetColorSaving}
                  onClick={handleSaveWidgetColor}
                  className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-xs`}
                >
                  {widgetColorSaving ? "Saving…" : "Save colour"}
                </button>
              </div>
              {widgetColorMessage && (
                <p className={`mt-2 font-manrope text-xs ${widgetColorMessage.type === "ok" ? "text-sage" : "text-red-600"}`}>
                  {widgetColorMessage.text}
                </p>
              )}
            </div>

            {/* Extra PDF / TXT for AI training */}
            <div className={WIZARD_CARD_CLASS}>
              <h2 className="font-manrope text-[15px] font-bold text-ink">Extra documents for AI training</h2>
              <p className="mt-1.5 font-manrope text-[13px] text-warm-body">
                PDF or TXT — you can select multiple files (total up to 4 MB per upload). Each file is stored for this chatbot;
                remove any you no longer need below.
              </p>
              <div className="mt-3.5 space-y-3 rounded-[10px] border border-dashed border-ink/[.2] bg-cream p-4">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,application/pdf,text/plain"
                  className="block w-full font-manrope text-sm text-warm-body file:mr-3 file:rounded-full file:border-0 file:bg-terracotta/10 file:px-3.5 file:py-2 file:font-bold file:text-terracotta"
                  onChange={(e) => {
                    const list = e.target.files ? Array.from(e.target.files) : [];
                    setPdfFiles(list);
                    setPdfMessage(null);
                  }}
                />
                {pdfFiles.length > 0 && (
                  <p className="font-manrope text-xs text-warm-muted">Selected: {pdfFiles.map((f) => f.name).join(", ")}</p>
                )}
                <button
                  type="button"
                  disabled={pdfUploading || pdfFiles.length === 0}
                  onClick={handlePdfUpload}
                  className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-5 py-2.5 text-xs`}
                >
                  {pdfUploading ? "Uploading…" : "Upload document(s)"}
                </button>
                {pdfMessage && (
                  <p className={`font-manrope text-xs ${pdfMessage.type === "ok" ? "text-sage" : "text-red-600"}`}>
                    {pdfMessage.text}
                  </p>
                )}
              </div>
              <div className="mt-3.5 space-y-2">
                <h3 className="font-manrope text-xs font-bold text-warm-muted">Uploaded documents</h3>
                <UploadedDocsList chatbotId={chatbotId} refreshTrigger={docsRefresh} light />
              </div>
            </div>

            {/* Plan & billing */}
            <div className={WIZARD_CARD_CLASS}>
              <h2 className="font-manrope text-[15px] font-bold text-ink">Plan &amp; billing</h2>
              <p className="mt-1.5 font-manrope text-[13px] text-warm-body">
                Pro is billed monthly in Stripe. After payment, your account updates automatically: higher conversation
                allowance and up to {proStoreCap ?? 5} stores at once (vs 1 on Free).
              </p>
              <div className="mt-3.5 rounded-[10px] border border-ink/[.08] bg-cream px-4 py-3">
                <p className="font-manrope text-xs text-warm-muted">Current plan</p>
                <p className="mt-1 font-manrope text-sm font-bold capitalize text-ink">{billingPlan}</p>
              </div>

              {(billingPlan === "free" || billingPlan === "growth") && (
                <div className="mt-3.5 space-y-2">
                  <button
                    type="button"
                    disabled={checkoutBusy}
                    onClick={handleUpgradeToPro}
                    className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-xs`}
                  >
                    {checkoutBusy ? "Opening Stripe…" : "Upgrade to Pro"}
                  </button>
                  <p className="font-manrope text-xs text-warm-muted">
                    You&apos;ll pay securely on Stripe, then land on your dashboard with Pro limits (about{" "}
                    {proMonthlyConversations != null ? proMonthlyConversations.toLocaleString() : "3,000"} conversations / month
                    and multiple stores).
                  </p>
                </div>
              )}

              {billingPlan === "pro" && (
                <p className="mt-3.5 font-manrope text-xs text-sage">
                  You&apos;re on Pro. You can connect up to {proStoreCap ?? 5} stores and use the higher monthly conversation
                  pool. Switch stores from the sidebar or dashboard.
                </p>
              )}

              {billingPlan === "agency" && (
                <p className="mt-3.5 font-manrope text-xs text-warm-muted">
                  You&apos;re on the Agency plan. For billing changes, use the arrangement from your onboarding.
                </p>
              )}

              {checkoutError && <p className="mt-2 font-manrope text-xs text-red-600">{checkoutError}</p>}

              <p className="mt-3.5 font-manrope text-xs text-warm-muted">
                <Link href="/dashboard" className="font-bold text-terracotta hover:text-terracotta-dark">
                  Dashboard
                </Link>
                {" · "}
                <Link href="/pricing" className="font-bold text-terracotta hover:text-terracotta-dark">
                  Compare plans
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
