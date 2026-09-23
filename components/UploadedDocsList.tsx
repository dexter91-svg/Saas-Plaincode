"use client";

import { useCallback, useEffect, useState } from "react";

type DocRow = { id: string; fileName: string; createdAt: string };

export default function UploadedDocsList({
  chatbotId,
  refreshTrigger = 0,
  light = false,
  onCountChange,
}: {
  chatbotId: string | null;
  refreshTrigger?: number;
  /** Cream/white styling for the light-themed wizard pages, instead of the default dark app theme. */
  light?: boolean;
  /** Called whenever the loaded document count changes (including the initial load). */
  onCountChange?: (count: number) => void;
}) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = chatbotId ? `?chatbotId=${encodeURIComponent(chatbotId)}` : "";
    try {
      const r = await fetch(`/api/knowledge/documents${q}`);
      const d = await r.json();
      const rows = Array.isArray(d.documents) ? d.documents : [];
      setDocs(rows);
      onCountChange?.(rows.length);
    } catch {
      setDocs([]);
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [chatbotId, onCountChange]);

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatbotId, refreshTrigger]);

  async function removeDoc(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/knowledge/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <p className={`font-manrope text-xs ${light ? "text-warm-muted" : "text-slate-500"}`}>
        Loading uploaded documents…
      </p>
    );
  }
  if (docs.length === 0) {
    return (
      <p className={`font-manrope text-xs ${light ? "text-warm-muted" : "text-slate-500"}`}>
        No uploaded documents yet.
      </p>
    );
  }

  return (
    <ul className={`space-y-2 text-xs ${light ? "font-manrope text-warm-body" : "text-slate-300"}`}>
      {docs.map((d) => (
        <li
          key={d.id}
          className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
            light ? "border-ink/[.12] bg-white" : "border-slate-700 bg-slate-800/50"
          }`}
        >
          <span
            className={`min-w-0 truncate font-medium ${light ? "text-ink" : "text-slate-200"}`}
            title={d.fileName}
          >
            {d.fileName}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            {d.createdAt && (
              <span className={light ? "text-warm-muted" : "text-slate-500"}>
                {new Date(d.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </span>
            )}
            <button
              type="button"
              className={`disabled:opacity-50 ${light ? "text-red-500 hover:text-red-600" : "text-red-400 hover:text-red-300"}`}
              disabled={deleting === d.id}
              onClick={() => removeDoc(d.id)}
            >
              {deleting === d.id ? "…" : "Remove"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
