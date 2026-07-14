"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Logo from "@/components/Logo";

export default function ForwardEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/users/store-type").then((r) => r.json()),
      fetch("/api/users/forward-email").then((r) => r.json()),
    ])
      .then(([storeData, emailData]) => {
        if (!storeData.storeType) {
          router.replace("/onboarding/store-type");
          return;
        }
        if (emailData.forwardEmail) {
          router.replace("/create-bot");
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users/forward-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forwardEmail: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save.");
        setLoading(false);
        return;
      }
      router.push("/create-bot");
    } catch {
      setError("Failed to save. Try again.");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <header className="border-b border-slate-800 bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-slate-100">
            <Logo size="md" />
            <span className="text-base font-semibold sm:text-lg">
              Plainbot
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6 sm:py-12 lg:px-8">
        <div className="w-full max-w-md pb-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
              Where should we send forwarded conversations?
            </h1>
            <p className="mt-2 text-slate-400">
              When the AI can&apos;t help (e.g. order cancellation), we&apos;ll forward the full conversation to this email. You can reply and the customer will see it in chat.
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="block text-sm font-medium text-slate-300">Support email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="support@yourstore.com"
                  autoComplete="email"
                  enterKeyHint="done"
                  inputMode="email"
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  required
                />
              </label>
              {error && (
                <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading}
              >
                {loading ? "Saving..." : "Continue"}
              </Button>
            </form>
          </Card>

          <p className="mt-4 text-center text-sm text-slate-500">
            You can change this later in Settings.
          </p>
        </div>
      </main>
    </div>
  );
}
