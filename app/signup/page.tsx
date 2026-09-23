"use client";

import Link from "next/link";
import { FormEvent, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { resetBotStorageForNewAccount } from "@/lib/bot-local-storage";

function SignupContent() {
  const searchParams = useSearchParams();
  const planParam = ((searchParams?.get("plan") || "free") as string).toLowerCase();
  const plan =
    planParam === "growth"
      ? "growth"
      : planParam === "pro"
        ? "pro"
        : planParam === "agency" || planParam === "custom"
          ? "agency"
          : "free";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const name = (fd.get("name") as string)?.trim() || null;
    const email = (fd.get("email") as string)?.trim()?.toLowerCase() ?? "";
    const password = (fd.get("password") as string) ?? "";

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed.");
        setLoading(false);
        return;
      }
      const p = data.user?.plan as string | undefined;
      const userPlan =
        p === "growth" || p === "pro" || p === "agency"
          ? p
          : p === "custom"
            ? "agency"
            : "free";
      resetBotStorageForNewAccount(userPlan);
      if (data.redirectToPayment) {
        const payPlan = (data.paymentPlan as string) || plan;
        window.location.href = `/signup/payment?plan=${encodeURIComponent(payPlan)}`;
      } else if (data.redirectTo) {
        window.location.href = data.redirectTo;
      } else {
        window.location.href = "/onboarding/store-type";
      }
    } catch {
      setError("Signup failed. Try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-cream"
      style={{
        backgroundImage:
          "radial-gradient(120% 70% at 15% 0%, #F3E3D6 0%, #FBF7F2 55%)",
      }}
    >
      <header className="flex items-center justify-between px-[6vw] py-[18px]">
        <Link href="/" className="font-display text-2xl italic text-ink no-underline hover:text-ink">
          Plainbot
        </Link>
        <p className="font-manrope text-sm text-warm-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-terracotta hover:text-terracotta-dark">
            Log in
          </Link>
        </p>
      </header>

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 lg:grid-cols-2">
        <div className="hidden flex-col items-center justify-center px-10 py-16 lg:flex">
          <div className="w-full max-w-[420px]">
            <h2 className="font-display text-4xl italic leading-[1.2] text-ink">
              Your first real day off starts here.
            </h2>
            <p className="mb-7 mt-4 font-manrope text-[15px] leading-6 text-warm-body">
              Everything you need to stop answering the same question 200 times a week.
            </p>
            <div className="flex flex-col gap-4">
              {[
                "Free forever, no card to start",
                "Live in about 5 minutes",
                "Human escalation built in from day one",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-terracotta shadow-[0_2px_8px_rgba(43,34,28,.08)]">
                    ✓
                  </div>
                  <span className="font-manrope text-sm text-[#4A3F37]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-5 py-14 lg:px-10">
          <div className="w-full max-w-[420px]">
            <div className="mb-6">
              <h1 className="font-display text-3xl italic text-ink">Create your account</h1>
              <p className="mt-2.5 font-manrope text-sm text-warm-body">
                {plan === "free"
                  ? "Free forever — no card to start. This isn't a trial that expires."
                  : "Create your account, then continue to checkout or your dashboard."}
              </p>
              {plan === "growth" && (
                <p className="mt-2 font-manrope text-sm font-semibold text-terracotta">
                  You&apos;re signing up for Growth ($79/month, card required after signup).
                </p>
              )}
              {plan === "pro" && (
                <p className="mt-2 font-manrope text-sm font-semibold text-terracotta">
                  You&apos;re signing up for Pro ($149/month, card required after signup).
                </p>
              )}
              {plan === "agency" && (
                <p className="mt-2 font-manrope text-sm font-semibold text-terracotta">
                  Agency ($299/month) — after signup you&apos;ll complete checkout with Stripe ($299/month), then open your dashboard.
                </p>
              )}
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block font-manrope text-sm font-semibold text-ink">
                  Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  required
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block font-manrope text-sm font-semibold text-ink">
                  Business Email
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="jane@company.com"
                  autoComplete="email"
                  required
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block font-manrope text-sm font-semibold text-ink">
                  Company Name
                </label>
                <input
                  name="companyName"
                  type="text"
                  placeholder="Acme E-commerce"
                  autoComplete="organization"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block font-manrope text-sm font-semibold text-ink">
                  Password
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className={`${INPUT_CLASS} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-warm-muted hover:bg-ink/[.05] hover:text-ink"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-manrope text-sm text-red-600">
                  {error}
                </p>
              )}
              <label className="-my-1 flex cursor-pointer items-start gap-3 rounded-lg py-2 pr-1">
                <input
                  type="checkbox"
                  required
                  className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 rounded border-ink/[.25] text-terracotta accent-terracotta focus:ring-terracotta/30"
                />
                <span className="font-manrope text-sm text-warm-body">
                  I manage an e-commerce store and agree to the{" "}
                  <Link href="/terms" className="text-terracotta hover:underline">
                    Terms of Service
                  </Link>
                  .
                </span>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-terracotta py-3.5 font-manrope text-[15px] font-bold text-cream transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-terracotta-dark hover:shadow-[0_10px_20px_-10px_rgba(190,91,55,.6)] active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"
              >
                {loading
                  ? "Creating..."
                  : plan === "free"
                    ? "Start free, no card needed"
                    : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center font-manrope text-xs text-warm-muted">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="text-terracotta hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-terracotta hover:underline">
                Privacy Policy
              </Link>
              .
            </p>

            <p className="mt-4 text-center font-manrope text-sm text-warm-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-terracotta hover:text-terracotta-dark">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center font-manrope text-sm text-warm-muted">
        © {new Date().getFullYear()} Plainbot. All rights reserved.
      </footer>
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-[10px] border border-ink/[.15] bg-white px-3.5 py-3 font-manrope text-sm text-ink placeholder:text-warm-muted/70 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20";

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream">
        <p className="font-manrope text-warm-muted">Loading…</p>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
