/**
 * RAG: chunk website + document text, embed with OpenAI, store in MySQL, retrieve by cosine at chat time.
 */

import { randomUUID } from "crypto";
import OpenAI from "openai";
import type { PoolConnection } from "mysql2/promise";
import { getMergedUploadedDocsText } from "@/lib/knowledge-documents";

const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

const RAG_ENABLED = process.env.RAG_ENABLED !== "false";

const RAG_TOP_K = Math.min(16, Math.max(3, parseInt(process.env.RAG_TOP_K || "6", 10) || 6));
const RAG_MAX_CHUNKS = Math.min(500, parseInt(process.env.RAG_MAX_CHUNKS || "300", 10) || 300);
const EMBED_BATCH = 24;
const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 180;
const MAX_WEB_FOR_INDEX = 100_000;
const MAX_DOCS_FOR_INDEX = 100_000;
const MAX_CATALOG_CHARS = 12_000;

type SourceType = "website" | "document" | "catalog";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function isRagTableMissingError(e: unknown): boolean {
  return (e as { code?: string })?.code === "ER_NO_SUCH_TABLE";
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d < 1e-12 ? 0 : dot / d;
}

function parseEmbedding(raw: string | number[] | Buffer | null | undefined): number[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((n) => Number(n)).filter((n) => !Number.isNaN(n));
  }
  if (Buffer.isBuffer(raw)) {
    try {
      return JSON.parse(raw.toString("utf-8")) as number[];
    } catch {
      return [];
    }
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) return p.map((n) => Number(n));
    } catch {
      return [];
    }
  }
  return [];
}

/** Overlapping text chunks for embedding */
export function splitTextIntoChunks(text: string, maxLen: number, overlap: number): string[] {
  const t = (text || "").trim();
  if (!t) return [];
  if (t.length <= maxLen) return [t];
  const parts: string[] = [];
  let start = 0;
  while (start < t.length) {
    let end = Math.min(start + maxLen, t.length);
    if (end < t.length) {
      const sub = t.slice(start, end);
      const b = Math.max(sub.lastIndexOf("\n\n"), sub.lastIndexOf(". "));
      if (b > maxLen * 0.25) end = start + b + 2;
    }
    const piece = t.slice(start, end).trim();
    if (piece) parts.push(piece);
    if (end >= t.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return parts;
}

async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const all: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const res = await client.embeddings.create({
      model: embeddingModel,
      input: batch,
    });
    const sorted = [...res.data].sort((a, b) => a.index - b.index);
    for (const d of sorted) {
      if (d.embedding) all.push(d.embedding as number[]);
    }
  }
  if (all.length !== texts.length) {
    throw new Error(`RAG: expected ${texts.length} embeddings, got ${all.length}`);
  }
  return all;
}

async function embedQuery(text: string): Promise<number[]> {
  const res = await client.embeddings.create({
    model: embeddingModel,
    input: text.slice(0, 8000),
  });
  const e = res.data[0]?.embedding;
  if (!e || !Array.isArray(e)) return [];
  return e;
}

type ChunkRow = { content: string; emb: number[] };

export type RagReindexResult = { ok: boolean; chunkCount: number; skipped: boolean; reason?: string };

/**
 * Rebuild all chunks+embeddings for a chatbot from DB (website, PDF/TXT, product names).
 * Idempotent: deletes previous rows for this chatbot first.
 */
export async function reindexChatbot(
  conn: PoolConnection,
  chatbotId: string
): Promise<RagReindexResult> {
  if (!RAG_ENABLED) return { ok: true, chunkCount: 0, skipped: true, reason: "RAG disabled" };
  if (!process.env.OPENAI_API_KEY) {
    return { ok: true, chunkCount: 0, skipped: true, reason: "no OPENAI_API_KEY" };
  }

  let websiteContent: string | null = null;
  let productsJson: string | null = null;
  let legacyUpload: string | null = null;
  try {
    const [rows] = await conn.execute(
      "SELECT website_content AS wc, products_json AS pj, uploaded_docs_text AS udt FROM chatbots WHERE id = ?",
      [chatbotId]
    );
    const r = (rows as { wc: string | null; pj: string | null; udt: string | null }[])[0];
    if (!r) return { ok: false, chunkCount: 0, skipped: true, reason: "chatbot not found" };
    websiteContent = r.wc;
    productsJson = r.pj;
    legacyUpload = r.udt;
  } catch (e) {
    if (isRagTableMissingError(e)) {
      return { ok: true, chunkCount: 0, skipped: true, reason: "RAG table missing" };
    }
    throw e;
  }

  const mergedDocs = (await getMergedUploadedDocsText(conn, chatbotId, legacyUpload)).trim();

  const rowsToInsert: { source: SourceType; label: string; index: number; text: string }[] = [];
  const wc = (websiteContent || "").trim().slice(0, MAX_WEB_FOR_INDEX);
  if (wc) {
    const ch = splitTextIntoChunks(wc, CHUNK_SIZE, CHUNK_OVERLAP);
    ch.forEach((t, j) => {
      rowsToInsert.push({ source: "website", label: "Scraped website", index: j, text: t });
    });
  }

  if (mergedDocs) {
    const docBody = mergedDocs.slice(0, MAX_DOCS_FOR_INDEX);
    if (docBody) {
      const ch = splitTextIntoChunks(docBody, CHUNK_SIZE, CHUNK_OVERLAP);
      ch.forEach((t, j) => {
        rowsToInsert.push({ source: "document", label: "Owner documents", index: j, text: t });
      });
    }
  }

  let productLines = "";
  try {
    const parsed = productsJson ? JSON.parse(productsJson) : [];
    const arr: { name?: string; price?: string; url?: string }[] = Array.isArray(parsed) ? parsed : parsed?.products || [];
    if (Array.isArray(arr) && arr.length > 0) {
      productLines = arr
        .slice(0, 200)
        .map((p) =>
          p.name
            ? `${p.name}${p.price ? ` — ${p.price}` : ""}${p.url ? ` ${p.url}` : ""}`
            : ""
        )
        .filter(Boolean)
        .join("\n")
        .slice(0, MAX_CATALOG_CHARS);
    }
  } catch {
    /* ignore */
  }
  if (productLines) {
    const ch = splitTextIntoChunks(
      "Product catalog (names and prices when available):\n" + productLines,
      CHUNK_SIZE,
      80
    );
    ch.forEach((t, j) => {
      rowsToInsert.push({ source: "catalog", label: "Product catalog", index: j, text: t });
    });
  }

  const limited = rowsToInsert.slice(0, RAG_MAX_CHUNKS);
  if (limited.length === 0) {
    try {
      await conn.execute("DELETE FROM chatbot_knowledge_chunks WHERE chatbot_id = ?", [chatbotId]);
    } catch (e) {
      if (isRagTableMissingError(e)) return { ok: true, chunkCount: 0, skipped: true, reason: "RAG table missing" };
      throw e;
    }
    return { ok: true, chunkCount: 0, skipped: false, reason: "no text to index" };
  }

  const texts = limited.map((r) => r.text);
  let embeddings: number[][];
  try {
    embeddings = await createEmbeddings(texts);
  } catch (e) {
    console.error("[RAG] embedding failed:", e);
    return { ok: false, chunkCount: 0, skipped: true, reason: "embedding error" };
  }

  if (embeddings.length !== limited.length) {
    console.error("[RAG] embedding count mismatch");
    return { ok: false, chunkCount: 0, skipped: true, reason: "count mismatch" };
  }

  try {
    await conn.beginTransaction();
    await conn.execute("DELETE FROM chatbot_knowledge_chunks WHERE chatbot_id = ?", [chatbotId]);
    for (let n = 0; n < limited.length; n++) {
      const row = limited[n];
      const id = randomUUID();
      const emb = embeddings[n];
      await conn.execute(
        `INSERT INTO chatbot_knowledge_chunks (id, chatbot_id, source_type, source_label, chunk_index, content, embedding_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, chatbotId, row.source, row.label.slice(0, 500), row.index, row.text.slice(0, 60000), JSON.stringify(emb)]
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback().catch(() => {});
    if (isRagTableMissingError(e)) {
      return { ok: true, chunkCount: 0, skipped: true, reason: "RAG table missing" };
    }
    throw e;
  }

  const [cntRows] = await conn.execute("SELECT COUNT(*) AS c FROM chatbot_knowledge_chunks WHERE chatbot_id = ?", [
    chatbotId,
  ]);
  const c = (cntRows as { c: number }[])[0]?.c ?? 0;
  return { ok: true, chunkCount: c, skipped: false };
}

async function loadChunkRows(conn: PoolConnection, chatbotId: string): Promise<ChunkRow[]> {
  const [rows] = await conn.execute(
    "SELECT content, embedding_json AS ej FROM chatbot_knowledge_chunks WHERE chatbot_id = ?",
    [chatbotId]
  );
  const out: ChunkRow[] = [];
  for (const r of rows as { content: string; ej: string }[]) {
    const emb = parseEmbedding(r.ej);
    if (emb.length === 0 || !r.content?.trim()) continue;
    out.push({ content: r.content.trim(), emb });
  }
  return out;
}

export async function getKnowledgeChunkCount(conn: PoolConnection, chatbotId: string): Promise<number> {
  try {
    const [rows] = await conn.execute("SELECT COUNT(*) AS c FROM chatbot_knowledge_chunks WHERE chatbot_id = ?", [
      chatbotId,
    ]);
    return Number((rows as { c: number }[])[0]?.c ?? 0);
  } catch (e) {
    if (isRagTableMissingError(e)) return 0;
    throw e;
  }
}

/**
 * Return top K chunk texts by cosine similarity to the question.
 */
export async function retrieveRelevantPassages(
  conn: PoolConnection,
  chatbotId: string,
  question: string
): Promise<string[]> {
  if (!RAG_ENABLED || !process.env.OPENAI_API_KEY) return [];
  if (!question.trim()) return [];
  let rows: ChunkRow[];
  try {
    rows = await loadChunkRows(conn, chatbotId);
  } catch (e) {
    if (isRagTableMissingError(e)) return [];
    throw e;
  }
  if (rows.length === 0) return [];

  let qv: number[];
  try {
    qv = await embedQuery(question);
  } catch (e) {
    console.error("[RAG] query embed failed:", e);
    return [];
  }
  if (qv.length === 0) return [];

  const scored = rows
    .map((r) => ({ t: r.content, s: cosine(qv, r.emb) }))
    .filter((x) => x.s > 0.05);
  scored.sort((a, b) => b.s - a.s);
  const k = RAG_TOP_K;
  return scored.slice(0, k).map((x) => x.t);
}

export { RAG_ENABLED, RAG_TOP_K };
