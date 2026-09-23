"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { WIZARD_CARD_CLASS, WIZARD_INPUT_CLASS, WIZARD_PRIMARY_BUTTON_CLASS } from "@/lib/wizard-ui";

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
    <div
      className="flex min-h-screen flex-col bg-cream"
      style={{
        backgroundImage: "radial-gradient(120% 70% at 15% 0%, #F3E3D6 0%, #FBF7F2 55%)",
      }}
    >
      <header className="flex items-center justify-between px-[6vw] py-[18px]">
        <Link href="/" className="font-display text-2xl italic text-ink no-underline hover:text-ink">
          Plainbot
        </Link>
        <Link href="/login" className="font-manrope text-sm font-semibold text-terracotta hover:text-terracotta-dark">
          Back to log in
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 py-10 sm:items-center sm:py-12">
        <div className={`w-full max-w-md ${WIZARD_CARD_CLASS} sm:p-8`}>
          <h1 className="font-display text-3xl italic text-ink">Reset your password</h1>
          <p className="mt-2.5 font-manrope text-sm text-warm-body">
            Enter the email for your account. If it exists, we&apos;ll send a one-time link (check spam).
          </p>
          {done ? (
            <p className="mt-6 rounded-lg border border-sage/30 bg-sage/10 px-3 py-2 font-manrope text-sm text-sage">
              If an account exists for that email, we sent a reset link. You can close this tab.
            </p>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block font-manrope text-sm font-semibold text-ink">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={WIZARD_INPUT_CLASS}
                />
              </div>
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-manrope text-sm text-red-600">
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading} className={`w-full ${WIZARD_PRIMARY_BUTTON_CLASS} py-3.5 text-[15px]`}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </main>
      <footer className="py-4 text-center font-manrope text-sm text-warm-muted">
        © {new Date().getFullYear()} Plainbot. All rights reserved.
      </footer>
    </div>
  );
}
