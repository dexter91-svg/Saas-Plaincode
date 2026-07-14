"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";
import Logo from "@/components/Logo";
import { resetBotStorageForNewAccount } from "@/lib/bot-local-storage";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex flex-col bg-black">
      <header className="border-b border-slate-800 bg-black">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 text-slate-100">
            <Logo size="md" />
            <span className="text-base font-semibold sm:text-lg">
              Plainbot
            </span>
          </Link>
          <p className="text-sm text-slate-400 sm:text-right">
            Don&apos;t have an account?{" "}
            <Link href="/signup?plan=free" className="font-medium text-primary-400 hover:text-primary-300">
              Sign up
            </Link>
          </p>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6 sm:py-12 lg:px-8">
        <Card className="w-full max-w-md p-6 shadow-soft-lg sm:p-8">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-slate-100">
              <Logo size="sm" />
              <span className="font-semibold">Plainbot</span>
            </Link>
            <h1 className="mt-6 text-2xl font-bold text-slate-100">Welcome back</h1>
            <p className="mt-2 text-slate-400">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          {resetBanner && (
            <p className="mb-4 text-sm text-emerald-300/90 bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-3 py-2">
              Your password was updated. Log in with your new password.
            </p>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary-400 hover:text-primary-300"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={handleClearData}
              className="text-xs text-slate-500 hover:text-slate-400 underline"
            >
              Clear saved data
            </button>
          </p>
          <p className="mt-2 text-center text-xs text-slate-500">
            By logging in, you agree to our{" "}
            <Link href="/terms" className="text-primary-400 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary-400 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </Card>
      </main>

      <footer className="py-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Plainbot. All rights reserved.
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black text-slate-400">Loading…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
