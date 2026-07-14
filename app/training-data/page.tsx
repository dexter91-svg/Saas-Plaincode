"use client";

import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import TrainingDataContent from "./TrainingDataContent";

export default function TrainingDataPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <p className="text-slate-400">Loading…</p>
          </div>
        </AppShell>
      }
    >
      <AppShell>
        <TrainingDataContent />
      </AppShell>
    </Suspense>
  );
}
