import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { normalizePlanParam, planHasPaidConversationTier } from "@/lib/plans";
import { resolvedWidgetAccentColor } from "@/lib/widget-color";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "private, no-store, max-age=0",
};

function truncateLabel(s: string): string {
  const t = s.trim();
  if (t.length <= 80) return t;
  return `${t.slice(0, 77)}…`;
}

/** Default bot name in DB — never show as paid "store" branding. */
function isGenericBotName(name: string): boolean {
  return /^plainbot$/i.test(name.trim());
}

function hostFromWebsiteUrl(url: string | null | undefined): string {
  const raw = (url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./i, "") || "";
  } catch {
    return "";
  }
}

/** Paid widgets: store/site label only — never the Plainbot product name unless Free. */
function storeDisplayName(
  websiteTitle: string | null | undefined,
  chatbotName: string | null | undefined,
  websiteUrl: string | null | undefined
): string {
  const w = (websiteTitle || "").trim();
  if (w) return truncateLabel(w);
  const n = (chatbotName || "").trim();
  if (n && !isGenericBotName(n)) return truncateLabel(n);
  const host = hostFromWebsiteUrl(websiteUrl);
  if (host) return truncateLabel(host);
  return "Chat";
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** Public: embed script uses this for header title and Plainbot branding (Free only). */
export async function GET(req: NextRequest) {
  const chatbotId = req.nextUrl.searchParams.get("chatbotId")?.trim();
  if (!chatbotId) {
    return NextResponse.json(
      {
        error: "chatbotId required",
        headerTitle: "Plainbot",
        showPoweredBy: true,
        accentColor: resolvedWidgetAccentColor(null),
      },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const conn = await getDbConnection();
    type Row = {
      name?: string | null;
      websiteTitle?: string | null;
      websiteUrl?: string | null;
      plan?: string | null;
      widgetAccentColor?: string | null;
      widgetLogoMime?: string | null;
      widgetLogoBase64?: string | null;
    };
    let rows: Row[];
    try {
      const [r] = await conn.execute(
        `SELECT c.name AS name, c.website_title AS websiteTitle, c.website_url AS websiteUrl,
                c.widget_accent_color AS widgetAccentColor,
                c.widget_logo_mime AS widgetLogoMime, c.widget_logo_base64 AS widgetLogoBase64,
                u.plan AS plan
         FROM chatbots c
         INNER JOIN users u ON u.id = c.user_id
         WHERE c.id = ? AND c.is_active = 1`,
        [chatbotId]
      );
      rows = (Array.isArray(r) ? r : []) as Row[];
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code !== "ER_BAD_FIELD_ERROR") throw err;
      const [r] = await conn.execute(
        `SELECT c.name AS name, c.website_title AS websiteTitle, c.website_url AS websiteUrl, u.plan AS plan
         FROM chatbots c
         INNER JOIN users u ON u.id = c.user_id
         WHERE c.id = ? AND c.is_active = 1`,
        [chatbotId]
      );
      rows = (Array.isArray(r) ? r : []) as Row[];
    }
    await conn.end();

    const row = rows[0];
    if (!row) {
      return NextResponse.json(
        {
          headerTitle: "Plainbot",
          showPoweredBy: true,
          accentColor: resolvedWidgetAccentColor(null),
        },
        { headers: corsHeaders }
      );
    }

    const paid = planHasPaidConversationTier(normalizePlanParam(row.plan));
    const headerTitle = paid
      ? storeDisplayName(row.websiteTitle, row.name, row.websiteUrl)
      : "Plainbot";
    const logoDataUrl =
      paid && row.widgetLogoMime && row.widgetLogoBase64
        ? `data:${row.widgetLogoMime};base64,${row.widgetLogoBase64}`
        : null;

    return NextResponse.json(
      {
        headerTitle,
        showPoweredBy: !paid,
        accentColor: resolvedWidgetAccentColor(row.widgetAccentColor ?? null),
        logoDataUrl,
      },
      { headers: corsHeaders }
    );
  } catch (e) {
    console.error("widget-config:", e);
    return NextResponse.json(
      {
        headerTitle: "Plainbot",
        showPoweredBy: true,
        accentColor: resolvedWidgetAccentColor(null),
      },
      { status: 200, headers: corsHeaders }
    );
  }
}
