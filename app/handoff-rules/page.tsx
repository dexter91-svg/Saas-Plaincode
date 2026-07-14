"use client";

import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default function HandoffRulesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Human handoff logic</h1>
              <p className="mt-2 text-sm text-slate-400">
                Define when your Plainbot should gracefully hand conversations
                to a human agent.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              <span>System active</span>
            </div>
          </header>

          <section className="space-y-4">
            {[
              {
                title: "Customer frustration",
                subtitle:
                  "Automatic handoff if AI detects negative sentiment or repeated queries.",
                action: "Transfer to live agent",
                enabled: true,
              },
              {
                title: "VIP order support",
                subtitle:
                  "Direct human intervention for carts or orders exceeding $500.00.",
                action: "Transfer to VIP team",
                enabled: true,
              },
              {
                title: "Low confidence score",
                subtitle:
                  "Escalate whenever AI confidence falls below 75% on a specific query.",
                action: "Escalate to support",
                enabled: true,
              },
              {
                title: "Refund & returns",
                subtitle:
                  "Mandatory handoff for all refund eligibility checks and return approvals.",
                action: "Transfer to billing",
                enabled: false,
              },
            ].map((rule) => (
              <Card key={rule.title} className="flex items-center justify-between bg-slate-900/80">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-100">{rule.title}</p>
                  <p className="text-xs text-slate-400">{rule.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-[11px] font-medium text-slate-300">
                    {rule.action}
                  </p>
                  <div
                    className={`relative inline-flex h-5 w-9 items-center rounded-full ${
                      rule.enabled ? "bg-primary-500/80" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-black transition-transform ${
                        rule.enabled ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </section>

          <Card className="bg-slate-900/80">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">After-hours protocol</p>
                <p className="mt-1 text-xs text-slate-400">
                  When your human team is away, the assistant switches to lead‑capture
                  mode automatically instead of escalating.
                </p>
              </div>
              <Button variant="secondary">Configure availability</Button>
            </div>
          </Card>
        </div>
    </AppShell>
  );
}

