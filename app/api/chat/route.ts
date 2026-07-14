import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getDbConnection } from "@/lib/db";
import { randomUUID } from "crypto";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";
import { sendLimitReachedEmail } from "@/lib/usage-emails";
import { getMergedUploadedDocsText } from "@/lib/knowledge-documents";
import {
  RAG_ENABLED,
  reindexChatbot,
  retrieveRelevantPassages,
  getKnowledgeChunkCount,
} from "@/lib/rag";
import { extractFirstEmailFromMessages } from "@/lib/extract-email";
import { createPendingForwardFromChat } from "@/lib/forward-to-support";
import { getHandoffMode, toOpenAIHistoryMessages } from "@/lib/conversation-handoff";

export const runtime = "nodejs";
export const maxDuration = 120;

const modelFromEnv = process.env.OPENAI_MODEL || "gpt-4o";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function enforceGuardRailsOrRewrite(args: {
  guardRailsText: string;
  question: string;
  draftAnswer: string;
}): Promise<{ answer: string; rewritten: boolean }> {
  const guard = (args.guardRailsText || "").trim();
  const draft = (args.draftAnswer || "").trim();
  if (!guard) return { answer: draft, rewritten: false };
  if (!draft) return { answer: draft, rewritten: false };

  // Ask the model to verify compliance with the store owner's rules and rewrite if needed.
  // We intentionally request JSON so it is easy to parse and deterministic.
  const checkerSystem = `You are a strict compliance checker for a customer-support chatbot.

Your job:
- Compare the draft answer against the STORE OWNER RULES.
- If the draft violates ANY rule, rewrite it so it fully complies.
- Keep the rewrite concise, well-formatted, and aligned with the draft intent.

Return ONLY valid JSON with this exact schema:
{
  "action": "ok" | "rewrite",
  "rewritten": string
}`;

  try {
    const completion = await client.chat.completions.create({
      model: modelFromEnv,
      temperature: 0,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: checkerSystem },
        {
          role: "user",
          content: `STORE OWNER RULES:\n${guard}\n\nUSER QUESTION:\n${args.question}\n\nDRAFT ANSWER:\n${draft}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed: { action?: "ok" | "rewrite"; rewritten?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    if (parsed.action === "rewrite" && typeof parsed.rewritten === "string" && parsed.rewritten.trim()) {
      return { answer: parsed.rewritten.trim(), rewritten: true };
    }
    return { answer: draft, rewritten: false };
  } catch {
    // If the checker fails, fall back to the draft answer rather than erroring.
    return { answer: draft, rewritten: false };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function buildWebsiteContext(
  scrapedData: {
    url?: string;
    title?: string;
    description?: string;
    content?: string;
    products?: { name?: string; price?: string; url?: string }[];
    uploadedDocsText?: string;
  } | null,
  opts?: { ragPassages?: string[]; docsExcerpt?: string }
): string {
  if (!scrapedData) return "No website content was provided. You do not know anything specific about this store.";
  const parts: string[] = [];
  const useRag = (opts?.ragPassages?.length ?? 0) > 0;

  parts.push(
    useRag
      ? "=== STORE KNOWLEDGE (RAG: top passages for this question + product list — your only source of truth) ==="
      : "=== STORE KNOWLEDGE (use this as your only source of truth for this store) ==="
  );
  if (scrapedData.title) parts.push(`Store name/title: ${scrapedData.title}`);
  if (scrapedData.url) {
    const base = scrapedData.url.replace(/\/$/, "");
    parts.push(
      `Store base URL (share this when the user should browse the shop; only use paths/URLs from this host or listed below): ${base}`
    );
  }
  if (scrapedData.description) parts.push(`Short description: ${scrapedData.description}`);

  const hasUploadedDocs = scrapedData.uploadedDocsText && scrapedData.uploadedDocsText.trim().length > 0;
  if (hasUploadedDocs && !useRag) {
    const doc = (scrapedData.uploadedDocsText ?? "").trim();
    parts.push("\nUPLOADED DOCUMENTS (from PDF/TXT the store owner provided — use this to answer product count, product names, and any facts mentioned here):");
    parts.push("When the user asks 'how many products do you have?' or similar, infer from this document (e.g. count list items, or use a number stated in the text). Answer in first person (e.g. 'We have around X products.'). Do not say 'this information is not available' if this document contains product or catalog information.");
    parts.push(doc.length > 40000 ? doc.slice(0, 40000) + "\n[...]" : doc);
  }
  if (useRag && opts?.docsExcerpt && opts.docsExcerpt.trim()) {
    const ex = opts.docsExcerpt.trim();
    parts.push("\nUPLOADED DOCUMENTS (excerpt — included because the question likely depends on it):");
    parts.push(ex.length > 12000 ? ex.slice(0, 12000) + "\n[...]" : ex);
  }
  if (useRag && hasUploadedDocs) {
    parts.push(
      "\n(Owner PDF/TXT files are indexed: relevant excerpts appear in RETRIEVED PASSAGES below when they match the question — not the full documents.)"
    );
  }

  if (Array.isArray(scrapedData.products) && scrapedData.products.length > 0) {
    const productCount = scrapedData.products.length;
    parts.push("\nPRODUCT COUNT: This catalog contains " + productCount + " product(s). When the user asks 'how many products do you have?' or similar, use this number and answer in first person (e.g. 'We have " + productCount + " products.').");
    parts.push("\nPRODUCT CATALOG (use this to answer what the store sells, how many products, and what TYPES or CATEGORIES they offer):");
    parts.push("When asked 'what types of products/footwear/apparel do you sell?' or 'which categories?', infer types from the product names and content below. Do not say 'not available' if you can reasonably derive types from this list.");
    const prices = scrapedData.products.map((p) => p.price).filter((v): v is string => typeof v === "string" && v.length > 0);
    const numericPrices = prices
      .map((s) => parseFloat(s.replace(/[^0-9.]/g, "")))
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (numericPrices.length > 0) {
      const low = Math.min(...numericPrices);
      const high = Math.max(...numericPrices);
      const sym = prices[0]?.match(/£|€/) ? (prices[0].includes("£") ? "£" : "€") : "$";
      parts.push(`APPROXIMATE PRICE RANGE (use for rough price answers): ${sym}${low} to ${sym}${high}. When asked about price ranges, give this rough range—exact prices are not required.`);
    } else {
      const priceSrc = useRag
        ? "RETRIEVED PASSAGES, PRODUCT CATALOG, or the short description"
        : "WEBSITE CONTENT below";
      parts.push(
        `When asked about PRICE or PRICE RANGE: use any prices mentioned in ${priceSrc}. If none, say we don't have price details in this chat. Include product page link(s) from the catalog when URLs are listed below.`
      );
    }
    parts.push(
      "\nLINKS (required for product questions): When the user asks about a product, product details, price of a named item, what you sell, or categories — include the product page URL from this list for every product you mention (markdown [Product name](https://...) or plain https URL). Up to 6 links per reply when listing several items. Only use URLs listed here, in RETRIEVED PASSAGES, or the store base URL above — never invent paths."
    );
    scrapedData.products.forEach((p, i) => {
      const name = p.name?.trim();
      if (name) {
        const u = p.url?.trim();
        parts.push(
          `  ${i + 1}. ${name}${p.price ? ` — ${p.price}` : ""}${u ? ` | Page: ${u}` : " | (no product page URL in data)"}`
        );
      }
    });
  } else if (!hasUploadedDocs && !useRag) {
    parts.push(
      "\nPRODUCT CATALOG: (no product list in this data — use store title, description, and WEBSITE CONTENT or UPLOADED DOCUMENTS above to describe what the store sells. If WEBSITE CONTENT or UPLOADED DOCUMENTS mention a number of products or a list, use that to answer 'how many products?' when possible. If you still cannot determine a count, say honestly that the exact number is not in this content—do not offer to forward the chat to a human for that reason alone.)"
    );
  } else if (!useRag) {
    parts.push("\nPRODUCT CATALOG: (no scraped product list — use UPLOADED DOCUMENTS above to answer how many products, product names, and categories. Do not say information is not available if the uploaded document describes products.)");
  } else if (useRag) {
    parts.push(
      "\nPRODUCT CATALOG: (no structured product list in the database—use RETRIEVED PASSAGES and store description; passages may still list products. If the answer is unknown, state that clearly—do not treat it as a support escalation or ask for email to forward the conversation.)"
    );
  }

  if (useRag && opts?.ragPassages) {
    parts.push(
      "\nRETRIEVED PASSAGES (embeddings-matched excerpts from the site crawl, owner files, and searchable catalog text — use with PRODUCT CATALOG and counts above; include any https URLs from these passages when answering about products, policies, or pages):"
    );
    opts.ragPassages.forEach((p, i) => {
      const block = p.length > 6000 ? p.slice(0, 6000) + "\n[...]" : p;
      parts.push(`[${i + 1}] ${block}`);
    });
  } else if (scrapedData.content && scrapedData.content.trim().length > 0) {
    parts.push("\nWEBSITE CONTENT (policies, FAQs, shipping, returns, general info):");
    const content = scrapedData.content.trim();
    parts.push(content.length > 20000 ? content.slice(0, 20000) + "\n[...]" : content);
  }

  return parts.join("\n");
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "chat", LIMITS.chat);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { ...corsHeaders, "Retry-After": String(rl.retryAfter) } }
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const chatbotId = typeof body.chatbotId === "string" ? body.chatbotId.trim() : null;
    const conversationIdParam = typeof body.conversationId === "string" ? body.conversationId.trim() : null;

    if (!question) {
      return NextResponse.json({ error: "Missing question in body." }, { status: 400, headers: corsHeaders });
    }

    let personality = typeof body.personality === "string" ? body.personality : null;
    let scrapedData = body.scrapedData as {
      url?: string;
      title?: string;
      description?: string;
      content?: string;
      products?: { name?: string; price?: string; url?: string }[];
      uploadedDocsText?: string;
    } | null;

    let conversationId: string | null = null;
    let persistMessages = false;
    let ticketRef: string | null = null;
    let botUserId: string | null = null;
    let userMsgId: string | null = null;
    let supportJustForwarded = false;

    if (chatbotId) {
      const conn = await getDbConnection();
      type BotRow = { id: string; userId: string; personality: string; language?: string | null; guardRails?: string | null; uploadedDocsText?: string | null; websiteUrl: string | null; websiteTitle: string | null; websiteDescription: string | null; websiteContent: string | null; productsJson: string | null };
      let bots: BotRow[];
      try {
        const [rows] = await conn.execute(
          `SELECT id, user_id AS userId, personality, language, guard_rails AS guardRails, uploaded_docs_text AS uploadedDocsText, website_url AS websiteUrl, website_title AS websiteTitle, website_description AS websiteDescription,
           website_content AS websiteContent, products_json AS productsJson FROM chatbots WHERE id = ? AND is_active = 1`,
          [chatbotId]
        );
        bots = rows as BotRow[];
      } catch (err: unknown) {
        const e = err as { code?: string };
        if (e?.code === "ER_BAD_FIELD_ERROR") {
          const [rows] = await conn.execute(
            `SELECT id, user_id AS userId, personality, website_url AS websiteUrl, website_title AS websiteTitle, website_description AS websiteDescription,
             website_content AS websiteContent, products_json AS productsJson FROM chatbots WHERE id = ? AND is_active = 1`,
            [chatbotId]
          );
          bots = (rows as Record<string, unknown>[]).map((r) => ({ ...r, guardRails: null, uploadedDocsText: null, language: "en" })) as BotRow[];
        } else throw err;
      }

      if (bots.length === 0) {
        await conn.end();
        return NextResponse.json({ error: "Chatbot not found or inactive." }, { status: 404, headers: corsHeaders });
      }
      const bot = bots[0];
      botUserId = bot.userId ?? null;
      let mergedUploadedDocs: string | undefined;
      try {
        const merged = await getMergedUploadedDocsText(conn, chatbotId, bot.uploadedDocsText);
        mergedUploadedDocs = merged.trim() ? merged : undefined;
      } finally {
        await conn.end();
      }

      personality = bot.personality || "Friendly";
      let products: { name?: string; price?: string }[] = [];
      if (bot.productsJson) {
        try {
          const parsed = JSON.parse(bot.productsJson);
          products = Array.isArray(parsed) ? parsed : (parsed?.products || []);
        } catch {
          /* ignore */
        }
      }
      scrapedData = {
        url: bot.websiteUrl ?? undefined,
        title: bot.websiteTitle ?? undefined,
        description: bot.websiteDescription ?? undefined,
        content: bot.websiteContent ?? undefined,
        products,
        uploadedDocsText: mergedUploadedDocs,
      };
      if (bot.guardRails && bot.guardRails.trim()) {
        (scrapedData as { guardRails?: string }).guardRails = bot.guardRails.trim();
      }
      (scrapedData as { language?: string }).language = bot.language ?? "en";
      persistMessages = true;

      const conn2 = await getDbConnection();
      if (conversationIdParam) {
        const [convRows] = await conn2.execute(
          "SELECT id FROM conversations WHERE id = ? AND chatbot_id = ?",
          [conversationIdParam, chatbotId]
        );
        if ((convRows as { id: string }[]).length > 0) conversationId = conversationIdParam;
      }
      if (!conversationId) {
        const period =
          new Date().getFullYear() +
          "-" +
          String(new Date().getMonth() + 1).padStart(2, "0");
        const [userRows] = await conn2.execute(
          "SELECT conversation_limit AS conversationLimit, complimentary_credits AS complimentaryCredits, plan, email, name, limit_reached_period AS limitReachedPeriod FROM users WHERE id = ?",
          [botUserId]
        );
        const u = (userRows as {
          conversationLimit?: number | null;
          complimentaryCredits?: number;
          plan?: string;
          email?: string;
          name?: string | null;
          limitReachedPeriod?: string | null;
        }[])[0];
        const rawLimit = u?.conversationLimit;
        const comp = u?.complimentaryCredits ?? 0;
        const unlimited = rawLimit === null || rawLimit === undefined;
        const limit = unlimited ? Number.POSITIVE_INFINITY : ((rawLimit ?? 100) + comp);
        const [usageRows] = await conn2.execute(
          "SELECT count_used AS countUsed FROM conversation_usage WHERE user_id = ? AND period_month = ?",
          [botUserId, period]
        );
        const countUsed = (usageRows as { countUsed?: number }[])[0]?.countUsed ?? 0;
        if (!unlimited && countUsed >= limit) {
          const paid =
            u?.plan === "growth" ||
            u?.plan === "pro" ||
            u?.plan === "agency" ||
            u?.plan === "custom" ||
            u?.plan === "business";
          if (u?.limitReachedPeriod !== period && u?.email) {
            sendLimitReachedEmail(u.email, paid ? "pro" : "free", u.name ?? null).catch((e) =>
              console.error("[Chat] Limit-reached email error:", e)
            );
            await conn2.execute(
              "UPDATE users SET limit_reached_period = ? WHERE id = ?",
              [period, botUserId]
            );
          }
          await conn2.end();
          return NextResponse.json(
            {
              error: paid
                ? "You've used all your conversations this month. Renew your plan to continue."
                : "Your free plan conversations are used up. Upgrade to a paid plan to continue.",
              limitReached: true,
              plan: paid ? "paid" : "free",
            },
            { status: 402, headers: corsHeaders }
          );
        }
        conversationId = randomUUID();
        await conn2.execute(
          "INSERT INTO conversations (id, chatbot_id, status) VALUES (?, ?, 'open')",
          [conversationId, chatbotId]
        );
        await conn2.execute(
          "INSERT INTO conversation_usage (id, user_id, period_month, count_used) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE count_used = count_used + 1",
          [randomUUID(), botUserId, period]
        );
      }
      userMsgId = randomUUID();
      await conn2.execute(
        "INSERT INTO chat_messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)",
        [userMsgId, conversationId, question]
      );
      await conn2.end();
    }

    if (persistMessages && conversationId) {
      const connHandoff = await getDbConnection();
      let handoffMode: "ai" | "human" = "ai";
      try {
        handoffMode = await getHandoffMode(connHandoff, conversationId);
      } finally {
        await connHandoff.end();
      }
      if (handoffMode === "human") {
        const ack =
          "Thanks for your message — a team member is handling this chat and will reply here shortly.";
        const assistantMsgId = randomUUID();
        const connAck = await getDbConnection();
        try {
          await connAck.execute(
            "INSERT INTO chat_messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)",
            [assistantMsgId, conversationId, ack]
          );
        } finally {
          await connAck.end();
        }
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(ack));
            controller.close();
          },
        });
        const headers: Record<string, string> = {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Expose-Headers":
            "X-Conversation-Id, X-Ticket-Ref, X-Handoff-Mode, X-Forwarded-Support, X-Forwarded-At, X-Needs-Forward-Form",
          "X-Handoff-Mode": "human",
        };
        if (conversationId) headers["X-Conversation-Id"] = conversationId;
        if (ticketRef) headers["X-Ticket-Ref"] = ticketRef;
        return new Response(stream, { headers });
      }
    }

    let websiteContext: string;
    if (chatbotId && RAG_ENABLED && process.env.OPENAI_API_KEY) {
      const connRag = await getDbConnection();
      try {
        const count = await getKnowledgeChunkCount(connRag, chatbotId);
        if (count === 0) {
          const hasText =
            (scrapedData?.content?.trim().length ?? 0) > 0 ||
            (scrapedData?.uploadedDocsText?.trim().length ?? 0) > 0 ||
            (Array.isArray(scrapedData?.products) && scrapedData.products.length > 0);
          if (hasText) {
            await reindexChatbot(connRag, chatbotId);
          }
        }
        const passages = await retrieveRelevantPassages(connRag, chatbotId, question);
        const wantsDocHelp =
          /\bhow many products\b|\bnumber of products\b|\bproduct count\b|\bprice range\b|\bhow much\b|\bcost\b/i.test(
            question
          );
        const docsExcerpt =
          wantsDocHelp && (scrapedData?.uploadedDocsText?.trim().length ?? 0) > 0
            ? String(scrapedData?.uploadedDocsText || "").slice(0, 20000)
            : undefined;
        websiteContext = buildWebsiteContext(
          scrapedData,
          passages.length > 0 ? { ragPassages: passages, ...(docsExcerpt ? { docsExcerpt } : {}) } : undefined
        );
      } catch (e) {
        console.error("[RAG] context build failed:", e);
        websiteContext = buildWebsiteContext(scrapedData);
      } finally {
        await connRag.end();
      }
    } else {
      websiteContext = buildWebsiteContext(scrapedData);
    }
    const personalityLabel = personality || "Friendly";
    const bodyGuardRails =
      typeof (body as { guardRails?: unknown }).guardRails === "string"
        ? (body as { guardRails: string }).guardRails.trim()
        : "";
    const guardRailsFromDb = (scrapedData as { guardRails?: string } | null)?.guardRails?.trim() || "";
    /** With chatbotId, rules always come from the database (do not trust client body — avoids spoofing). */
    const guardRailsText = chatbotId ? guardRailsFromDb : bodyGuardRails || guardRailsFromDb;
    const languageCode = (scrapedData as { language?: string } | null)?.language?.trim() || "en";
    const languageNames: Record<string, string> = { en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese", nl: "Dutch", da: "Danish", sv: "Swedish", ar: "Arabic", hi: "Hindi", ja: "Japanese", zh: "Chinese" };
    const languageName = languageNames[languageCode] || languageCode;
    const languageRule = languageCode !== "en" ? `\nLANGUAGE: You must respond only in ${languageName}. All your replies must be in ${languageName}.\n` : "";
    let systemPrompt = `You are the AI assistant for this store. You speak as the store: use "we", "our website", "we offer". Your tone is professional, clear, and ${personalityLabel.toLowerCase()} where appropriate.${languageRule}

FORMATTING AND LENGTH (chat widget):
- Use clear structure: short paragraphs; blank line between ideas when you have more than one.
- Use bullet points (lines starting with "- " or "• ") when it helps scanning: multiple products, policy points, contact options, features, or any 2+ separate facts. Single simple questions (greeting, one yes/no) stay 1–2 sentences without bullets.
- Use a short numbered list (1. 2. 3.) only for sequential steps or ordered instructions.
- Keep each bullet one line when possible; stay concise—no long essays.
- Avoid filler ("I'd be happy to help"). Lead with the answer, then bullets if needed.

Your knowledge base is limited to the WEBSITE DATA below. Provide accurate, helpful responses based only on that data.

VOICE AND LINKS (URLs) — include links when relevant:
- Always speak as the store: "We offer...", "On our website we have...", "We sell these types of...".
- When the user asks about a product, product details, a named item, prices, what you sell, categories, or where to buy/view something on the site: you MUST include clickable links using only URLs from WEBSITE DATA (product "Page:" lines, store base URL, or RETRIEVED PASSAGES).
  - One specific product → include that product's page URL.
  - Several products → include a link for each product you name (up to 6 links in one reply).
  - No product URL in data but store base URL exists → include the store base URL so they can browse.
- For shipping, returns, contact, FAQ, or policy questions: include the matching page URL when it appears in WEBSITE DATA.
- Format: plain https://full-url (preferred) or markdown [short label](https://full-url).
- Greetings and simple yes/no need no links.
- Never invent or guess a path; if no URL exists in the data, describe in words only (no fake “visit our site” link).

PRIORITIES (in order): 1. Relevant links when the question is about products/pages  2. Clear, scannable formatting  3. Accuracy  4. Brevity

RESPONSE RULES:
- Never fabricate missing information (e.g. do not invent product names or prices that are not in the data).
- When the user asks "how many products do you have?" or "how many products?": use the PRODUCT COUNT or count the items in the PRODUCT CATALOG below. Answer in first person (e.g. "We have X products."). Do NOT say "not available" if the catalog lists any products.
- When the user asks about product TYPES, CATEGORIES, or what we sell: answer in first person (e.g. "We offer...", "On our website we have...") and infer from the PRODUCT CATALOG and WEBSITE CONTENT. Summarize types/categories. Do not say "not available" if you can reasonably derive types from the list or content.
- When the user asks about PRICE or PRICE RANGE: give a rough range in first person (e.g. "Our products are typically in the $X–$Y range"). Use APPROXIMATE PRICE RANGE or prices in the data. Include product page link(s) when URLs exist in the catalog.
- Maximize small data: infer types, categories, and price level when possible. Give concise answers with links to the relevant pages when URLs are in the data.
- Only if the question asks for something truly not present in the data, say briefly that this detail is not in the content you have (e.g. exact product count, a specific price)—honest and neutral. If store base URL or a shop link exists in WEBSITE DATA, include it so they can browse.
- Do not speculate about unrelated topics. Do not say "based on the provided content" or mention training data.

WHEN YOU CANNOT ANSWER (missing data) — critical:
- General factual gaps (product count unknown, no price in data, "what's on sale", catalog questions) are NOT support tickets. Reply in first person: you do not have that exact information in the materials available here, and point to browsing the online store or any contact/FAQ from the data if available.
- NEVER offer to "pass this to our team", "connect you with support", "have someone get back to you", or ask for the customer's email to escalate—unless you are in the FORWARD TO SUPPORT flow below (order-specific human actions) AND the user has already provided an email, name, or order reference as that flow requires.
- Do not mix a simple "I don't have that number/detail" with handoff language. No apology boilerplate that implies a human will follow up for basic factual gaps.

INTELLIGENT EXTRACTION:
- Extract relevant parts from the data; summarize cleanly; remove redundancy.
- Keep important details: product names, types/categories, prices, features, contact details, policies — and the matching page URLs from WEBSITE DATA when the user would benefit from visiting the site (see VOICE AND LINKS).

STRUCTURED ANSWERING:

If the question relates to products, types, or price → answer as the store: (1) What we offer (types/categories). (2) Rough price range when you have it. (3) Product names or features when relevant. (4) Include product page link(s) for every product you mention when URLs are in PRODUCT CATALOG. Use PRODUCT CATALOG and WEBSITE DATA below.

If the question relates to services → provide: Service name • What it includes • Who it is for • Link to the service or relevant page when a URL is in WEBSITE DATA.

If the question relates to contact → provide: Email • Phone • Address • Social links • Link to contact/about page when a URL is in WEBSITE DATA (use CONTACT / REACH THE STORE section below when present).

If multiple answers exist → use a one-line lead-in if helpful, then bullets for distinct points. Prefer bullets over one dense paragraph when comparing options or listing details.

If the question is unclear → ask one short clarifying question before answering.

RECENT CONVERSATION (if present above):
- The messages above are this same chat session. If the user asks what you discussed, to recap, or "what we talked about", briefly summarize the earlier turns in your own words—do not say "we haven't discussed anything" if those messages exist.

FORWARD TO SUPPORT (order / account / human actions only):
- Use this flow ONLY when the user needs a human for their order, account, refund/return on a purchase, shipping status, complaint about service, or similar—not when they asked a store-facts question and the answer was simply missing from the website data.
- When the user needs something only a human can do (e.g. cancel my order, my order is late, refund, return, complaint, account change, dispute), tell them briefly that a contact form will appear below to send their details to the team. Do NOT ask them to type their email in the chat—the form collects name, email, order ref, and message. End your reply with exactly this on a new line: [FORWARD_TO_SUPPORT]. This marker is removed from what the user sees; a form is shown; after they submit, the conversation is emailed to support and they can get replies in this chat.
- For normal product, catalog, price, or policy questions—including when the answer is "we don't have that detail in this chat"—do NOT add [FORWARD_TO_SUPPORT] and do not imply email forward/handoff.

TONE: Professional, clear, helpful, business-aligned, confident.`;

    const ownerInstructionsBlock = guardRailsText
      ? `=== MANDATORY STORE OWNER INSTRUCTIONS (HIGHEST PRIORITY) ===
The store owner wrote these rules. You MUST follow them on every reply. If any guidance later in this message conflicts with these instructions, obey the store owner first.

${guardRailsText}

=== END MANDATORY STORE OWNER INSTRUCTIONS ===

`
      : "";

    const fullPrompt = `${ownerInstructionsBlock}${systemPrompt}

=== WEBSITE DATA (your only source — use this and nothing else) ===

${websiteContext}

=== END WEBSITE DATA ===`.trim();

    // Conversation memory: include recent messages from this conversation so the model can
    // remember context (name/order id/etc.) within the same chat session.
    const historyMessages: { role: "user" | "assistant"; content: string }[] = [];
    if (persistMessages && conversationId) {
      try {
        const conn = await getDbConnection();
        const maxHistoryMessages = 14; // keep prompt small + focused
        let rows: { role: string; content: string }[] = [];
        if (userMsgId) {
          const [r] = await conn.execute(
            "SELECT role, content FROM chat_messages WHERE conversation_id = ? AND id <> ? ORDER BY created_at DESC LIMIT ?",
            [conversationId, userMsgId, maxHistoryMessages]
          );
          rows = (r as { role: string; content: string }[]) || [];
        } else {
          const [r] = await conn.execute(
            "SELECT role, content FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?",
            [conversationId, maxHistoryMessages]
          );
          rows = (r as { role: string; content: string }[]) || [];
        }
        await conn.end();

        rows.reverse().forEach((m) => {
          const mapped = toOpenAIHistoryMessages([m]);
          if (mapped[0]) historyMessages.push(mapped[0]);
        });
      } catch {
        /* ignore memory fetch errors */
      }
    }

    const openaiTimeoutMs = 60_000;
    const openaiAbort = new AbortController();
    const openaiTimeout = setTimeout(() => openaiAbort.abort(), openaiTimeoutMs);

    // Generate full answer first so we can enforce guard-rails BEFORE streaming to the user.
    const completion = await client.chat.completions.create(
      {
        model: modelFromEnv,
        messages: [{ role: "system", content: fullPrompt }, ...historyMessages, { role: "user", content: question }],
        temperature: 0.2,
        max_tokens: 1000,
      },
      { signal: openaiAbort.signal }
    );
    clearTimeout(openaiTimeout);

    const draftAnswer = (completion.choices[0]?.message?.content || "").trim();
    const { answer: checkedAnswer } = await enforceGuardRailsOrRewrite({
      guardRailsText,
      question,
      draftAnswer,
    });

    const finalRaw = checkedAnswer || draftAnswer || "";
    const hasForwardMarker = /\[FORWARD_TO_SUPPORT\]/i.test(finalRaw);
    const assistantContent = finalRaw.replace(/\s*\[FORWARD_TO_SUPPORT\]\s*$/i, "").trim();

    // Persist assistant message (and forward-to-support logic) before responding.
    if (persistMessages && conversationId && assistantContent) {
      try {
        const conn = await getDbConnection();
        const assistantMsgId = randomUUID();
        await conn.execute(
          "INSERT INTO chat_messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)",
          [assistantMsgId, conversationId, assistantContent]
        );
        if (hasForwardMarker && botUserId) {
          const [msgRows] = await conn.execute(
            "SELECT role, content FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC",
            [conversationId]
          );
          const msgs = (msgRows as { role: string; content: string }[]) || [];
          const lastUser = [...msgs].reverse().find((m) => m.role === "user");
          const preview = (lastUser?.content || question || "Conversation").slice(0, 500);
          const customerEmail = extractFirstEmailFromMessages(msgs);
          const customer = customerEmail
            ? (customerEmail.split("@")[0] || "Chat user").replace(/[._-]+/g, " ").trim() || "Chat user"
            : "Chat user";
          const pending = await createPendingForwardFromChat(conn, {
            userId: botUserId,
            conversationId,
            customer,
            preview,
          });
          ticketRef = pending.ticketRef;
          supportJustForwarded = true;
        } else {
          await conn.execute(
            "UPDATE tickets SET status = 'resolved', outcome = 'Resolved by AI' WHERE conversation_id = ?",
            [conversationId]
          );
        }
        await conn.end();
      } catch (err) {
        console.error("Failed to persist assistant message:", err);
      }
    }

    // Stream the final, already-checked answer to the client.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const text = assistantContent || "";
          const chunkSize = 120;
          for (let i = 0; i < text.length; i += chunkSize) {
            controller.enqueue(encoder.encode(text.slice(i, i + chunkSize)));
            // micro-yield for UI responsiveness
            await new Promise((r) => setTimeout(r, 0));
          }
        } catch (err) {
          controller.error(err);
          return;
        }
        controller.close();
      },
    });

    const headers: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Expose-Headers":
        "X-Conversation-Id, X-Ticket-Ref, X-Handoff-Mode, X-Forwarded-Support, X-Forwarded-At, X-Needs-Forward-Form",
    };
    if (conversationId) headers["X-Conversation-Id"] = conversationId;
    if (ticketRef) headers["X-Ticket-Ref"] = ticketRef;
    headers["X-Handoff-Mode"] = "ai";
    if (supportJustForwarded) {
      headers["X-Forwarded-Support"] = "1";
      headers["X-Forwarded-At"] = new Date().toISOString();
      headers["X-Needs-Forward-Form"] = "1";
    }

    return new Response(stream, { headers });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Unexpected error while generating reply." },
      { status: 500, headers: corsHeaders }
    );
  }
}
