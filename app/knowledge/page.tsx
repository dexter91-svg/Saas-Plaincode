"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import StepIndicator from "@/components/StepIndicator";
import UploadedDocsList from "@/components/UploadedDocsList";
import { useRouter } from "next/navigation";
import { useBot } from "@/components/BotContext";

export default function KnowledgePage() {
  const router = useRouter();
  const { chatbotId, setChatbotId } = useBot();

  useEffect(() => {
    if (chatbotId) return;
    fetch("/api/chatbots/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.chatbot?.id) setChatbotId(data.chatbot.id);
      })
      .catch(() => {});
  }, [chatbotId, setChatbotId]);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [docsRefresh, setDocsRefresh] = useState(0);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError("Choose one or more files first");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const formData = new FormData();
      for (const f of selectedFiles) {
        formData.append("files", f);
      }
      if (chatbotId) formData.append("chatbotId", chatbotId);
      const res = await fetch("/api/knowledge/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(typeof data.error === "string" ? data.error : "Upload failed");
        return;
      }
      const msg =
        typeof data.message === "string"
          ? data.message
          : typeof data.warning === "string"
            ? data.warning
            : "Upload complete";
      setUploadSuccess(msg);
      setSelectedFiles([]);
      setDocsRefresh((n) => n + 1);
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StepIndicator currentStep={4} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">
            Step 4: Knowledge & memory
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">
            Knowledge & memory
          </h1>
          <p className="mt-2 text-slate-400">
            Optional: upload documents and we keep conversation context automatically.
          </p>
        </div>

        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Upload documents (optional)
          </h2>
          <p className="text-sm text-slate-400">
            Upload one or many PDFs or TXT files in one go (total size up to 4 MB per request — hosting limit). Each file
            is stored separately; the AI sees all of them together with your scraped store content. Remove a file below
            if you no longer want it in context.
          </p>
          <div className="rounded-lg border border-dashed border-slate-600 bg-slate-900/50 p-4 space-y-3">
            <input
              type="file"
              multiple
              accept=".pdf,.txt,application/pdf,text/plain"
              className="block w-full text-sm text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-primary-500/20 file:px-3 file:py-2 file:text-primary-400"
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                setSelectedFiles(list);
                setUploadError(null);
                setUploadSuccess(null);
              }}
            />
            {selectedFiles.length > 0 && (
              <p className="text-xs text-slate-400">
                Selected: {selectedFiles.map((f) => f.name).join(", ")}
              </p>
            )}
            <Button
              type="button"
              variant="secondary"
              disabled={uploading || selectedFiles.length === 0}
              onClick={handleUpload}
            >
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            {uploadSuccess && (
              <p className="text-xs text-emerald-400">{uploadSuccess}</p>
            )}
            {uploadError && (
              <p className="text-xs text-amber-400">{uploadError}</p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-medium text-slate-300">Uploaded for this chatbot</h3>
            <UploadedDocsList chatbotId={chatbotId} refreshTrigger={docsRefresh} />
          </div>
        </Card>

        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-100">
            Conversation memory
          </h2>
          <p className="text-sm text-slate-400">
            We store the last messages and send them with each request so the AI has context. No setup needed.
          </p>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5 space-y-2">
          <h2 className="text-sm font-semibold text-amber-200">
            Low confidence
          </h2>
          <p className="text-sm text-slate-300">
            If the AI isn’t sure, it connects the customer to support instead of guessing.
          </p>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" onClick={() => router.push("/bot-preview")}>
            Back to preview
          </Button>
          <Button variant="primary" onClick={() => router.push("/integration")}>
            Continue to integration
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
