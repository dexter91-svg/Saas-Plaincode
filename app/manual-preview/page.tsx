"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

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
    <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800/50"
      >
        <span>
          <span className="font-medium text-slate-200">Usage &amp; conversations</span>
          {usagePeriodMonth && (
            <span className="ml-2 text-xs text-slate-500">({usagePeriodMonth})</span>
          )}
        </span>
        <span className="shrink-0 text-xs text-slate-500">
          {used} used · {limitLabel}
          {rem != null && ` · ${rem} left`}
          {" · "}
          {st.open} open / {st.total} total threads
        </span>
      </button>
      {expanded && (
        <div className="border-t border-slate-700/80 px-3 py-3">
          <p className="text-xs text-slate-500">
            By status:{" "}
            <span className="text-slate-400">
              open {st.open}, resolved {st.resolved}, forwarded {st.forwarded}
            </span>
          </p>
          {recent.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No conversations yet.</p>
          ) : (
            <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-xs">
              {recent.map((c) => (
                <li
                  key={c.id}
                  className="rounded border border-slate-700/60 bg-slate-900/60 px-2 py-2 text-slate-400"
                >
                  <span className="font-mono text-slate-500">{truncateId(c.id, 8)}</span>
                  <span
                    className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                      c.status === "open"
                        ? "bg-amber-500/20 text-amber-300"
                        : c.status === "forwarded"
                          ? "bg-sky-500/20 text-sky-300"
                          : "bg-slate-600/40 text-slate-300"
                    }`}
                  >
                    {c.status}
                  </span>
                  <div className="mt-1 text-slate-300">
                    {c.chatbotName || "Bot"} · {c.messageCount} msgs
                  </div>
                  <div className="mt-0.5 text-slate-500">
                    {[c.customerName, c.customerEmail].filter(Boolean).join(" · ") || "Anonymous visitor"}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-600">
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
    <div className="min-h-screen bg-black text-slate-100">
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-bold text-slate-100">Manual preview</h1>
          <p className="mt-1 text-sm text-slate-500">
            All users grouped by plan (Free, Growth, Pro, Agency). Legacy <code className="text-slate-400">custom</code> shows under Agency. For Agency, add API endpoints and &quot;Make chatbot & go live&quot; as needed.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-slate-200">Test the flow</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/pricing" className="inline-flex rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
              Choose plan (Pricing)
            </Link>
            <Link href="/signup" className="inline-flex rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700">
              Sign up
            </Link>
            <Link href="/login" className="inline-flex rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700">
              Log in
            </Link>
          </div>
        </section>

        {error && (
          <p className="mt-6 rounded-lg border border-amber-800/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            {error}
          </p>
        )}

        {!loading && !error && (
          <section className="mt-8 rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-6">
            <h2 className="text-lg font-semibold text-emerald-200">Paying customers &amp; usage</h2>
            <p className="mt-1 text-sm text-slate-400">
              Everyone on a paid plan or with an active Stripe subscription. Monthly usage comes from{" "}
              <code className="text-slate-500">conversation_usage</code>
              {usagePeriodMonth ? (
                <>
                  {" "}
                  for <span className="text-slate-200">{usagePeriodMonth}</span>.
                </>
              ) : (
                "."
              )}{" "}
              “Left” is plan limit minus used (Agency = unlimited quota in UI).
            </p>
            {hasStripeColumns === false && (
              <p className="mt-2 text-xs text-amber-200/90">
                Your <code className="text-amber-100/80">users</code> table has no Stripe columns yet — subscription IDs
                won&apos;t show until you add <code className="text-amber-100/80">stripe_customer_id</code> and{" "}
                <code className="text-amber-100/80">stripe_subscription_id</code> (see webhook handler).
              </p>
            )}
            {payingUsers.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No paid-plan users in the database yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-3 font-medium">Email</th>
                      <th className="py-2 pr-3 font-medium">Plan</th>
                      <th className="py-2 pr-3 font-medium">Stripe sub</th>
                      <th className="py-2 pr-3 font-medium">Used</th>
                      <th className="py-2 pr-3 font-medium">Limit</th>
                      <th className="py-2 pr-3 font-medium">Left</th>
                      <th className="py-2 pr-3 font-medium">Open / total</th>
                      <th className="py-2 font-medium"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payingUsers.map((u) => {
                      const st = u.conversationStats ?? { open: 0, total: 0 };
                      const used = u.usageThisMonth ?? 0;
                      const lim = u.conversationLimit;
                      const rem = u.conversationsRemaining;
                      return (
                        <tr key={u.id} className="border-b border-slate-800/80 text-slate-300">
                          <td className="py-2 pr-3">
                            <span className="text-slate-200">{u.email}</span>
                            {u.name && <div className="text-xs text-slate-500">{u.name}</div>}
                          </td>
                          <td className="py-2 pr-3">
                            <code className="text-slate-400">{u.plan}</code>
                            {u.hasStripeSubscription && (
                              <span className="ml-1 text-[10px] text-emerald-400">Stripe</span>
                            )}
                          </td>
                          <td className="max-w-[140px] py-2 pr-3 font-mono text-xs text-slate-500">
                            {truncateId(u.stripeSubscriptionId, 18)}
                          </td>
                          <td className="py-2 pr-3">{used}</td>
                          <td className="py-2 pr-3">{lim == null ? "∞" : lim}</td>
                          <td className="py-2 pr-3">{rem == null ? "∞" : rem}</td>
                          <td className="py-2 pr-3">
                            {st.open} / {st.total}
                          </td>
                          <td className="py-2">
                            <a
                              href={impersonateUrl(u.id)}
                              className="text-primary-400 hover:text-primary-300"
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
          <p className="mt-8 text-sm text-slate-500">Loading users…</p>
        ) : (
          <>
            <section className="mt-8 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
              <h2 className="text-lg font-semibold text-slate-200">All users</h2>
              <p className="mt-2 text-sm text-slate-400">
                Total <span className="font-medium text-slate-200">{users.length}</span>
                {" · "}
                {PLAN_ORDER.map((p) => (
                  <span key={p} className="mr-3">
                    {PLAN_LABEL[p]}: <span className="text-slate-200">{usersByPlan[p].length}</span>
                  </span>
                ))}
              </p>
              <button
                type="button"
                onClick={() => fetchUsers()}
                className="mt-3 text-sm text-primary-400 hover:text-primary-300"
              >
                Refresh list
              </button>
            </section>

            {PLAN_ORDER.map((sectionPlan) => {
              const list = usersByPlan[sectionPlan];
              const isAgency = sectionPlan === "agency";
              const borderClass = isAgency ? "border-primary-500/30" : "border-slate-700";
              const titleClass = isAgency ? "text-primary-400" : "text-slate-200";

              return (
                <section key={sectionPlan} className={`mt-8 rounded-xl border ${borderClass} bg-slate-900/50 p-6`}>
                  <h2 className={`text-lg font-semibold ${titleClass}`}>
                    {PLAN_LABEL[sectionPlan]} ({list.length})
                  </h2>
                  {isAgency && (
                    <p className="mt-1 text-sm text-slate-500">
                      Add their API endpoints (their DB), then &quot;Make chatbot & go live&quot;. Use &quot;View dashboard&quot; for snippet and live dashboard.
                    </p>
                  )}
                  {!isAgency && (
                    <p className="mt-1 text-sm text-slate-500">
                      Conv limit from DB (monthly). Switch plan with the buttons on each row.
                    </p>
                  )}

                  {list.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">No {PLAN_LABEL[sectionPlan]} users.</p>
                  ) : isAgency ? (
                    <ul className="mt-4 space-y-6">
                      {list.map((u) => {
                        const hasChatbot = u.chatbots && u.chatbots.length > 0;
                        const showEndpointForm = addingEndpointFor === u.id;
                        const showChatbotForm = makingChatbotFor === u.id;
                        const cur = displayPlan(u);
                        return (
                          <li key={u.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-slate-200">{u.email}</p>
                                {u.name && <p className="text-sm text-slate-500">{u.name}</p>}
                                <p className="mt-1 text-xs text-slate-500">
                                  DB plan: <code className="text-slate-400">{u.plan}</code>
                                  {" · "}
                                  Conv limit: <span className="text-slate-400">{formatConvLimit(u)}/mo</span>
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <a
                                  href={impersonateUrl(u.id)}
                                  className="inline-flex rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
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
                                      className={`rounded px-2 py-1 text-xs disabled:opacity-40 ${
                                        cur === p ? "bg-slate-600 text-slate-100" : "text-slate-500 hover:bg-slate-700 hover:text-slate-200"
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
                                <p className="text-xs font-medium text-slate-500">Chatbots</p>
                                {u.chatbots.map((c) => (
                                  <p key={c.id} className="text-sm text-slate-400">
                                    {c.name} — {c.websiteUrl || "—"} <span className="text-slate-600">(id: {c.id})</span>
                                  </p>
                                ))}
                              </div>
                            )}

                            <div className="mt-3">
                              <p className="text-xs font-medium text-slate-500">Their API endpoints (DB)</p>
                              {u.endpoints && u.endpoints.length > 0 ? (
                                <ul className="mt-1 space-y-1 text-sm text-slate-400">
                                  {u.endpoints.map((e) => (
                                    <li key={e.id}>
                                      {e.name} — {e.baseUrl} <span className="text-slate-600">({e.authType})</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-1 text-xs text-slate-500">No endpoints yet</p>
                              )}
                              {!showEndpointForm ? (
                                <button
                                  type="button"
                                  className="mt-2 text-sm text-primary-400 hover:text-primary-300"
                                  onClick={() => setAddingEndpointFor(u.id)}
                                >
                                  + Add endpoint
                                </button>
                              ) : (
                                <div className="mt-3 space-y-2 rounded-lg border border-slate-600 bg-slate-900/50 p-3">
                                  <input
                                    type="text"
                                    placeholder="Name (e.g. Products API)"
                                    value={endpointForm.name}
                                    onChange={(e) => setEndpointForm((f) => ({ ...f, name: e.target.value }))}
                                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
                                  />
                                  <input
                                    type="url"
                                    placeholder="Base URL (e.g. https://api.theirstore.com)"
                                    value={endpointForm.baseUrl}
                                    onChange={(e) => setEndpointForm((f) => ({ ...f, baseUrl: e.target.value }))}
                                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
                                  />
                                  <select
                                    value={endpointForm.authType}
                                    onChange={(e) => setEndpointForm((f) => ({ ...f, authType: e.target.value }))}
                                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
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
                                      className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
                                    />
                                  )}
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      className="rounded bg-primary-500 px-3 py-1.5 text-sm text-white hover:bg-primary-600 disabled:opacity-50"
                                      disabled={!!updating}
                                      onClick={() => addEndpoint(u.id)}
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
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
                                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                                    onClick={() => setMakingChatbotFor(u.id)}
                                  >
                                    Make chatbot & go live
                                  </button>
                                ) : (
                                  <div className="space-y-2 rounded-lg border border-slate-600 bg-slate-900/50 p-3">
                                    <input
                                      type="url"
                                      placeholder="Store / website URL"
                                      value={chatbotForm.websiteUrl}
                                      onChange={(e) => setChatbotForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                                      className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Chatbot name"
                                      value={chatbotForm.name}
                                      onChange={(e) => setChatbotForm((f) => ({ ...f, name: e.target.value }))}
                                      className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
                                        disabled={!!makingChatbotFor}
                                        onClick={() => createChatbot(u.id)}
                                      >
                                        {makingChatbotFor === u.id ? "Creating…" : "Create & go live"}
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
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
                              <p className="mt-3 text-xs text-emerald-400">Chatbot live — they can see snippet on View dashboard.</p>
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
                            className="flex flex-col gap-3 rounded-lg border border-slate-700/80 bg-slate-800/30 px-4 py-3"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div>
                                  <span className="text-slate-200">{u.email}</span>
                                  {u.name && <span className="ml-2 text-sm text-slate-500">{u.name}</span>}
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  DB: <code className="text-slate-400">{u.plan}</code>
                                  {" · "}
                                  {formatConvLimit(u)} conv/mo
                                  {u.chatbots && u.chatbots.length > 0 && (
                                    <span className="text-slate-600"> · {u.chatbots.length} chatbot(s)</span>
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <a
                                  href={impersonateUrl(u.id)}
                                  className="inline-flex rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
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
                                      className={`rounded px-2 py-1 text-xs disabled:opacity-40 ${
                                        cur === p ? "bg-slate-600 text-slate-100" : "text-slate-500 hover:bg-slate-700 hover:text-slate-200"
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
