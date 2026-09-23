"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [barPct, setBarPct] = useState(0);

  const [selected, setSelected] = useState<string | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/users/store-type").then((r) => r.json()),
      fetch("/api/users/forward-email").then((r) => r.json()),
    ])
      .then(([storeData, emailData]) => {
        if (emailData.forwardEmail) {
          router.replace("/create-bot");
          return;
        }
        if (storeData.storeType) {
          setSelected(storeData.storeType);
          setStep(2);
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBarPct(step === 1 ? 50 : 100));
    return () => cancelAnimationFrame(id);
  }, [step]);

  const selectStoreType = async (id: string) => {
    setSelected(id);
    setStoreError(null);
    setStep(2);
    try {
      const res = await fetch("/api/users/store-type", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeType: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setStoreError(data.error || "Failed to save. Try again.");
        setStep(1);
      }
    } catch {
      setStoreError("Failed to save. Try again.");
      setStep(1);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailError(null);
    setSavingEmail(true);
    try {
      const res = await fetch("/api/users/forward-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forwardEmail: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "Failed to save.");
        setSavingEmail(false);
        return;
      }
      router.push("/create-bot");
    } catch {
      setEmailError("Failed to save. Try again.");
      setSavingEmail(false);
    }
  };

  const gradientBg = {
    backgroundImage:
      "radial-gradient(120% 70% at 15% 0%, #F3E3D6 0%, #FBF7F2 55%)",
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream" style={gradientBg}>
        <p className="font-manrope text-warm-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream" style={gradientBg}>
      <header className="px-[6vw] py-[18px]">
        <Link href="/" className="font-display text-2xl italic text-ink no-underline hover:text-ink">
          Plainbot
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6 sm:py-12 lg:px-8">
        <div className="w-full max-w-2xl pb-8">
          <div className="mb-8 flex flex-col items-center gap-3">
            <span className="font-manrope text-xs font-bold uppercase tracking-wider text-terracotta">
              Step {step} of 2
            </span>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-terracotta/15">
              <div
                className="h-full rounded-full bg-terracotta transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${barPct}%` }}
              />
            </div>
          </div>

          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)] motion-reduce:transition-none"
              style={{ transform: `translateX(-${(step - 1) * 100}%)` }}
            >
              {/* Step 1: store type */}
              <div className="w-full shrink-0 px-1">
                <div className="mb-8 text-center">
                  <h1 className="font-display text-3xl italic text-ink sm:text-4xl">
                    What is your e-commerce store?
                  </h1>
                  <p className="mt-2.5 font-manrope text-sm text-warm-body">
                    We&apos;ll show the right way to connect based on your platform.
                  </p>
                </div>

                <div className="space-y-3">
                  {STORE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => selectStoreType(opt.id)}
                      className={`w-full rounded-xl border bg-white p-4 text-left transition-all active:opacity-90 sm:p-6 ${
                        selected === opt.id
                          ? "border-terracotta shadow-[0_0_0_1px_#BE5B37]"
                          : "border-ink/[.12] hover:border-ink/25"
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <span className="shrink-0 text-terracotta">{opt.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-manrope font-semibold text-ink">{opt.label}</p>
                          <p className="mt-1 font-manrope text-sm text-warm-body">{opt.description}</p>
                        </div>
                        {selected === opt.id && (
                          <span className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-terracotta text-cream">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {storeError && (
                  <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-manrope text-sm text-red-600">
                    {storeError}
                  </p>
                )}
              </div>

              {/* Step 2: forwarding email */}
              <div className="w-full shrink-0 px-1">
                <div className="mx-auto w-full max-w-md">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="group mb-6 inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 font-manrope text-sm font-semibold text-warm-muted transition-colors hover:bg-ink/[.05] hover:text-terracotta"
                  >
                    <svg
                      className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>

                  <div className="mb-8 text-center">
                    <h1 className="font-display text-3xl italic text-ink sm:text-4xl">
                      Where should we send forwarded conversations?
                    </h1>
                    <p className="mt-2.5 font-manrope text-sm text-warm-body">
                      When the AI can&apos;t help (e.g. order cancellation), we&apos;ll forward the full
                      conversation to this email. You can reply and the customer will see it in chat.
                    </p>
                  </div>

                  <div className="rounded-xl border border-ink/[.12] bg-white p-6">
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                      <label className="block">
                        <span className="block font-manrope text-sm font-semibold text-ink">
                          Support email
                        </span>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="support@yourstore.com"
                          autoComplete="email"
                          enterKeyHint="done"
                          inputMode="email"
                          className="mt-1.5 w-full rounded-[10px] border border-ink/[.15] bg-white px-3.5 py-3 font-manrope text-sm text-ink placeholder:text-warm-muted/70 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                          required
                        />
                      </label>
                      {emailError && (
                        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-manrope text-sm text-red-600">
                          {emailError}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={savingEmail}
                        className="w-full rounded-full bg-terracotta py-3.5 font-manrope text-[15px] font-bold text-cream transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-terracotta-dark hover:shadow-[0_10px_20px_-10px_rgba(190,91,55,.6)] active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"
                      >
                        {savingEmail ? "Saving..." : "Continue"}
                      </button>
                    </form>
                  </div>

                  <p className="mt-4 text-center font-manrope text-sm text-warm-muted">
                    You can change this later in Settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
