import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { randomUUID } from "crypto";

const DEV_ONLY = process.env.NODE_ENV !== "production";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!DEV_ONLY) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : "https://example.com";
    const name = typeof body.name === "string" ? body.name.trim() || "Plainbot" : "Plainbot";
    const conn = await getDbConnection();
    const [existing] = await conn.execute(
      "SELECT id FROM chatbots WHERE user_id = ? LIMIT 1",
      [userId]
    );
    if (Array.isArray(existing) && existing.length > 0) {
      await conn.end();
      return NextResponse.json(
        { error: "User already has a chatbot. View dashboard to see snippet." },
        { status: 400 }
      );
    }
    const chatbotId = randomUUID();
    await conn.execute(
      `INSERT INTO chatbots (id, user_id, name, website_url, website_title, website_description, website_content, products_json, personality, is_active)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, 'Friendly', 1)`,
      [chatbotId, userId, name, websiteUrl]
    );
    const activityId = randomUUID();
    await conn.execute(
      `INSERT INTO activity_log (id, user_id, chatbot_id, type, title, detail) VALUES (?, ?, ?, 'system', 'Chatbot created', ?)`,
      [activityId, userId, chatbotId, `Chatbot created from manual preview for ${websiteUrl}`]
    );
    await conn.end();
    return NextResponse.json({
      ok: true,
      chatbot: { id: chatbotId, name, websiteUrl },
    });
  } catch (err) {
    console.error("Create chatbot error:", err);
    return NextResponse.json({ error: "Failed to create chatbot" }, { status: 500 });
  }
}
