import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthFromCookie } from "@/lib/auth";

export const runtime = "nodejs";

const modelFromEnv = process.env.OPENAI_MODEL || "gpt-4o-mini";
const visionModel = "gpt-4o-mini";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const imageUrlsRaw = Array.isArray(body.imageUrls) ? body.imageUrls : [];
    const imageUrls = imageUrlsRaw
      .map((u: unknown) => (typeof u === "string" ? u.trim() : ""))
      .filter((u: string) => u.length > 0);
    const imagesRaw = Array.isArray(body.images) ? body.images : [];
    const images = imagesRaw
      .map((img: unknown) => {
        if (img && typeof img === "object" && "data" in img && typeof (img as { data: unknown }).data === "string") {
          const mime = (img as { mimeType?: string }).mimeType || "image/jpeg";
          return { data: (img as { data: string }).data, mimeType: mime };
        }
        return null;
      })
      .filter((x: { data: string; mimeType: string } | null): x is { data: string; mimeType: string } => !!x && x.data.length > 0);
    const storeUrl = typeof body.url === "string" ? body.url.trim() : null;

    if (!description && imageUrls.length === 0 && images.length === 0) {
      return NextResponse.json(
        { error: "Provide a short description, upload PNG/JPG images, or paste at least one image URL." },
        { status: 400 }
      );
    }

    const userContextLines: string[] = [];
    if (storeUrl) userContextLines.push(`Store URL: ${storeUrl}`);
    if (description) userContextLines.push(`Merchant description:\n${description}`);
    if (imageUrls.length > 0) {
      userContextLines.push(`Image URLs:\n${imageUrls.join("\n")}`);
    }
    if (images.length > 0) {
      userContextLines.push(`The user also uploaded ${images.length} product image(s). Analyze them to identify product names, categories, and details.`);
    }

    const systemPrompt = `
You are an assistant that turns a merchant's free-form description and/or product images (uploaded or URLs) into a structured product catalog for an ecommerce chatbot.

Rules:
- Focus on concrete, distinct products a customer might ask about.
- From images: identify visible products, labels, packaging, or categories; use filenames/URLs only as hints.
- Group variants under the same logical product when appropriate (e.g. size/color).
- Avoid hallucinating brands or specs that were not clearly implied or visible.

Return STRICT JSON with this shape:
{
  "products": [
    {
      "name": "string, short product name",
      "summary": "1–2 sentence customer-friendly summary",
      "category": "optional, short category like 'Laptops' or 'Shoes'",
      "tags": ["optional", "tags"],
      "exampleQuestions": ["optional customer questions"]
    }
  ],
  "websiteFeed": "short 1–3 paragraph overview of what this store sells, using the same language customers might use"
}
`.trim();

    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } };

    const userContent: ContentPart[] = [{ type: "text", text: userContextLines.join("\n\n") }];
    for (const img of images) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${img.mimeType};base64,${img.data}` },
      });
    }

    const completion = await client.chat.completions.create({
      model: images.length > 0 ? visionModel : modelFromEnv,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed: {
      products?: {
        name?: string;
        summary?: string;
        category?: string;
        tags?: string[];
        exampleQuestions?: string[];
      }[];
      websiteFeed?: string;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const products =
      Array.isArray(parsed.products) && parsed.products.length > 0
        ? parsed.products
            .map((p) => (typeof p?.name === "string" ? { name: p.name.trim() } : null))
            .filter((p): p is { name: string } => !!p && p.name.length > 0)
        : [];

    const websiteFeed =
      typeof parsed.websiteFeed === "string" && parsed.websiteFeed.trim().length > 0
        ? parsed.websiteFeed.trim()
        : description || "";

    if (products.length === 0 && !websiteFeed) {
      return NextResponse.json(
        {
          error:
            "AI could not extract any clear products from the description. Try adding more concrete product names and details.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      products,
      content: websiteFeed,
    });
  } catch (err) {
    console.error("Manual products API error:", err);
    return NextResponse.json(
      { error: "Unexpected error while analyzing products." },
      { status: 500 }
    );
  }
}

