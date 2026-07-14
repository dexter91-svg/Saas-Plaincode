import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import { storeLimitForPlan } from "@/lib/plans";
import { normalizeWidgetAccentColor } from "@/lib/widget-color";

type Personality = "Friendly" | "Professional" | "Sales-focused" | "Premium Luxury";

type BotRow = {
  id: string;
  name: string;
  websiteUrl: string;
  websiteTitle: string | null;
  websiteDescription: string | null;
  websiteContent: string | null;
  productsJson: string | null;
  personality: Personality;
  language?: string | null;
  guardRails: string | null;
  widgetAccentColor?: string | null;
  widgetLogoMime?: string | null;
  widgetLogoBase64?: string | null;
  isActive: number;
  createdAt: Date;
};

function parseProducts(productsJson: string | null): { name: string; price?: string; url?: string }[] {
  if (!productsJson) return [];
  try {
    const parsed = JSON.parse(productsJson);
    const arr = Array.isArray(parsed) ? parsed : parsed?.products ? parsed.products : [];
    if (!Array.isArray(arr)) return [];
    return arr
      .map((p: { name?: string; price?: string; url?: string }) => ({
        name: typeof p?.name === "string" ? p.name : "",
        ...(typeof p?.price === "string" && p.price ? { price: p.price } : {}),
        ...(typeof p?.url === "string" && p.url.trim() ? { url: p.url.trim() } : {}),
      }))
      .filter((p) => p.name.length > 0);
  } catch {
    return [];
  }
}

function toChatbotResponse(c: BotRow) {
  const products = parseProducts(c.productsJson);
  const logoDataUrl =
    c.widgetLogoMime && c.widgetLogoBase64
      ? `data:${c.widgetLogoMime};base64,${c.widgetLogoBase64}`
      : null;
  return {
    id: c.id,
    name: c.name,
    websiteUrl: c.websiteUrl,
    websiteTitle: c.websiteTitle ?? "",
    websiteDescription: c.websiteDescription ?? "",
    websiteContent: c.websiteContent ?? "",
    products,
    personality: c.personality,
    language: c.language ?? "en",
    guardRails: c.guardRails ?? "",
    widgetAccentColor: c.widgetAccentColor ?? null,
    widgetLogoDataUrl: logoDataUrl,
    isActive: !!c.isActive,
    createdAt: c.createdAt,
  };
}

function parseImageDataUrl(raw: string): { mime: string; base64: string } | null {
  const s = raw.trim();
  // data:image/png;base64,AAAA
  const m = s.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const base64 = m[2];
  const allowed = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]);
  if (!allowed.has(mime)) return null;
  // Rough size limit: base64 chars * 3/4 ≈ bytes. Cap around 220KB.
  if (base64.length > 300_000) return null;
  return { mime, base64 };
}

function labelStore(c: BotRow): string {
  const t = c.websiteTitle?.trim();
  if (t) return t.length > 40 ? `${t.slice(0, 37)}…` : t;
  try {
    const host = c.websiteUrl.replace(/^https?:\/\//, "").split("/")[0];
    return host || c.name || "Store";
  } catch {
    return c.name || "Store";
  }
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeIdParam = req.nextUrl.searchParams.get("storeId")?.trim() || null;

  try {
    const conn = await getDbConnection();

    const [planRows] = await conn.execute("SELECT plan FROM users WHERE id = ?", [auth.userId]);
    const plan = (planRows as { plan: string }[])[0]?.plan ?? "free";
    const storeLimit = storeLimitForPlan(plan);

    let list: BotRow[] = [];
    try {
      const [raw] = await conn.execute(
        `SELECT id, name, website_url AS websiteUrl, website_title AS websiteTitle,
         website_description AS websiteDescription, website_content AS websiteContent,
         products_json AS productsJson, personality, language, guard_rails AS guardRails,
         widget_accent_color AS widgetAccentColor,
         widget_logo_mime AS widgetLogoMime, widget_logo_base64 AS widgetLogoBase64,
         is_active AS isActive, created_at AS createdAt
         FROM chatbots WHERE user_id = ? ORDER BY created_at DESC`,
        [auth.userId]
      );
      list = (Array.isArray(raw) ? raw : []) as BotRow[];
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === "ER_BAD_FIELD_ERROR") {
        const [raw] = await conn.execute(
          `SELECT id, name, website_url AS websiteUrl, website_title AS websiteTitle,
           website_description AS websiteDescription, website_content AS websiteContent,
           products_json AS productsJson, personality, is_active AS isActive, created_at AS createdAt
           FROM chatbots WHERE user_id = ? ORDER BY created_at DESC`,
          [auth.userId]
        );
        const rawRows = (Array.isArray(raw) ? raw : []) as Record<string, unknown>[];
        list = rawRows.map((r) => ({
          ...r,
          guardRails: "",
          language: "en",
          widgetAccentColor: null,
        })) as BotRow[];
      } else throw err;
    }

    await conn.end();

    const storeCount = list.length;
    const chatbotsSummary = list.map((c) => ({
      id: c.id,
      name: c.name,
      label: labelStore(c),
      websiteUrl: c.websiteUrl,
    }));

    if (list.length === 0) {
      return NextResponse.json({
        chatbot: null,
        chatbots: [],
        storeLimit,
        storeCount: 0,
        plan,
      });
    }

    let active = list[0];
    if (storeIdParam && list.some((b) => b.id === storeIdParam)) {
      active = list.find((b) => b.id === storeIdParam)!;
    }

    return NextResponse.json({
      chatbot: toChatbotResponse(active),
      chatbots: chatbotsSummary,
      storeLimit,
      storeCount,
      plan,
    });
  } catch (err) {
    console.error("GET /api/chatbots/me:", err);
    return NextResponse.json({ error: "Failed to load chatbot." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetChatbotId =
      typeof body.chatbotId === "string" && body.chatbotId.trim() ? body.chatbotId.trim() : null;
    const personality =
      typeof body.personality === "string" &&
      ["Friendly", "Professional", "Sales-focused", "Premium Luxury"].includes(body.personality)
        ? body.personality
        : null;
    const name = typeof body.name === "string" ? body.name.trim() : null;
    const language = typeof body.language === "string" ? body.language.trim().slice(0, 20) : null;
    const guardRails = typeof body.guardRails === "string" ? body.guardRails.trim() : null;
    const widgetLogoDataUrl =
      typeof (body as { widgetLogoDataUrl?: unknown }).widgetLogoDataUrl === "string"
        ? ((body as { widgetLogoDataUrl: string }).widgetLogoDataUrl || "").trim()
        : null;
    const widgetLogoParsed = widgetLogoDataUrl ? parseImageDataUrl(widgetLogoDataUrl) : null;
    if (widgetLogoDataUrl !== null && widgetLogoDataUrl !== "" && !widgetLogoParsed) {
      return NextResponse.json(
        { error: "Invalid logo. Upload a small PNG/JPEG/WebP/SVG (max ~220KB)." },
        { status: 400 }
      );
    }

    let widgetAccentColorUpdate: string | null | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(body, "widgetAccentColor")) {
      const raw = (body as { widgetAccentColor?: unknown }).widgetAccentColor;
      if (raw === null || raw === "") {
        widgetAccentColorUpdate = null;
      } else if (typeof raw === "string") {
        const n = normalizeWidgetAccentColor(raw);
        if (!n) {
          return NextResponse.json(
            { error: "Invalid widget colour. Use #RGB or #RRGGBB (e.g. #2563eb)." },
            { status: 400 }
          );
        }
        widgetAccentColorUpdate = n;
      }
    }

    const conn = await getDbConnection();

    let chatbotId = targetChatbotId;
    if (chatbotId) {
      const [owned] = await conn.execute(
        "SELECT id FROM chatbots WHERE id = ? AND user_id = ?",
        [chatbotId, auth.userId]
      );
      if ((owned as { id: string }[]).length === 0) {
        chatbotId = null;
      }
    }
    if (!chatbotId) {
      const [rows] = await conn.execute(
        "SELECT id FROM chatbots WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        [auth.userId]
      );
      const list = rows as { id: string }[];
      if (list.length === 0) {
        await conn.end();
        return NextResponse.json({ error: "No chatbot found. Create one from Create Bot first." }, { status: 404 });
      }
      chatbotId = list[0].id;
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    if (personality) {
      updates.push("personality = ?");
      values.push(personality);
    }
    if (name !== null && name !== "") {
      updates.push("name = ?");
      values.push(name);
    }
    if (guardRails !== null) {
      updates.push("guard_rails = ?");
      values.push(guardRails === "" ? null : guardRails);
    }
    if (language !== null) {
      updates.push("language = ?");
      values.push(language || "en");
    }
    if (widgetAccentColorUpdate !== undefined) {
      updates.push("widget_accent_color = ?");
      values.push(widgetAccentColorUpdate);
    }
    if (widgetLogoDataUrl !== null) {
      // Allow clearing by sending empty string.
      updates.push("widget_logo_mime = ?");
      values.push(widgetLogoParsed ? widgetLogoParsed.mime : null);
      updates.push("widget_logo_base64 = ?");
      values.push(widgetLogoParsed ? widgetLogoParsed.base64 : null);
    }
    if (updates.length === 0) {
      await conn.end();
      return NextResponse.json({ chatbot: null });
    }
    values.push(chatbotId);
    try {
      await conn.execute(`UPDATE chatbots SET ${updates.join(", ")} WHERE id = ?`, values);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === "ER_BAD_FIELD_ERROR") {
        const strippable = [
          "widget_accent_color = ?",
          "guard_rails = ?",
          "language = ?",
          "widget_logo_mime = ?",
          "widget_logo_base64 = ?",
        ];
        for (const col of strippable) {
          const idx = updates.indexOf(col);
          if (idx !== -1) {
            updates.splice(idx, 1);
            values.splice(idx, 1);
          }
        }
        values[values.length - 1] = chatbotId;
        if (updates.length > 0) {
          await conn.execute(`UPDATE chatbots SET ${updates.join(", ")} WHERE id = ?`, values);
        }
      } else throw err;
    }
    await conn.end();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/chatbots/me:", err);
    return NextResponse.json({ error: "Failed to update chatbot." }, { status: 500 });
  }
}
