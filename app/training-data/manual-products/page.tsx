"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import WizardHeader from "@/components/WizardHeader";
import { useBot } from "@/components/BotContext";
import { WIZARD_CARD_CLASS, WIZARD_PRIMARY_BUTTON_CLASS, WIZARD_OUTLINE_BUTTON_CLASS } from "@/lib/wizard-ui";

const ACCEPT_IMAGES = "image/png,image/jpeg,image/jpg,image/webp";
const MAX_IMAGES = 10;
const MAX_FILE_MB = 5;

function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, base64] = result.split(",");
      const mime = header?.match(/data:([^;]+)/)?.[1] || "image/jpeg";
      resolve({ data: base64 || "", mimeType: mime });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ManualProductsPage() {
  const router = useRouter();
  const { scrapedData, setScrapedData } = useBot();
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(
      (f) => f.size <= MAX_FILE_MB * 1024 * 1024 && /\.(png|jpe?g|webp)$/i.test(f.name)
    );
    setUploadedFiles((prev) => [...prev, ...valid].slice(0, MAX_IMAGES));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedDescription = description.trim();
    const imageUrlList = imageUrls
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (!trimmedDescription && imageUrlList.length === 0 && uploadedFiles.length === 0) {
      setError("Add a short description, upload images (PNG/JPG), or paste at least one image URL.");
      return;
    }

    setLoading(true);
    try {
      const imagesBase64 =
        uploadedFiles.length > 0
          ? await Promise.all(uploadedFiles.map((f) => fileToBase64(f)))
          : [];

      const res = await fetch("/api/manual-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: trimmedDescription,
          imageUrls: imageUrlList,
          images: imagesBase64,
          url: scrapedData?.url ?? null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Failed to analyze products. Please try again.");
        setLoading(false);
        return;
      }

      const products = Array.isArray(body.products) ? body.products : [];
      const content = typeof body.content === "string" ? body.content : "";

      setScrapedData({
        url: scrapedData?.url ?? "",
        title: scrapedData?.title ?? "",
        description: scrapedData?.description ?? "",
        content: content || scrapedData?.content || "",
        products,
      });

      router.push("/training-data");
    } catch (err) {
      console.error("Manual products submit error:", err);
      setError("Something went wrong while analyzing products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <WizardHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="group mb-4 inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 font-manrope text-sm font-semibold text-warm-muted transition-colors hover:bg-ink/[.05] hover:text-terracotta"
        >
          <svg
            className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to training data
        </button>

        <div className={`${WIZARD_CARD_CLASS} space-y-4`}>
          <div>
            <h1 className="font-display text-3xl italic text-ink">Describe your products</h1>
            <p className="mt-1.5 font-manrope text-sm text-warm-body">
              We couldn&apos;t automatically detect a product feed for this store. Tell us about
              your main products and (optionally) paste image URLs. We&apos;ll use AI to turn this
              into a product inventory for your chatbot.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block font-manrope text-sm font-semibold text-ink">
                Product description
              </label>
              <p className="mb-1.5 font-manrope text-xs text-warm-muted">
                In a few sentences or bullet points, describe what you sell and your key products.
                For example: &quot;We sell custom gaming PCs, mechanical keyboards, and headsets
                aimed at competitive gamers.&quot;
              </p>
              <textarea
                className="min-h-[140px] w-full rounded-[10px] border border-ink/[.15] bg-cream px-3.5 py-3 font-manrope text-sm text-ink placeholder:text-warm-muted/70 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                placeholder="List your main products, categories, best-sellers, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block font-manrope text-sm font-semibold text-ink">
                Upload images (optional)
              </label>
              <p className="mb-1.5 font-manrope text-xs text-warm-muted">
                PNG or JPG, up to {MAX_IMAGES} images, {MAX_FILE_MB}MB each. AI will analyze them to
                build your product list.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_IMAGES}
                multiple
                className="sr-only"
                id="product-images"
                onChange={handleFileChange}
              />
              <label
                htmlFor="product-images"
                className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-ink/[.2] bg-cream px-4 py-6 font-manrope text-sm text-warm-body transition hover:border-terracotta/50 hover:bg-white hover:text-ink"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Choose PNG or JPG files
              </label>
              {uploadedFiles.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {uploadedFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-ink/[.08] bg-cream px-3 py-2 font-manrope text-xs text-ink"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="ml-2 text-red-500 hover:text-red-600"
                        aria-label="Remove"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="mb-1.5 block font-manrope text-sm font-semibold text-ink">
                Or paste image URLs (optional)
              </label>
              <p className="mb-1.5 font-manrope text-xs text-warm-muted">
                One URL per line if your product images are already hosted online.
              </p>
              <textarea
                className="min-h-[80px] w-full rounded-[10px] border border-ink/[.15] bg-cream px-3.5 py-3 font-manrope text-sm text-ink placeholder:text-warm-muted/70 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                placeholder="https://example.com/images/product-1.jpg"
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-manrope text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/training-data")}
                className={`${WIZARD_OUTLINE_BUTTON_CLASS} px-5 py-2.5 text-sm`}
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} className={`${WIZARD_PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-sm`}>
                {loading ? "Analyzing…" : "Generate product inventory"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

