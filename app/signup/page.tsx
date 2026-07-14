"use client";

import Link from "next/link";
import { FormEvent, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";
import Logo from "@/components/Logo";
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
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary-400 hover:text-primary-300">
              Log in
            </Link>
          </p>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6 sm:py-12 lg:px-8">
        <Card className="w-full max-w-md p-6 shadow-soft-lg sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-100">Create your account</h1>
            <p className="mt-2 text-slate-400">
              {plan === "free"
                ? "Free forever — no card to start. This isn’t a trial that expires."
                : "Create your account, then continue to checkout or your dashboard."}
            </p>
            {plan === "growth" && (
              <p className="mt-2 text-sm text-primary-400 font-medium">
                You’re signing up for Growth ($79/month, card required after signup).
              </p>
            )}
            {plan === "pro" && (
              <p className="mt-2 text-sm text-primary-400 font-medium">
                You’re signing up for Pro ($149/month, card required after signup).
              </p>
            )}
            {plan === "agency" && (
              <p className="mt-2 text-sm text-primary-400 font-medium">
                Agency ($299/month) — after signup you&apos;ll complete checkout with Stripe ($299/month), then open your dashboard.
              </p>
            )}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              name="name"
              label="Full Name"
              type="text"
              placeholder="Jane Doe"
              autoComplete="name"
              required
            />
            <Input
              name="email"
              label="Business Email"
              type="email"
              placeholder="jane@company.com"
              autoComplete="email"
              required
            />
            <Input
              name="companyName"
              label="Company Name"
              type="text"
              placeholder="Acme E-commerce"
              autoComplete="organization"
            />
            <Input
              name="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
              required
            />
            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg py-2 pr-1 -my-1">
              <input
                type="checkbox"
                className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 rounded border-slate-600 bg-slate-700 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-400">
                I manage an e-commerce store and agree to the{" "}
                <Link href="/terms" className="text-primary-400 hover:underline">
                  Terms of Service
                </Link>
                .
              </span>
            </label>
            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading
                ? "Creating..."
                : plan === "free"
                  ? "Start free, no card needed"
                  : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-primary-400 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary-400 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>

          <p className="mt-4 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary-400 hover:text-primary-300">
              Log in
            </Link>
          </p>
        </Card>
      </main>

      <footer className="py-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Plainbot. All rights reserved.
      </footer>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-black items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
