"use client";

import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default function LandingChatSection() {
  return (
    <section className="relative border-t border-slate-800 bg-gradient-to-b from-black to-slate-950 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
              Try it live
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-100 sm:text-4xl">
              Chat with the AI assistant
            </h2>
            <p className="mt-4 max-w-xl text-lg text-slate-400">
              Sign up and connect your store — the bot will use your products and policies in real time.
              Add our snippet to any custom or WooCommerce site to embed the chatbot.
            </p>
            <div className="mt-8">
              <Link href="/signup?plan=free">
                <Button variant="primary">Start free, no card needed</Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Your live dashboard (after signup)
            </p>
            <Card className="border-primary-500/20 bg-slate-900/80">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                  <span className="text-sm font-semibold text-slate-200">Main Dashboard</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                    <p className="text-xs text-slate-500">Conversations</p>
                    <p className="mt-0.5 font-semibold text-slate-100">0 / 100</p>
                    <p className="text-xs text-slate-400">Real-time from DB</p>
                  </div>
                  <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                    <p className="text-xs text-slate-500">Recent activity</p>
                    <p className="mt-0.5 font-semibold text-slate-100">—</p>
                    <p className="text-xs text-slate-400">Website connected, etc.</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  All conversations from your site and test chat appear here. Change personality
                  and settings in the dashboard — they update in the chatbot on your website.
                </p>
                <div className="pt-6">
                  <Link href="/login" className="inline-block">
                    <Button variant="outline" className="w-full min-w-[200px] px-6 py-3 sm:w-auto">
                      Log in to see your dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
