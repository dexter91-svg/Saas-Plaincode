"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetBotStorageForNewAccount } from "@/lib/bot-local-storage";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetBanner, setResetBanner] = useState(false);
  useEffect(() => {
    if (searchParams?.get("reset") === "1") setResetBanner(true);
  }, [searchParams]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials.");
        setLoading(false);
        return;
      }
      const rawPlan = data.user?.plan as string | undefined;
      const plan =
        rawPlan === "growth" || rawPlan === "pro" || rawPlan === "agency"
          ? rawPlan
          : rawPlan === "custom"
            ? "agency"
            : rawPlan === "business"
              ? "pro"
              : "free";
      resetBotStorageForNewAccount(plan);
      router.push("/dashboard");
    } catch {
      setError("Login failed. Try again.");
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    document.cookie = "mock-auth=1; path=/; max-age=86400";
    window.localStorage.setItem("mock-auth", "1");
    resetBotStorageForNewAccount("pro");
    const target = searchParams?.get("from") || "/test-chatbot";
    window.location.href = target;
  };

  const handleClearData = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.localStorage.removeItem("signup-email");
      window.localStorage.removeItem("signup-password");
      window.localStorage.removeItem("mock-auth");
      window.localStorage.removeItem("bot-state-v2");
      document.cookie = "mock-auth=; path=/; max-age=0";
      setError(null);
      window.location.reload();
    } catch {
      window.location.reload();
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
          Don&apos;t have an account?{" "}
          <Link href="/signup?plan=free" className="font-semibold text-terracotta hover:text-terracotta-dark">
            Sign up
          </Link>
        </p>
      </header>

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 lg:grid-cols-2">
        <div className="hidden flex-col items-center justify-center px-10 py-16 lg:flex">
          <div className="w-full max-w-[420px]">
            <h2 className="font-display text-4xl italic leading-[1.2] text-ink">
              Good to see you again.
            </h2>
            <p className="mb-7 mt-4 font-manrope text-[15px] leading-6 text-warm-body">
              Log back in to keep your inbox on autopilot.
            </p>
            <div className="flex flex-col gap-4">
              {[
                "Your dashboard, exactly as you left it",
                "Every conversation in one place",
                "Human escalation is always one click away",
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
            <h1 className="font-display text-3xl italic text-ink">Welcome back</h1>
            <p className="mt-2.5 font-manrope text-sm text-warm-body">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          {resetBanner && (
            <p className="mb-4 rounded-lg border border-sage/30 bg-sage/10 px-3 py-2 font-manrope text-sm text-sage">
              Your password was updated. Log in with your new password.
            </p>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block font-manrope text-sm font-semibold text-ink">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-manrope text-sm font-semibold text-ink">Password</label>
                <Link
                  href="/forgot-password"
                  className="font-manrope text-sm text-terracotta hover:text-terracotta-dark"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-terracotta py-3.5 font-manrope text-[15px] font-bold text-cream transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-terracotta-dark hover:shadow-[0_10px_20px_-10px_rgba(190,91,55,.6)] active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          {process.env.NODE_ENV !== "production" && (
            <div className="mt-4 rounded-xl border border-dashed border-amber-400 bg-amber-50/80 p-3.5 text-center">
              <p className="font-manrope text-xs font-semibold text-amber-900">
                🛠️ Local Dev Mode Active
              </p>
              <p className="mt-1 font-manrope text-[11px] text-amber-800">
                MySQL offline? Click below to bypass login and test the bot immediately.
              </p>
              <button
                type="button"
                onClick={handleDevBypass}
                className="mt-2.5 w-full rounded-lg bg-amber-600 px-4 py-2 font-manrope text-xs font-bold text-white transition-colors hover:bg-amber-700 active:scale-[.98]"
              >
                ⚡ Bypass Login & Test Chatbot
              </button>
            </div>
          )}

          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={handleClearData}
              className="font-manrope text-xs text-warm-muted underline hover:text-ink"
            >
              Clear saved data
            </button>
          </p>
          <p className="mt-2 text-center font-manrope text-xs text-warm-muted">
            By logging in, you agree to our{" "}
            <Link href="/terms" className="text-terracotta hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-terracotta hover:underline">
              Privacy Policy
            </Link>
            .
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-cream text-warm-muted">Loading…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
