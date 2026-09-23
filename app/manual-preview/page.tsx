"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { WIZARD_CARD_CLASS, WIZARD_INPUT_CLASS, WIZARD_PRIMARY_BUTTON_CLASS, WIZARD_OUTLINE_BUTTON_CLASS } from "@/lib/wizard-ui";

type Chatbot = { id: string; name: string; websiteUrl: string };
type Endpoint = { id: string; name: string; baseUrl: string; authType: string };
type BillingPlanUi = "free" | "growth" | "pro" | "agency";

type ConversationSummary = {
  id: string;
  chatbotId: string;
  chatbotName: string | null;
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  conversationLimit?: number | null;
  createdAt: string;
  chatbots?: Chatbot[];
  endpoints?: Endpoint[];
  usageThisMonth?: number;
  conversationsRemaining?: number | null;
  conversationStats?: {
    open: number;
    resolved: number;
    forwarded: number;
    total: number;
  };
  recentConversations?: ConversationSummary[];
  isPayingCustomer?: boolean;
  hasStripeSubscription?: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};

function displayPlan(u: UserRow): BillingPlanUi {
  const p = (u.plan || "free").toLowerCase();
  if (p === "growth") return "growth";
  if (p === "pro" || p === "business") return "pro";
  if (p === "agency" || p === "custom") return "agency";
  return "free";
}

const PLAN_ORDER: BillingPlanUi[] = ["free", "growth", "pro", "agency"];

const PLAN_LABEL: Record<BillingPlanUi, string> = {
  free: "Free",
  growth: "Growth",
  pro: "Pro",
  agency: "Agency",
};

function truncateId(s: string | null | undefined, visible = 14): string {
  if (!s) return "—";
  const t = s.trim();
  if (t.length <= visible) return t;
  return `${t.slice(0, visible)}…`;
}

function ConversationPanel({
  u,
  expanded,
  onToggle,
  usagePeriodMonth,
}: {
  u: UserRow;
  expanded: boolean;
  onToggle: () => void;
  usagePeriodMonth: string | null;
}) {
  const used = u.usageThisMonth ?? 0;
  const limit = u.conversationLimit;
  const rem = u.conversationsRemaining;
  const st = u.conversationStats ?? { open: 0, resolved: 0, forwarded: 0, total: 0 };
  const recent = u.recentConversations ?? [];
  const limitLabel = limit == null ? "Unlimited" : `${limit}/mo`;

  return (
    <div className="mt-3 rounded-[10px] border border-ink/[.08] bg-cream">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-manrope text-sm text-warm-body hover:bg-ink/[.03]"
      >
        <span>
          <span className="font-semibold text-ink">Usage &amp; conversations</span>
          {usagePeriodMonth && (
            <span className="ml-2 font-manrope text-xs text-warm-muted">({usagePeriodMonth})</span>
          )}
        </span>
        <span className="shrink-0 font-manrope text-xs text-warm-muted">
          {used} used · {limitLabel}
          {rem != null && ` · ${rem} left`}
          {" · "}
          {st.open} open / {st.total} total threads
        </span>
      </button>
      {expanded && (
        <div className="border-t border-ink/[.08] px-3 py-3">
          <p className="font-manrope text-xs text-warm-muted">
            By status:{" "}
            <span className="text-warm-body">
              open {st.open}, resolved {st.resolved}, forwarded {st.forwarded}
            </span>
          </p>
          {recent.length === 0 ? (
            <p className="mt-2 font-manrope text-sm text-warm-muted">No conversations yet.</p>
          ) : (
            <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto font-manrope text-xs">
              {recent.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-ink/[.08] bg-white px-2 py-2 text-warm-body"
                >
                  <span className="font-mono text-warm-muted">{truncateId(c.id, 8)}</span>
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      c.status === "open"
                        ? "bg-amber-100 text-amber-700"
                        : c.status === "forwarded"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-ink/[.06] text-warm-body"
                    }`}
                  >
                    {c.status}
                  </span>
                  <div className="mt-1 text-ink">
                    {c.chatbotName || "Bot"} · {c.messageCount} msgs
                  </div>
                  <div className="mt-0.5 text-warm-muted">
                    {[c.customerName, c.customerEmail].filter(Boolean).join(" · ") || "Anonymous visitor"}
                  </div>
                  <div className="mt-0.5 text-[10px] text-warm-muted">
                    Updated {new Date(c.updatedAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function ManualPreviewPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usagePeriodMonth, setUsagePeriodMonth] = useState<string | null>(null);
  const [hasStripeColumns, setHasStripeColumns] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [convDetailUserId, setConvDetailUserId] = useState<string | null>(null);
  const [addingEndpointFor, setAddingEndpointFor] = useState<string | null>(null);
  const [makingChatbotFor, setMakingChatbotFor] = useState<string | null>(null);
  const [endpointForm, setEndpointForm] = useState({ name: "", baseUrl: "", authType: "none", authValue: "" });
  const [chatbotForm, setChatbotForm] = useState({ websiteUrl: "https://example.com", name: "Plainbot" });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/manual-preview/users");
      if (!res.ok) {
        if (res.status === 404) setError("Manual preview is only available when you run the app locally (npm run dev).");
        else setError("Failed to load users.");
        setUsers([]);
        return;
      }
      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
      setUsagePeriodMonth(typeof data.usagePeriodMonth === "string" ? data.usagePeriodMonth : null);
      setHasStripeColumns(typeof data.hasStripeColumns === "boolean" ? data.hasStripeColumns : null);
    } catch {
      setError("Failed to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const setPlan = async (userId: string, plan: BillingPlanUi) => {
    setUpdating(userId);
    try {
      const res = await fetch("/api/manual-preview/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan }),
      });
      if (res.ok) await fetchUsers();
    } finally {
      setUpdating(null);
    }
  };

  const addEndpoint = async (userId: string) => {
    if (!endpointForm.name.trim() || !endpointForm.baseUrl.trim()) return;
    setUpdating(userId);
    try {
      const res = await fetch(`/api/manual-preview/users/${encodeURIComponent(userId)}/endpoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: endpointForm.name.trim(),
          baseUrl: endpointForm.baseUrl.trim(),
          authType: endpointForm.authType,
          authValue: endpointForm.authValue.trim() || undefined,
        }),
      });
      if (res.ok) {
        setAddingEndpointFor(null);
        setEndpointForm({ name: "", baseUrl: "", authType: "none", authValue: "" });
        await fetchUsers();
      }
    } finally {
      setUpdating(null);
    }
  };

  const createChatbot = async (userId: string) => {
    setMakingChatbotFor(userId);
    try {
      const res = await fetch(`/api/manual-preview/users/${encodeURIComponent(userId)}/create-chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: chatbotForm.websiteUrl.trim() || "https://example.com",
          name: chatbotForm.name.trim() || "Plainbot",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMakingChatbotFor(null);
        setChatbotForm({ websiteUrl: "https://example.com", name: "Plainbot" });
        await fetchUsers();
      } else {
        setError(data.error || "Failed to create chatbot.");
      }
    } finally {
      setMakingChatbotFor(null);
    }
  };

  const usersByPlan = PLAN_ORDER.reduce(
    (acc, plan) => {
      acc[plan] = users.filter((u) => displayPlan(u) === plan);
      return acc;
    },
    {} as Record<BillingPlanUi, UserRow[]>
  );

  const payingUsers = users
    .filter((u) => u.isPayingCustomer)
    .slice()
    .sort((a, b) => a.email.localeCompare(b.email));

  const impersonateUrl = (userId: string) => `/api/manual-preview/impersonate?userId=${encodeURIComponent(userId)}`;

  const formatConvLimit = (u: UserRow) => {
    if (u.conversationLimit == null) return "Unlimited";
    return String(u.conversationLimit);
  };

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-ink/[.08] bg-white px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-2xl text-ink">Manual preview</h1>
          <p className="mt-1 font-manrope text-sm text-warm-body">
            All users grouped by plan (Free, Growth, Pro, Agency). Legacy <code className="rounded bg-peach px-1 py-0.5 text-ink">custom</code> shows under Agency. For Agency, add API endpoints and &quot;Make chatbot & go live&quot; as needed.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <section className={WIZARD_CARD_CLASS}>
          <h2 className="font-manrope text-lg font-bold text-ink">Test the flow</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/pricing" className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-4 py-2 text-sm`}>
              Choose plan (Pricing)
            </Link>
            <Link href="/signup" className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-4 py-2 text-sm`}>
              Sign up
            </Link>
            <Link href="/login" className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-4 py-2 text-sm`}>
              Log in
            </Link>
          </div>
        </section>

        {error && (
          <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 font-manrope text-sm text-amber-800">
            {error}
          </p>
        )}

        {!loading && !error && (
          <section className={`mt-6 ${WIZARD_CARD_CLASS} border-sage/30 bg-sage/5`}>
            <h2 className="font-manrope text-lg font-bold text-sage">Paying customers &amp; usage</h2>
            <p className="mt-1 font-manrope text-sm text-warm-body">
              Everyone on a paid plan or with an active Stripe subscription. Monthly usage comes from{" "}
              <code className="rounded bg-peach px-1 py-0.5 text-ink">conversation_usage</code>
              {usagePeriodMonth ? (
                <>
                  {" "}
                  for <span className="text-ink">{usagePeriodMonth}</span>.
                </>
              ) : (
                "."
              )}{" "}
              “Left” is plan limit minus used (Agency = unlimited quota in UI).
            </p>
            {hasStripeColumns === false && (
              <p className="mt-2 font-manrope text-xs text-amber-700">
                Your <code className="rounded bg-amber-100 px-1 py-0.5">users</code> table has no Stripe columns yet — subscription IDs
                won&apos;t show until you add <code className="rounded bg-amber-100 px-1 py-0.5">stripe_customer_id</code> and{" "}
                <code className="rounded bg-amber-100 px-1 py-0.5">stripe_subscription_id</code> (see webhook handler).
              </p>
            )}
            {payingUsers.length === 0 ? (
              <p className="mt-4 font-manrope text-sm text-warm-muted">No paid-plan users in the database yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-[10px] border border-ink/[.08] bg-white">
                <table className="w-full min-w-[720px] border-collapse text-left font-manrope text-sm">
                  <thead>
                    <tr className="border-b border-ink/[.08] bg-cream-alt text-xs uppercase tracking-wide text-warm-muted">
                      <th className="py-2 pl-3 pr-3 font-bold">Email</th>
                      <th className="py-2 pr-3 font-bold">Plan</th>
                      <th className="py-2 pr-3 font-bold">Stripe sub</th>
                      <th className="py-2 pr-3 font-bold">Used</th>
                      <th className="py-2 pr-3 font-bold">Limit</th>
                      <th className="py-2 pr-3 font-bold">Left</th>
                      <th className="py-2 pr-3 font-bold">Open / total</th>
                      <th className="py-2 pr-3 font-bold"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payingUsers.map((u) => {
                      const st = u.conversationStats ?? { open: 0, total: 0 };
                      const used = u.usageThisMonth ?? 0;
                      const lim = u.conversationLimit;
                      const rem = u.conversationsRemaining;
                      return (
                        <tr key={u.id} className="border-b border-ink/[.06] text-warm-body">
                          <td className="py-2 pl-3 pr-3">
                            <span className="text-ink">{u.email}</span>
                            {u.name && <div className="font-manrope text-xs text-warm-muted">{u.name}</div>}
                          </td>
                          <td className="py-2 pr-3">
                            <code className="text-warm-body">{u.plan}</code>
                            {u.hasStripeSubscription && (
                              <span className="ml-1 text-[10px] font-bold text-sage">Stripe</span>
                            )}
                          </td>
                          <td className="max-w-[140px] py-2 pr-3 font-mono text-xs text-warm-muted">
                            {truncateId(u.stripeSubscriptionId, 18)}
                          </td>
                          <td className="py-2 pr-3">{used}</td>
                          <td className="py-2 pr-3">{lim == null ? "∞" : lim}</td>
                          <td className="py-2 pr-3">{rem == null ? "∞" : rem}</td>
                          <td className="py-2 pr-3">
                            {st.open} / {st.total}
                          </td>
                          <td className="py-2 pr-3">
                            <a
                              href={impersonateUrl(u.id)}
                              className="font-bold text-terracotta hover:text-terracotta-dark"
                            >
                              Dashboard
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {loading ? (
          <p className="mt-8 font-manrope text-sm text-warm-muted">Loading users…</p>
        ) : (
          <>
            <section className={`mt-6 ${WIZARD_CARD_CLASS}`}>
              <h2 className="font-manrope text-lg font-bold text-ink">All users</h2>
              <p className="mt-2 font-manrope text-sm text-warm-body">
                Total <span className="font-semibold text-ink">{users.length}</span>
                {" · "}
                {PLAN_ORDER.map((p) => (
                  <span key={p} className="mr-3">
                    {PLAN_LABEL[p]}: <span className="text-ink">{usersByPlan[p].length}</span>
                  </span>
                ))}
              </p>
              <button
                type="button"
                onClick={() => fetchUsers()}
                className="mt-3 font-manrope text-sm font-bold text-terracotta hover:text-terracotta-dark"
              >
                Refresh list
              </button>
            </section>

            {PLAN_ORDER.map((sectionPlan) => {
              const list = usersByPlan[sectionPlan];
              const isAgency = sectionPlan === "agency";
              const borderClass = isAgency ? "border-terracotta/30" : "border-ink/[.08]";
              const titleClass = isAgency ? "text-terracotta" : "text-ink";

              return (
                <section key={sectionPlan} className={`mt-6 rounded-2xl border ${borderClass} bg-white p-6 shadow-[0_4px_20px_-8px_rgba(43,34,28,.08)]`}>
                  <h2 className={`font-manrope text-lg font-bold ${titleClass}`}>
                    {PLAN_LABEL[sectionPlan]} ({list.length})
                  </h2>
                  {isAgency && (
                    <p className="mt-1 font-manrope text-sm text-warm-muted">
                      Add their API endpoints (their DB), then &quot;Make chatbot & go live&quot;. Use &quot;View dashboard&quot; for snippet and live dashboard.
                    </p>
                  )}
                  {!isAgency && (
                    <p className="mt-1 font-manrope text-sm text-warm-muted">
                      Conv limit from DB (monthly). Switch plan with the buttons on each row.
                    </p>
                  )}

                  {list.length === 0 ? (
                    <p className="mt-4 font-manrope text-sm text-warm-muted">No {PLAN_LABEL[sectionPlan]} users.</p>
                  ) : isAgency ? (
                    <ul className="mt-4 space-y-6">
                      {list.map((u) => {
                        const hasChatbot = u.chatbots && u.chatbots.length > 0;
                        const showEndpointForm = addingEndpointFor === u.id;
                        const showChatbotForm = makingChatbotFor === u.id;
                        const cur = displayPlan(u);
                        return (
                          <li key={u.id} className="rounded-[10px] border border-ink/[.08] bg-cream p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-manrope font-semibold text-ink">{u.email}</p>
                                {u.name && <p className="font-manrope text-sm text-warm-muted">{u.name}</p>}
                                <p className="mt-1 font-manrope text-xs text-warm-muted">
                                  DB plan: <code className="text-warm-body">{u.plan}</code>
                                  {" · "}
                                  Conv limit: <span className="text-warm-body">{formatConvLimit(u)}/mo</span>
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <a
                                  href={impersonateUrl(u.id)}
                                  className={`inline-flex ${WIZARD_PRIMARY_BUTTON_CLASS} px-4 py-2 text-sm`}
                                >
                                  View dashboard
                                </a>
                                <div className="flex flex-wrap justify-end gap-1">
                                  {PLAN_ORDER.map((p) => (
                                    <button
                                      key={p}
                                      type="button"
                                      disabled={!!updating || cur === p}
                                      onClick={() => setPlan(u.id, p)}
                                      className={`rounded-full px-2.5 py-1 font-manrope text-xs font-bold disabled:opacity-40 ${
                                        cur === p ? "bg-ink text-cream" : "text-warm-muted hover:bg-ink/[.06] hover:text-ink"
                                      }`}
                                    >
                                      {updating === u.id ? "…" : PLAN_LABEL[p]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <ConversationPanel
                              u={u}
                              expanded={convDetailUserId === u.id}
                              onToggle={() =>
                                setConvDetailUserId((prev) => (prev === u.id ? null : u.id))
                              }
                              usagePeriodMonth={usagePeriodMonth}
                            />

                            {u.chatbots && u.chatbots.length > 0 && (
                              <div className="mt-3">
                                <p className="font-manrope text-xs font-bold text-warm-muted">Chatbots</p>
                                {u.chatbots.map((c) => (
                                  <p key={c.id} className="font-manrope text-sm text-warm-body">
                                    {c.name} — {c.websiteUrl || "—"} <span className="text-warm-muted">(id: {c.id})</span>
                                  </p>
                                ))}
                              </div>
                            )}

                            <div className="mt-3">
                              <p className="font-manrope text-xs font-bold text-warm-muted">Their API endpoints (DB)</p>
                              {u.endpoints && u.endpoints.length > 0 ? (
                                <ul className="mt-1 space-y-1 font-manrope text-sm text-warm-body">
                                  {u.endpoints.map((e) => (
                                    <li key={e.id}>
                                      {e.name} — {e.baseUrl} <span className="text-warm-muted">({e.authType})</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-1 font-manrope text-xs text-warm-muted">No endpoints yet</p>
                              )}
                              {!showEndpointForm ? (
                                <button
                                  type="button"
                                  className="mt-2 font-manrope text-sm font-bold text-terracotta hover:text-terracotta-dark"
                                  onClick={() => setAddingEndpointFor(u.id)}
                                >
                                  + Add endpoint
                                </button>
                              ) : (
                                <div className="mt-3 space-y-2 rounded-[10px] border border-ink/[.15] bg-white p-3">
                                  <input
                                    type="text"
                                    placeholder="Name (e.g. Products API)"
                                    value={endpointForm.name}
                                    onChange={(e) => setEndpointForm((f) => ({ ...f, name: e.target.value }))}
                                    className={WIZARD_INPUT_CLASS}
                                  />
                                  <input
                                    type="url"
                                    placeholder="Base URL (e.g. https://api.theirstore.com)"
                                    value={endpointForm.baseUrl}
                                    onChange={(e) => setEndpointForm((f) => ({ ...f, baseUrl: e.target.value }))}
                                    className={WIZARD_INPUT_CLASS}
                                  />
                                  <select
                                    value={endpointForm.authType}
                                    onChange={(e) => setEndpointForm((f) => ({ ...f, authType: e.target.value }))}
                                    className={WIZARD_INPUT_CLASS}
                                  >
                                    <option value="none">No auth</option>
                                    <option value="bearer">Bearer token</option>
                                    <option value="api_key_header">API key (header)</option>
                                    <option value="basic">Basic auth</option>
                                  </select>
                                  {(endpointForm.authType === "bearer" || endpointForm.authType === "api_key_header" || endpointForm.authType === "basic") && (
                                    <input
                                      type="password"
                                      placeholder="Token or key"
                                      value={endpointForm.authValue}
                                      onChange={(e) => setEndpointForm((f) => ({ ...f, authValue: e.target.value }))}
                                      className={WIZARD_INPUT_CLASS}
                                    />
                                  )}
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-3.5 py-2 text-sm disabled:opacity-50`}
                                      disabled={!!updating}
                                      onClick={() => addEndpoint(u.id)}
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-3.5 py-2 text-sm`}
                                      onClick={() => {
                                        setAddingEndpointFor(null);
                                        setEndpointForm({ name: "", baseUrl: "", authType: "none", authValue: "" });
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {!hasChatbot && (
                              <div className="mt-4">
                                {!showChatbotForm ? (
                                  <button
                                    type="button"
                                    className={`${WIZARD_PRIMARY_BUTTON_CLASS} bg-sage px-4 py-2 text-sm hover:bg-sage/90`}
                                    onClick={() => setMakingChatbotFor(u.id)}
                                  >
                                    Make chatbot & go live
                                  </button>
                                ) : (
                                  <div className="space-y-2 rounded-[10px] border border-ink/[.15] bg-white p-3">
                                    <input
                                      type="url"
                                      placeholder="Store / website URL"
                                      value={chatbotForm.websiteUrl}
                                      onChange={(e) => setChatbotForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                                      className={WIZARD_INPUT_CLASS}
                                    />
                                    <input
                                      type="text"
                                      placeholder="Chatbot name"
                                      value={chatbotForm.name}
                                      onChange={(e) => setChatbotForm((f) => ({ ...f, name: e.target.value }))}
                                      className={WIZARD_INPUT_CLASS}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        className={`${WIZARD_PRIMARY_BUTTON_CLASS} bg-sage px-3.5 py-2 text-sm hover:bg-sage/90 disabled:opacity-50`}
                                        disabled={!!makingChatbotFor}
                                        onClick={() => createChatbot(u.id)}
                                      >
                                        {makingChatbotFor === u.id ? "Creating…" : "Create & go live"}
                                      </button>
                                      <button
                                        type="button"
                                        className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-3.5 py-2 text-sm`}
                                        onClick={() => setMakingChatbotFor(null)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {hasChatbot && (
                              <p className="mt-3 font-manrope text-xs font-semibold text-sage">Chatbot live — they can see snippet on View dashboard.</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {list.map((u) => {
                        const cur = displayPlan(u);
                        return (
                          <li
                            key={u.id}
                            className="flex flex-col gap-3 rounded-[10px] border border-ink/[.08] bg-cream px-4 py-3"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                              <div className="min-w-0 flex-1 font-manrope">
                                <div>
                                  <span className="text-ink">{u.email}</span>
                                  {u.name && <span className="ml-2 text-sm text-warm-muted">{u.name}</span>}
                                </div>
                                <p className="mt-1 text-xs text-warm-muted">
                                  DB: <code className="text-warm-body">{u.plan}</code>
                                  {" · "}
                                  {formatConvLimit(u)} conv/mo
                                  {u.chatbots && u.chatbots.length > 0 && (
                                    <span className="text-warm-muted"> · {u.chatbots.length} chatbot(s)</span>
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <a
                                  href={impersonateUrl(u.id)}
                                  className={`inline-flex ${WIZARD_PRIMARY_BUTTON_CLASS} px-3.5 py-1.5 text-sm`}
                                >
                                  View dashboard
                                </a>
                                <div className="flex flex-wrap gap-1">
                                  {PLAN_ORDER.map((p) => (
                                    <button
                                      key={p}
                                      type="button"
                                      disabled={!!updating || cur === p}
                                      onClick={() => setPlan(u.id, p)}
                                      className={`rounded-full px-2.5 py-1 font-manrope text-xs font-bold disabled:opacity-40 ${
                                        cur === p ? "bg-ink text-cream" : "text-warm-muted hover:bg-ink/[.06] hover:text-ink"
                                      }`}
                                    >
                                      {updating === u.id ? "…" : PLAN_LABEL[p]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <ConversationPanel
                              u={u}
                              expanded={convDetailUserId === u.id}
                              onToggle={() =>
                                setConvDetailUserId((prev) => (prev === u.id ? null : u.id))
                              }
                              usagePeriodMonth={usagePeriodMonth}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
