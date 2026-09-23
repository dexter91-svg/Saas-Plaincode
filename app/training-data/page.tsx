"use client";

import { Suspense } from "react";
import WizardHeader from "@/components/WizardHeader";
import TrainingDataContent from "./TrainingDataContent";

export default function TrainingDataPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream">
          <WizardHeader />
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
            <p className="font-manrope text-warm-muted">Loading…</p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-cream">
        <WizardHeader />
        <TrainingDataContent />
      </div>
    </Suspense>
  );
}
