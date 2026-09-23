"use client";

import AppShell from "@/components/AppShell";
import { WIZARD_CARD_CLASS, WIZARD_OUTLINE_BUTTON_CLASS } from "@/lib/wizard-ui";

export default function HandoffRulesPage() {
  return (
    <AppShell>
      <div className="min-h-full bg-cream">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-[28px] text-ink">Human handoff logic</h1>
              <p className="mt-1.5 font-manrope text-sm text-warm-body">
                Define when your Plainbot should gracefully hand conversations
                to a human agent.
              </p>
            </div>
            <div className="flex items-center gap-2 font-manrope text-xs text-warm-muted">
              <span className="inline-flex h-2 w-2 rounded-full bg-sage" />
              <span>System active</span>
            </div>
          </header>

          <section className="space-y-3.5">
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
              <div key={rule.title} className={`flex items-center justify-between ${WIZARD_CARD_CLASS} !p-5`}>
                <div className="space-y-1">
                  <p className="font-manrope text-sm font-bold text-ink">{rule.title}</p>
                  <p className="font-manrope text-xs text-warm-muted">{rule.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-manrope text-[11px] font-semibold text-warm-body">
                    {rule.action}
                  </p>
                  <div
                    className={`relative inline-flex h-5 w-9 items-center rounded-full ${
                      rule.enabled ? "bg-terracotta" : "bg-ink/[.15]"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        rule.enabled ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <div className={WIZARD_CARD_CLASS}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-manrope text-sm font-bold text-ink">After-hours protocol</p>
                <p className="mt-1 font-manrope text-xs text-warm-muted">
                  When your human team is away, the assistant switches to lead‑capture
                  mode automatically instead of escalating.
                </p>
              </div>
              <button type="button" className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-5 py-2.5 text-sm`}>
                Configure availability
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

