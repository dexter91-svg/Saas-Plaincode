"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { WIZARD_CARD_CLASS, WIZARD_OUTLINE_BUTTON_CLASS } from "@/lib/wizard-ui";

type CrawlLog = {
  id: string;
  url: string;
  status: "success" | "failed" | "timeout" | "captcha";
  storeType: string | null;
  productsFound: number;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
};

const STATUS_STYLES: Record<CrawlLog["status"], string> = {
  success: "bg-sage/10 text-sage",
  failed: "bg-red-100 text-red-600",
  timeout: "bg-amber-100 text-amber-700",
  captcha: "bg-terracotta/10 text-terracotta",
};

const STATUS_LABELS: Record<CrawlLog["status"], string> = {
  success: "Success",
  failed: "Failed",
  timeout: "Timed out",
  captcha: "Blocked (CAPTCHA)",
};

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchLogs = () => {
    setLoading(true);
    setError(null);
    const qs = filter !== "all" ? `?status=${filter}` : "";
    fetch(`/api/logs${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        } else {
          setError(data.error || "Failed to load logs");
        }
      })
      .catch(() => setError("Failed to load logs"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const filters = [
    { value: "all", label: "All" },
    { value: "success", label: "Success" },
    { value: "failed", label: "Failed" },
    { value: "timeout", label: "Timed out" },
    { value: "captcha", label: "Blocked" },
  ];

  return (
    <AppShell>
      <div className="min-h-full bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-[28px] text-ink">Crawl Logs</h1>
              <p className="mt-1.5 font-manrope text-sm text-warm-body">
                Every website scan attempt. Status, products found, and any errors.
              </p>
            </div>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className={`${WIZARD_OUTLINE_BUTTON_CLASS} text-xs disabled:opacity-50`}
            >
              Refresh
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full px-3.5 py-1.5 font-manrope text-xs font-bold transition-colors ${
                  filter === f.value
                    ? "bg-ink text-cream"
                    : "bg-peach text-warm-muted hover:bg-peach/70"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-manrope text-sm text-red-600">
              {error}
            </div>
          )}

          <div className={`mt-5 ${WIZARD_CARD_CLASS} !p-0 overflow-hidden`}>
            {loading ? (
              <p className="p-10 text-center font-manrope text-sm text-warm-muted">Loading logs…</p>
            ) : logs.length === 0 ? (
              <div className="p-10 text-center font-manrope text-sm text-warm-muted">
                No crawl logs yet.
                <br />
                Logs appear here after you analyze a website URL.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-ink/[.08] text-sm">
                  <thead className="bg-cream-alt">
                    <tr>
                      <th className="px-4 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">URL</th>
                      <th className="px-4 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Status</th>
                      <th className="px-4 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Products</th>
                      <th className="px-4 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Duration</th>
                      <th className="px-4 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Error</th>
                      <th className="px-4 py-3 text-left font-manrope text-xs font-bold uppercase tracking-wide text-warm-muted">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/[.08]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-cream/60">
                        <td className="max-w-[220px] px-4 py-3">
                          <span className="block truncate font-mono text-xs text-ink" title={log.url}>
                            {log.url.replace(/^https?:\/\//, "")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 font-manrope text-xs font-bold ${STATUS_STYLES[log.status]}`}>
                            {STATUS_LABELS[log.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-manrope text-sm text-ink">
                          {log.productsFound > 0 ? log.productsFound : <span className="text-warm-muted">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-warm-muted">
                          {formatDuration(log.durationMs)}
                        </td>
                        <td className="max-w-[280px] px-4 py-3">
                          {log.errorMessage ? (
                            <span className="line-clamp-3 text-xs leading-relaxed text-red-600">
                              {log.errorMessage}
                            </span>
                          ) : (
                            <span className="text-warm-muted">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-manrope text-xs text-warm-muted">
                          {formatDate(log.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
