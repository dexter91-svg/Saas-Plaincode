"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";

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
  success: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-red-500/15 text-red-400",
  timeout: "bg-amber-500/15 text-amber-400",
  captcha: "bg-orange-500/15 text-orange-400",
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
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Crawl Logs</h1>
            <p className="mt-1 text-slate-400">Every website scan attempt — status, products found, and any errors.</p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/50"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Card className="mt-6 p-0 overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-slate-400">Loading logs...</p>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-400">No crawl logs yet.</p>
              <p className="mt-1 text-sm text-slate-500">Logs appear here after you analyze a website URL.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700/80 text-sm">
                <thead className="bg-slate-900/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">URL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Products</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Error</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/80 bg-slate-900/40">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20">
                      <td className="px-4 py-3 max-w-[220px]">
                        <span
                          className="block truncate font-mono text-xs text-slate-300"
                          title={log.url}
                        >
                          {log.url.replace(/^https?:\/\//, "")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[log.status]}`}>
                          {STATUS_LABELS[log.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {log.productsFound > 0 ? log.productsFound : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {formatDuration(log.durationMs)}
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        {log.errorMessage ? (
                          <span className="text-xs text-red-400 leading-relaxed line-clamp-3">
                            {log.errorMessage}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
