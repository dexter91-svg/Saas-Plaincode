"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";
import Logo from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(typeof d.error === "string" ? d.error : "Request failed.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <header className="border-b border-slate-800 bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-slate-100">
            <Logo size="md" />
            <span className="text-base font-semibold">Plainbot</span>
          </Link>
          <Link href="/login" className="text-sm text-primary-400 hover:text-primary-300">
            Back to log in
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <Card className="w-full max-w-md p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-100">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter the email for your account. If it exists, we&apos;ll send a one-time link (check spam).
          </p>
          {done ? (
            <p className="mt-6 text-sm text-emerald-300/90">
              If an account exists for that email, we sent a reset link. You can close this tab.
            </p>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
