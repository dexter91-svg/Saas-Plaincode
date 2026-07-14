"use client";

import Link from "next/link";
import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";
import Logo from "@/components/Logo";

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
      <Card className="w-full max-w-md p-6 sm:p-8">
        <p className="text-slate-300">This page needs a valid reset link. Request a new one from Forgot password.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-primary-400 hover:text-primary-300">
          Forgot password
        </Link>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-100">Choose a new password</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Input
          label="New password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" variant="primary" fullWidth disabled={loading}>
          {loading ? "Saving…" : "Update password"}
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <header className="border-b border-slate-800 bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-slate-100">
            <Logo size="md" />
            <span className="text-base font-semibold">Plainbot</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <Suspense fallback={<p className="text-slate-400">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </main>
    </div>
  );
}
