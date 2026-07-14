"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import Button from "@/components/Button";
import ChatWidget from "@/components/ChatWidget";

const PRODUCTS = [
  { name: "Classic Tee", price: "$29" },
  { name: "Canvas Tote", price: "$45" },
  { name: "Everyday Hoodie", price: "$68" },
];

export default function DemoWebsitePage() {
  return (
    <AppShell>
      <div className="relative min-h-[calc(100vh-56px)] w-full bg-gradient-to-b from-stone-100 via-white to-stone-50 text-slate-900">
        <header className="border-b border-stone-200/80 bg-white/90 px-4 py-4 backdrop-blur-sm sm:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <span className="text-lg font-semibold tracking-tight text-slate-900">Demo Outfitters</span>
            <nav className="hidden gap-6 text-sm text-slate-600 sm:flex" aria-label="Demo navigation">
              <span className="cursor-default">Shop</span>
              <span className="cursor-default">About</span>
              <span className="cursor-default">Contact</span>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-700/90">Sample storefront</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Preview how Plainbot looks on a store
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            This page imitates a simple product page. Use the chat button in the corner — same behaviour as when you paste
            the snippet on your real site.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {PRODUCTS.map((p) => (
              <article
                key={p.name}
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-stone-200 to-stone-100" aria-hidden />
                <div className="p-4">
                  <h2 className="font-semibold text-slate-900">{p.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{p.price}</p>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-lg border border-stone-300 bg-white py-2 text-sm font-medium text-slate-800"
                    disabled
                  >
                    Add to cart
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-4 text-sm text-amber-950 sm:px-6">
            <p>
              <strong>Not your real catalog.</strong> Connect your store under{" "}
              <Link href="/create-bot" className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-800">
                Connect your store
              </Link>{" "}
              so the assistant answers from your products and policies.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/integration">
              <Button variant="primary">Integration & snippet</Button>
            </Link>
            <Link href="/test-chatbot">
              <Button variant="outline">Full test chatbot</Button>
            </Link>
          </div>
        </main>

        <ChatWidget embed />
      </div>
    </AppShell>
  );
}
