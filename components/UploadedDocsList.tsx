"use client";

import { useCallback, useEffect, useState } from "react";

type DocRow = { id: string; fileName: string; createdAt: string };

export default function UploadedDocsList({
  chatbotId,
  refreshTrigger = 0,
}: {
  chatbotId: string | null;
  refreshTrigger?: number;
}) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = chatbotId ? `?chatbotId=${encodeURIComponent(chatbotId)}` : "";
    try {
      const r = await fetch(`/api/knowledge/documents${q}`);
      const d = await r.json();
      setDocs(Array.isArray(d.documents) ? d.documents : []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [chatbotId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, refreshTrigger]);

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
    return <p className="text-xs text-slate-500">Loading uploaded documents…</p>;
  }
  if (docs.length === 0) {
    return <p className="text-xs text-slate-500">No uploaded documents yet.</p>;
  }

  return (
    <ul className="space-y-2 text-xs text-slate-300">
      {docs.map((d) => (
        <li
          key={d.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2"
        >
          <span className="min-w-0 truncate font-medium text-slate-200" title={d.fileName}>
            {d.fileName}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            {d.createdAt && (
              <span className="text-slate-500">
                {new Date(d.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </span>
            )}
            <button
              type="button"
              className="text-red-400 hover:text-red-300 disabled:opacity-50"
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
