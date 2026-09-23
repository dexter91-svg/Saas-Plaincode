"use client";

import Link from "next/link";
import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WIZARD_CARD_CLASS, WIZARD_INPUT_CLASS, WIZARD_PRIMARY_BUTTON_CLASS } from "@/lib/wizard-ui";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams?.get("token") ?? "").trim();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Invalid or missing link. Use the link from your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof d.error === "string" ? d.error : "Reset failed.");
        setLoading(false);
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={`w-full max-w-md ${WIZARD_CARD_CLASS} sm:p-8`}>
        <p className="font-manrope text-sm text-warm-body">
          This page needs a valid reset link. Request a new one from Forgot password.
        </p>
        <Link href="/forgot-password" className="mt-4 inline-block font-manrope text-sm font-semibold text-terracotta hover:text-terracotta-dark">
          Forgot password
        </Link>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md ${WIZARD_CARD_CLASS} sm:p-8`}>
      <h1 className="font-display text-3xl italic text-ink">Choose a new password</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block font-manrope text-sm font-semibold text-ink">New password</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={WIZARD_INPUT_CLASS}
          />
        </div>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-manrope text-sm text-red-600">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className={`w-full ${WIZARD_PRIMARY_BUTTON_CLASS} py-3.5 text-[15px]`}>
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      </header>
      <main className="flex flex-1 items-start justify-center px-5 py-10 sm:items-center sm:py-12">
        <Suspense fallback={<p className="font-manrope text-sm text-warm-muted">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </main>
      <footer className="py-4 text-center font-manrope text-sm text-warm-muted">
        © {new Date().getFullYear()} Plainbot. All rights reserved.
      </footer>
    </div>
  );
}
