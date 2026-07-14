"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  conversationLimit: number | null;
  complimentaryCredits: number;
  createdAt: string;
};

export default function AdminPage() {
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
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Admin Panel</h1>
            <p className="mt-1 text-slate-400">Manage user accounts and allocate complimentary credits.</p>
          </div>
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {success}
          </div>
        )}

        <div className="mt-6 flex items-center">
          <input
            type="text"
            placeholder="Search users by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none"
          />
        </div>

        <Card className="mt-6 p-0 overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-slate-400">Loading users...</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700/80 text-sm">
                <thead className="bg-slate-900/80">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Base Limit</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Bonus Credits</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Total Limit</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/80 bg-slate-900/40">
                  {filtered.map((u) => {
                    const baseLimit = u.conversationLimit ?? 100;
                    const bonus = u.complimentaryCredits;
                    const totalLimit = u.conversationLimit === null ? "Unlimited" : (baseLimit + bonus).toLocaleString();

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/20">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-200">{u.name || "—"}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${
                            u.plan === "free" ? "bg-slate-800 text-slate-400" : "bg-emerald-500/15 text-emerald-400"
                          }`}>
                            {u.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {u.conversationLimit === null ? "Unlimited" : baseLimit.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-primary-400 font-mono">
                          +{bonus.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-slate-100 font-semibold">
                          {totalLimit}
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="primary"
                            className="px-3 py-1.5 text-xs"
                            disabled={updatingId === u.id}
                            onClick={() => handleAddCredits(u.id, u.email)}
                          >
                            {updatingId === u.id ? "Adding..." : "+1,000 Credits"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
