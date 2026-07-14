"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Logo from "@/components/Logo";

const STORE_OPTIONS = [
  {
    id: "shopify",
    label: "Shopify",
    description: "One-click app install. Connect your Shopify store in seconds.",
    icon: (
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
        <Image src="/logo-shopify.png" alt="Shopify" width={40} height={40} className="object-contain" />
      </span>
    ),
  },
  {
    id: "woocommerce",
    label: "WooCommerce",
    description: "WordPress store. Use our snippet to connect.",
    icon: (
      <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
  },
  {
    id: "custom",
    label: "Custom / Other",
    description: "Add our snippet to any website. Works with any e-commerce platform.",
    icon: (
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9a9 9 0 009-9m-9 9a9 9 0 009 9m-9-9a9 9 0 009-9" />
      </svg>
    ),
  },
] as const;

export default function StoreTypePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/users/store-type")
      .then((r) => r.json())
      .then((data) => {
        if (data.storeType) {
          router.replace("/onboarding/forward-email");
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  const handleSubmit = async () => {
    if (!selected) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users/store-type", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeType: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save.");
        setLoading(false);
        return;
      }
      router.push("/onboarding/forward-email");
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
        <div className="w-full max-w-2xl pb-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
              What is your e-commerce store?
            </h1>
            <p className="mt-2 text-slate-400">
              We’ll show the right way to connect based on your platform.
            </p>
          </div>

          <div className="space-y-3">
            {STORE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelected(opt.id)}
                className={`w-full rounded-xl border p-4 text-left transition-all active:opacity-90 sm:p-6 ${
                  selected === opt.id
                    ? "border-primary-500 bg-primary-500/10"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="shrink-0 text-primary-400">{opt.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-100">{opt.label}</p>
                    <p className="mt-1 text-sm text-slate-400">{opt.description}</p>
                  </div>
                  {selected === opt.id && (
                    <span className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            variant="primary"
            fullWidth
            className="mt-6"
            disabled={!selected || loading}
            onClick={handleSubmit}
          >
            {loading ? "Continuing..." : "Continue"}
          </Button>
        </div>
      </main>
    </div>
  );
}
