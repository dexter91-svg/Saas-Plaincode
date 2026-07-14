import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import pdfParse from "pdf-parse";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";
import { reindexChatbot } from "@/lib/rag";

const ALLOWED_TYPES = ["application/pdf", "text/plain"];
const ALLOWED_EXT = [".pdf", ".txt"];
/** Total request body must stay within typical serverless limits (e.g. Vercel ~4.5 MB). */
const MAX_BATCH_BYTES = 4 * 1024 * 1024;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 20;
const MAX_TEXT_LENGTH = 200_000;

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = (file.name || "").toLowerCase();

  if (name.endsWith(".txt") || file.type === "text/plain") {
    return buffer.toString("utf-8").slice(0, MAX_TEXT_LENGTH);
  }

  const data = await pdfParse(buffer);
  return (data?.text || "").slice(0, MAX_TEXT_LENGTH);
}

function collectFiles(formData: FormData): File[] {
  const multi = formData.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
  if (multi.length > 0) return multi;
  const one = formData.get("file");
  if (one instanceof File && one.size > 0) return [one];
  return [];
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = checkRateLimit(req, "upload", LIMITS.upload);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Try again in a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const formData = await req.formData();
    const files = collectFiles(formData);
    const requestedBotId =
      typeof formData.get("chatbotId") === "string" ? (formData.get("chatbotId") as string).trim() : "";

    if (files.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Too many files (max ${MAX_FILES} at once).` }, { status: 400 });
    }

    let total = 0;
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `Each file must be 4 MB or smaller (${file.name}).` },
          { status: 400 }
        );
      }
      total += file.size;
    }
    if (total > MAX_BATCH_BYTES) {
      return NextResponse.json(
        {
          error:
            "Total upload size exceeds 4 MB (hosting limit). Upload fewer or smaller files, or split into two batches.",
        },
        { status: 400 }
      );
    }

    for (const file of files) {
      const name = (file.name || "").toLowerCase();
      const okType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.some((ext) => name.endsWith(ext));
      if (!okType) {
        return NextResponse.json({ error: `Not allowed: ${file.name} (only PDF and TXT).` }, { status: 400 });
      }
    }

    const extracted: { name: string; text: string }[] = [];
    for (const file of files) {
      const text = await extractTextFromFile(file);
      if (!text || !text.trim()) {
        return NextResponse.json(
          { error: `No text could be extracted from: ${file.name}` },
          { status: 400 }
        );
      }
      extracted.push({ name: file.name || "document", text: text.trim() });
    }

    const conn = await getDbConnection();
    let chatbotId: string | null = null;
    if (requestedBotId) {
      const [owned] = await conn.execute(
        "SELECT id FROM chatbots WHERE id = ? AND user_id = ?",
        [requestedBotId, auth.userId]
      );
      if ((owned as { id: string }[]).length > 0) chatbotId = requestedBotId;
    }
    if (!chatbotId) {
      const [rows] = await conn.execute(
        "SELECT id FROM chatbots WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        [auth.userId]
      );
      const bots = rows as { id: string }[];
      if (bots.length > 0) chatbotId = bots[0].id;
    }

    if (!chatbotId) {
      await conn.end();
      return NextResponse.json({ error: "No chatbot found. Create a bot first (e.g. connect your store)." }, { status: 400 });
    }

    try {
      await conn.beginTransaction();
      const saved: { id: string; fileName: string }[] = [];
      for (const item of extracted) {
        const id = randomUUID();
        const safeName = item.name.slice(0, 500);
        await conn.execute(
          "INSERT INTO chatbot_documents (id, chatbot_id, file_name, content) VALUES (?, ?, ?, ?)",
          [id, chatbotId, safeName, item.text]
        );
        saved.push({ id, fileName: safeName });
      }
      await conn.commit();
      try {
        await reindexChatbot(conn, chatbotId);
      } catch (e) {
        console.error("[RAG] reindex after upload:", e);
      }
      await conn.end();

      return NextResponse.json({
        ok: true,
        count: saved.length,
        saved,
        message:
          saved.length === 1
            ? "Document saved. The AI will use it together with your scraped store content."
            : `${saved.length} documents saved. The AI will use them together with your scraped store content.`,
      });
    } catch (insertErr: unknown) {
      await conn.rollback().catch(() => {});
      await conn.end();
      const e = insertErr as { code?: string };
      if (e?.code === "ER_NO_SUCH_TABLE") {
        return NextResponse.json(
          {
            error:
              "Database is not migrated. Run: npm run db:migrate (or node scripts/migrate.js) on the server, then try again.",
          },
          { status: 503 }
        );
      }
      throw insertErr;
    }
  } catch (err: unknown) {
    console.error("Upload error:", err);
    const isProd = process.env.NODE_ENV === "production";
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: isProd
          ? "Upload failed. Use text-based PDFs or TXT under 4 MB total, or try again."
          : detail || "Upload failed",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
