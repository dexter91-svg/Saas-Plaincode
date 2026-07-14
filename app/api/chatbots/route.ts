import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import { canAddStore, storeLimitForPlan } from "@/lib/plans";
import { randomUUID } from "crypto";
import { reindexChatbot } from "@/lib/rag";

type Personality = "Friendly" | "Professional" | "Sales-focused" | "Premium Luxury";

export async function POST(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : "";
    const websiteTitle = typeof body.websiteTitle === "string" ? body.websiteTitle.trim() : null;
    const websiteDescription = typeof body.websiteDescription === "string" ? body.websiteDescription.trim() : null;
    const websiteContent = typeof body.websiteContent === "string" ? body.websiteContent : null;
    const products = Array.isArray(body.products) ? body.products : [];
    const personality: Personality =
      typeof body.personality === "string" && ["Friendly", "Professional", "Sales-focused", "Premium Luxury"].includes(body.personality)
        ? body.personality
        : "Friendly";
    const name = typeof body.name === "string" ? body.name.trim() || "Plainbot" : "Plainbot";

    if (!websiteUrl) {
      return NextResponse.json({ error: "websiteUrl is required." }, { status: 400 });
    }

    const conn = await getDbConnection();

    const [countRows] = await conn.execute(
      "SELECT COUNT(*) AS c FROM chatbots WHERE user_id = ?",
      [auth.userId]
    );
    const existingCount = Number((countRows as { c: number }[])[0]?.c ?? 0);
    const [planRows] = await conn.execute("SELECT plan FROM users WHERE id = ?", [auth.userId]);
    const userPlan = (planRows as { plan: string }[])[0]?.plan ?? "free";
    if (!canAddStore(userPlan, existingCount)) {
      await conn.end();
      const cap = storeLimitForPlan(userPlan);
      return NextResponse.json(
        {
          error: `Your plan allows ${cap} store(s). Upgrade to connect more stores.`,
        },
        { status: 403 }
      );
    }

    const chatbotId = randomUUID();
    const productsJson = JSON.stringify(products);
    await conn.execute(
      `INSERT INTO chatbots (id, user_id, name, website_url, website_title, website_description, website_content, products_json, personality, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        chatbotId,
        auth.userId,
        name,
        websiteUrl,
        websiteTitle,
        websiteDescription,
        websiteContent,
        productsJson,
        personality,
      ] as (string | null)[]
    );
    const activityId = randomUUID();
    await conn.execute(
      `INSERT INTO activity_log (id, user_id, chatbot_id, type, title, detail) VALUES (?, ?, ?, 'system', 'Website connected', ?)`,
      [activityId, auth.userId, chatbotId, `AI updated with content from ${websiteUrl.replace(/^https?:\/\//, "").split("/")[0]}`]
    );
    try {
      await reindexChatbot(conn, chatbotId);
    } catch (e) {
      console.error("[RAG] reindex after create chatbot:", e);
    }
    await conn.end();

    return NextResponse.json({
      ok: true,
      chatbot: { id: chatbotId, websiteUrl, personality, name },
    });
  } catch (err) {
    console.error("POST /api/chatbots:", err);
    return NextResponse.json({ error: "Failed to create chatbot." }, { status: 500 });
  }
}
