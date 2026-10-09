"use client";

import { useEffect, useState } from "react";
import { WIZARD_CARD_CLASS, WIZARD_INPUT_CLASS, WIZARD_OUTLINE_BUTTON_CLASS, WIZARD_PRIMARY_BUTTON_CLASS } from "@/lib/wizard-ui";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  conversationLimit: number | null;
  complimentaryCredits: number;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.users)) {
          setUsers(data.users);
        } else {
          setError(data.error || "Failed to load users");
        }
      })
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddCredits = async (userId: string, email: string) => {
    setUpdatingId(userId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/users/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: 1000 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add credits");

      setSuccess(`Added 1,000 credits to ${email}!`);
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, complimentaryCredits: data.complimentaryCredits } : u
        )
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add credits");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-full bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] text-ink">Users</h1>
            <p className="mt-1.5 font-manrope text-sm text-warm-body">Manage user accounts and allocate complimentary credits.</p>
          </div>
          <button type="button" onClick={fetchUsers} disabled={loading} className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-5 py-2.5 text-sm`}>
            Refresh
          </button>
        </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-manrope text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-lg border border-sage/30 bg-sage/10 px-4 py-3 font-manrope text-sm text-sage">
              {success}
            </div>
          )}

          <div className="mt-6 flex items-center">
            <input
              type="text"
              placeholder="Search users by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full max-w-md ${WIZARD_INPUT_CLASS}`}
            />
          </div>

          <div className={`mt-6 ${WIZARD_CARD_CLASS} !p-0 overflow-hidden`}>
            {loading ? (
              <p className="p-8 text-center font-manrope text-sm text-warm-muted">Loading users…</p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-center font-manrope text-sm text-warm-muted">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-ink/[.08] text-sm">
                  <thead className="bg-cream-alt">
                    <tr>
                      <th className="px-6 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">User</th>
                      <th className="px-6 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Plan</th>
                      <th className="px-6 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Base Limit</th>
                      <th className="px-6 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Bonus Credits</th>
                      <th className="px-6 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Total Limit</th>
                      <th className="px-6 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/[.08]">
                    {filtered.map((u) => {
                      const baseLimit = u.conversationLimit ?? 100;
                      const bonus = u.complimentaryCredits;
                      const totalLimit = u.conversationLimit === null ? "Unlimited" : (baseLimit + bonus).toLocaleString();

                      return (
                        <tr key={u.id} className="hover:bg-cream/60">
                          <td className="px-6 py-4">
                            <div className="font-manrope font-semibold text-ink">{u.name || "—"}</div>
                            <div className="font-manrope text-xs text-warm-muted">{u.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 font-manrope text-xs font-bold capitalize ${
                              u.plan === "free" ? "bg-ink/[.06] text-warm-body" : "bg-sage/10 text-sage"
                            }`}>
                              {u.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-manrope text-warm-body">
                            {u.conversationLimit === null ? "Unlimited" : baseLimit.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-mono text-terracotta">
                            +{bonus.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-manrope font-semibold text-ink">
                            {totalLimit}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              disabled={updatingId === u.id}
                              onClick={() => handleAddCredits(u.id, u.email)}
                              className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-3.5 py-1.5 text-xs`}
                            >
                              {updatingId === u.id ? "Adding…" : "+1,000 Credits"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
