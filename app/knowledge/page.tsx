"use client";

import { useState, useEffect } from "react";
import StepIndicator from "@/components/StepIndicator";
import WizardHeader from "@/components/WizardHeader";
import UploadedDocsList from "@/components/UploadedDocsList";
import { useRouter } from "next/navigation";
import { useBot } from "@/components/BotContext";
import { WIZARD_PRIMARY_BUTTON_CLASS, WIZARD_CARD_CLASS } from "@/lib/wizard-ui";

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
  const [docsRefresh, setDocsRefresh] = useState(0);
  const [docCount, setDocCount] = useState<number | null>(null);
  const hasDocs = (docCount ?? 0) > 0;

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const formData = new FormData();
      for (const f of files) {
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
      setDocsRefresh((n) => n + 1);
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <WizardHeader />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <StepIndicator currentStep={4} />

        <div className="mt-8 text-center">
          <h1 className="font-display text-3xl text-ink sm:text-4xl">Anything else it should know?</h1>
          <p className="mt-2 font-manrope text-sm text-warm-body">
            Optional. Upload a price list, a size guide, anything customers ask about.
          </p>
        </div>

        <div className={`mt-6 ${WIZARD_CARD_CLASS} text-center`}>
          <label className={`${WIZARD_PRIMARY_BUTTON_CLASS} cursor-pointer ${uploading ? "pointer-events-none opacity-50" : ""}`}>
            {uploading ? "Uploading…" : "Upload a document"}
            <input
              type="file"
              multiple
              accept=".pdf,.txt,application/pdf,text/plain"
              disabled={uploading}
              className="hidden"
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                e.target.value = "";
                void handleFilesSelected(list);
              }}
            />
          </label>
          <p className="mt-2 font-manrope text-xs text-warm-muted">PDF or text file, up to 4MB total</p>
          {uploadSuccess && <p className="mt-3 font-manrope text-xs text-sage">{uploadSuccess}</p>}
          {uploadError && <p className="mt-3 font-manrope text-xs text-red-600">{uploadError}</p>}
        </div>

        <div className="mt-4">
          <UploadedDocsList
            chatbotId={chatbotId}
            refreshTrigger={docsRefresh}
            light
            onCountChange={setDocCount}
          />
        </div>

        <button
          type="button"
          onClick={() => router.push("/integration")}
          disabled={!hasDocs}
          title={hasDocs ? undefined : "Upload a document first, or use “Skip this step” below."}
          className={`${WIZARD_PRIMARY_BUTTON_CLASS} mt-6 w-full`}
        >
          Continue to Install Widget
        </button>
        {!hasDocs && docCount !== null && (
          <p className="mt-2 text-center font-manrope text-xs text-warm-muted">
            Upload a document to continue, or skip this step.
          </p>
        )}
        <p className="mt-3 text-center font-manrope text-sm text-warm-muted">
          Nothing to add?{" "}
          <button
            type="button"
            onClick={() => router.push("/integration")}
            className="font-semibold text-terracotta hover:text-terracotta-dark"
          >
            Skip this step
          </button>
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className={WIZARD_CARD_CLASS}>
            <h3 className="font-manrope text-sm font-semibold text-ink">Conversation memory</h3>
            <p className="mt-1 font-manrope text-xs text-warm-muted">
              We store the last messages and send them with each request so the AI has context. No setup needed.
            </p>
          </div>
          <div className={`${WIZARD_CARD_CLASS} border-amber-200 bg-amber-50`}>
            <h3 className="font-manrope text-sm font-semibold text-amber-800">Low confidence</h3>
            <p className="mt-1 font-manrope text-xs text-amber-700">
              If the AI isn&apos;t sure, it connects the customer to support instead of guessing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
