import { NextRequest, NextResponse } from "next/server";
import { load } from "cheerio";
import {
  runScraper,
  isCaptchaOrBotPage,
  detectStorePlatform,
  getBaseUrl,
  fetchInfoAndPolicyUrlsFromSitemap,
  type StoreType,
} from "@/lib/scraper";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 90; // feed + sitemaps + policy/info pages

function buildContentFromCheerio($: ReturnType<typeof load>): string {
  const texts: string[] = [];
  for (const tagName of ["h1", "h2", "h3", "h4"]) {
    $(tagName).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text) texts.push(`${tagName.toUpperCase()}: ${text}`);
    });
  }
  $("p").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) texts.push(text);
  });
  $("li").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) texts.push(`• ${text}`);
  });
  $("td, th").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) texts.push(text);
  });
  return texts.join("\n\n");
}

/** Extract contact info (email, contact page, social links) for chatbot to suggest when user has complex queries */
function extractContactFromPage($: ReturnType<typeof load>, baseUrl: string): string {
  const emails = new Set<string>();
  const contactUrls: string[] = [];
  const social: { name: string; url: string }[] = [];
  const socialDomains: { pattern: RegExp; name: string }[] = [
    { pattern: /instagram\.com/i, name: "Instagram" },
    { pattern: /facebook\.com|fb\.com/i, name: "Facebook" },
    { pattern: /twitter\.com|x\.com/i, name: "Twitter/X" },
    { pattern: /linkedin\.com/i, name: "LinkedIn" },
    { pattern: /youtube\.com/i, name: "YouTube" },
    { pattern: /pinterest\.com/i, name: "Pinterest" },
    { pattern: /tiktok\.com/i, name: "TikTok" },
  ];

  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const match = href.replace(/^mailto:/i, "").split(/[?&#]/)[0].trim();
    if (match && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(match)) emails.add(match);
  });
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().replace(/\s+/g, " ").trim();
    try {
      const full = href.startsWith("http") ? href : new URL(href, baseUrl).href;
      if (/contact|about|reach|support|help|get in touch/i.test(href) || /contact|about|reach|support|help/i.test(text)) {
        if (full.startsWith("http") && !contactUrls.includes(full)) contactUrls.push(full);
      }
      for (const { pattern, name } of socialDomains) {
        if (pattern.test(full) && !social.some((s) => s.url === full)) {
          social.push({ name, url: full });
          break;
        }
      }
    } catch {
      /* ignore */
    }
  });
  const parts: string[] = [];
  if (emails.size > 0) parts.push("Email: " + Array.from(emails).slice(0, 3).join(", "));
  if (contactUrls.length > 0) parts.push("Contact page: " + contactUrls[0]);
  social.forEach((s) => parts.push(`${s.name}: ${s.url}`));
  if (parts.length === 0) return "";
  return "\n\n--- CONTACT / REACH THE STORE (use when suggesting user contact the store) ---\n" + parts.join("\n");
}

/** Match price-like strings: $12, $12.99, £20, 20.00, etc. */
function parsePriceFromText(text: string): string | null {
  const trimmed = text.replace(/\s+/g, " ").trim();
  const match = trimmed.match(/(?:^\D*)?(\$|£|€|USD|EUR)\s*(\d+(?:[.,]\d{2})?)|(\d+(?:[.,]\d{2})?)\s*(?:USD|EUR|\$|£|€)?/i);
  if (!match) return null;
  const amount = (match[2] || match[3] || "").replace(",", ".");
  const sym = match[1] || (trimmed.includes("£") ? "£" : trimmed.includes("€") ? "€" : "$");
  if (!amount || isNaN(parseFloat(amount))) return null;
  return (sym === "£" ? "£" : sym === "€" ? "€" : "$") + amount;
}

/** Pull Product nodes from JSON-LD (many modern sites, including headless/commerce) */
function extractProductsFromJsonLd(
  fullHtml: string,
  pageBase: string
): { name: string; price?: string; url?: string }[] {
  const out: { name: string; price?: string; url?: string }[] = [];
  const seen = new Set<string>();
  const scriptRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  const resolveUrl = (u: string | undefined): string | undefined => {
    if (!u || typeof u !== "string") return undefined;
    const t = u.trim();
    if (!t) return undefined;
    if (t.startsWith("http://") || t.startsWith("https://")) return t;
    try {
      return new URL(t, pageBase).href;
    } catch {
      return undefined;
    }
  };
  const priceFromOffer = (off: unknown): string | undefined => {
    if (!off || typeof off !== "object") return undefined;
    const o = off as Record<string, unknown>;
    const p = o.price;
    if (p != null && (typeof p === "string" || typeof p === "number")) return String(p);
    const ag = o.priceSpecification;
    if (Array.isArray(ag)) {
      for (const x of ag) {
        if (x && typeof x === "object") {
          const pr = (x as { price?: string | number }).price;
          if (pr != null) return String(pr);
        }
      }
    } else if (ag && typeof ag === "object") {
      const pr = (ag as { price?: string | number }).price;
      if (pr != null) return String(pr);
    }
    return undefined;
  };
  const isProductType = (t: unknown): boolean => {
    if (t === undefined || t === null) return false;
    const ok = (s: string) => {
      const u = s.trim();
      return (
        u === "Product" ||
        u === "https://schema.org/Product" ||
        u === "http://schema.org/Product" ||
        /(^|\/)Product$/i.test(u)
      ) && !/ProductGroup|ProductModel/i.test(u);
    };
    if (Array.isArray(t)) return t.some((x) => typeof x === "string" && ok(x));
    return typeof t === "string" && ok(t);
  };
  const recordProduct = (obj: Record<string, unknown>) => {
    let name = "";
    if (typeof obj.name === "string") name = obj.name;
    else if (Array.isArray(obj.name) && typeof obj.name[0] === "string") name = obj.name[0];
    else if (typeof obj.headline === "string") name = obj.headline;
    name = name.replace(/\s+/g, " ").trim();
    if (name.length < 2 || name.length > 200) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    let url: string | undefined;
    if (typeof obj.url === "string") url = resolveUrl(obj.url);
    else if (typeof obj["@id"] === "string" && obj["@id"].startsWith("http")) url = obj["@id"];
    else if (typeof obj.sameAs === "string") url = resolveUrl(obj.sameAs);
    let price: string | undefined;
    if (obj.offers) {
      const off = (Array.isArray(obj.offers) ? obj.offers[0] : obj.offers) as Record<string, unknown> | undefined;
      price = off ? priceFromOffer(off) : undefined;
    }
    out.push(price ? { name, price, url } : { name, url });
  };
  const walk = (node: unknown, depth: number) => {
    if (depth > 14 || node === null || node === undefined) return;
    if (Array.isArray(node)) {
      for (const x of node) walk(x, depth + 1);
      return;
    }
    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj["@graph"])) {
      for (const g of obj["@graph"]) walk(g, depth + 1);
    }
    if (isProductType(obj["@type"])) {
      recordProduct(obj);
    }
    if (/\bItemList\b/i.test(String(obj["@type"] ?? "")) && obj.itemListElement) {
      walk(obj.itemListElement, depth + 1);
    }
    if (obj.hasVariant) walk(obj.hasVariant, depth + 1);
  };

  while ((m = scriptRe.exec(fullHtml)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw) as unknown;
      walk(data, 0);
    } catch {
      /* non-JSON or truncated */
    }
  }
  return out;
}

function extractProductsFromHomepage(
  $: ReturnType<typeof load>,
  pageBase: string
): { name: string; price?: string; url?: string }[] {
  const products: { name: string; price?: string; url?: string }[] = [];
  const seenNames = new Set<string>();

  try {
    const rawHtml = $.html();
    for (const p of extractProductsFromJsonLd(rawHtml, pageBase)) {
      if (!seenNames.has(p.name)) {
        seenNames.add(p.name);
        products.push(p);
      }
    }
  } catch {
    /* ignore */
  }

  // 1) Schema.org Product: get name + price from same block
  $('[itemtype*="Product"]').each((_, block) => {
    const $block = $(block);
    const nameEl = $block.find('[itemprop="name"]').first();
    const priceEl = $block.find('[itemprop="price"]').first();
    const name = nameEl.text().replace(/\s+/g, " ").trim();
    if (!name || name.length < 2 || name.length > 200) return;
    const priceRaw = priceEl.text().replace(/\s+/g, " ").trim();
    const price = parsePriceFromText(priceRaw) || (priceRaw.match(/\d+(?:[.,]\d{2})?/) ? priceRaw : undefined);
    if (!seenNames.has(name)) {
      seenNames.add(name);
      products.push(price ? { name, price } : { name });
    }
  });

  // 2) Common product + price in same container (e.g. .product-card, .product-item)
  const containerSelectors = [
    ".product-card", ".product-item", ".product-block", ".product-tile", ".grid-product",
    ".product-card__inner", ".ProductItem", ".collection-item", ".card--product",
    "[data-product-id]", ".woocommerce-loop-product__link",
  ];
  const titleSelectors = [
    ".product-title", ".product-name", ".product-card__title", "[data-product-title]",
    ".product__title", ".card__title", ".product_title", "h2", "h3", "h4",
  ];
  const priceSelectors = [
    "[itemprop=\"price\"]", ".price", ".product-price", ".product__price",
    "[data-price]", ".amount", ".product-card__price", ".money",
  ];
  for (const containerSel of containerSelectors) {
    try {
      $(containerSel).each((_, cont) => {
        const $cont = $(cont);
        let name = "";
        for (const sel of titleSelectors) {
          const el = $cont.find(sel).first();
          const t = el.text().replace(/\s+/g, " ").trim();
          if (t && t.length > 1 && t.length < 200 && !/policy|privacy|cart|account/i.test(t)) {
            name = t;
            break;
          }
        }
        if (!name || seenNames.has(name)) return;
        let price: string | undefined;
        for (const sel of priceSelectors) {
          const el = $cont.find(sel).first();
          const raw = el.text().replace(/\s+/g, " ").trim();
          const p = raw ? (parsePriceFromText(raw) || (raw.match(/\$|£|€|\d+[.,]\d{2}/) ? raw : undefined)) : undefined;
          if (p) { price = p; break; }
        }
        seenNames.add(name);
        products.push(price ? { name, price } : { name });
      });
    } catch {
      /* ignore */
    }
  }

  // 3) Fallback: titles only (no price), avoid duplicates
  if (products.length === 0) {
    const productSelectors = [
      ".product-title", ".product-name", ".product-card__title", ".product-card-title",
      "[data-product-title]", ".ProductItem__Title", ".product-item__title", ".product-single__title",
      ".product__title", ".grid-product__title", ".card__title", ".product__name",
      "h2.product-title", "h3.product-title", ".woocommerce-loop-product__title", ".product_title",
      ".product-name a", ".product-card h3", ".product-item h3", ".collection-item__title",
      ".product-block__title", "a.product-link", ".product-title a", ".product-list-item__name",
      ".product-grid-item__title", ".product-tile__name",
    ];
    for (const selector of productSelectors) {
      try {
        $(selector).each((_, el) => {
          const t = $(el).text().replace(/\s+/g, " ").trim();
          if (t && t.length > 1 && t.length < 200 && !seenNames.has(t)) {
            seenNames.add(t);
            products.push({ name: t });
          }
        });
      } catch {
        /* ignore */
      }
    }
  }
  if (products.length === 0) {
    $("h2, h3, h4").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t && t.length > 1 && t.length < 120 && !/policy|privacy|terms|contact|about|faq|help|cart|account/i.test(t) && !seenNames.has(t)) {
        seenNames.add(t);
        products.push({ name: t });
      }
    });
  }

  return products.slice(0, 80);
}

/** When sitemap is missing paths, these are tried under the site root (order = common chatbot Q&A) */
const STATIC_INFO_PATHS = [
  "/about",
  "/about-us",
  "/our-story",
  "/contact",
  "/contact-us",
  "/faq",
  "/help",
  "/shipping",
  "/shipping-policy",
  "/returns",
  "/return-policy",
  "/refund",
  "/refund-policy",
  "/policies",
  "/policies/shipping-policy",
  "/policies/return-policy",
  "/policies/privacy-policy",
  "/terms",
  "/terms-of-service",
  "/privacy",
  "/privacy-policy",
  "/pages/faq",
  "/pages/about",
  "/pages/contact",
  "/pages/shipping",
  "/pages/returns",
];

const MAX_EXTRA_INFO_PAGES = 10;
const MAX_INFO_PAGE_TEXT = 6000;

/** Sitemap (policy/about) + static paths, merged into homepage scrape content */
async function appendInfoPolicyPages(
  pageUrl: string,
  homeContent: string,
  fetchWithTimeout: (u: string) => Promise<Response>,
  base: string
): Promise<string> {
  let homeKey = "";
  try {
    const u = new URL(pageUrl);
    homeKey = `${u.origin}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    homeKey = pageUrl.toLowerCase();
  }
  const seen = new Set<string>([homeKey]);
  const markAndKeep = (href: string): string | null => {
    try {
      const u = new URL(href);
      const k = `${u.origin}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
      if (seen.has(k)) return null;
      seen.add(k);
      return href;
    } catch {
      return null;
    }
  };

  let fromSitemap: string[] = [];
  try {
    fromSitemap = await fetchInfoAndPolicyUrlsFromSitemap(base);
  } catch {
    fromSitemap = [];
  }
  const staticHrefs: string[] = [];
  for (const p of STATIC_INFO_PATHS) {
    try {
      staticHrefs.push(new URL(p, base + "/").href);
    } catch {
      /* skip */
    }
  }

  const toFetch: string[] = [];
  for (const h of fromSitemap) {
    const k = markAndKeep(h);
    if (k) toFetch.push(k);
  }
  for (const h of staticHrefs) {
    const k = markAndKeep(h);
    if (k) toFetch.push(k);
  }

  const parts: string[] = [];
  let n = 0;
  for (const target of toFetch) {
    if (n >= MAX_EXTRA_INFO_PAGES) break;
    try {
      const res = await fetchWithTimeout(target);
      if (!res.ok) continue;
      const html = await res.text();
      if (isCaptchaOrBotPage(html)) continue;
      const $ = load(html);
      const text = buildContentFromCheerio($) + extractContactFromPage($, base);
      if (text.replace(/\s/g, "").length < 50) continue;
      const chunk = text.length > MAX_INFO_PAGE_TEXT ? text.slice(0, MAX_INFO_PAGE_TEXT) + "\n[...]" : text;
      parts.push(`\n\n--- Page: ${target} ---\n${chunk}`);
      n++;
    } catch {
      // skip
    }
  }
  return homeContent + parts.join("");
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "scrape", LIMITS.scrape);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many scrape requests. Try again in a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const storeType = typeof body.storeType === "string" && ["shopify", "woocommerce", "custom"].includes(body.storeType)
      ? (body.storeType as StoreType)
      : null;

    if (!url) {
      return NextResponse.json({ error: "Missing url in body." }, { status: 400 });
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return NextResponse.json(
        { error: "URL must start with http:// or https://" },
        { status: 400 }
      );
    }

    const fetchOptions = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    };

    const fetchWithTimeout = async (targetUrl: string): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(targetUrl, { ...fetchOptions, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    };

    const baseUrlForContact = getBaseUrl(url);

    const loadCheerio = (html: string) => {
      const $ = load(html);
      const title = $("title").first().text().trim() ?? "";
      let description = $('meta[name="description"]').attr("content")?.trim() ?? "";
      if (!description) description = $('meta[property="og:description"]').attr("content")?.trim() ?? "";
      const content = buildContentFromCheerio($) + extractContactFromPage($, baseUrlForContact);
      return { title, description, content };
    };

    // 0) No store type: sitemap (products) + homepage + sitemap/ policy pages (custom sites)
    if (!storeType) {
      const result = await runScraper(url, "custom", loadCheerio);
      let finalContent = result.content;
      try {
        finalContent = await appendInfoPolicyPages(url, result.content, fetchWithTimeout, baseUrlForContact);
      } catch (e) {
        console.warn("appendInfoPolicyPages (no store type):", e);
      }
      let products: { name: string; price?: string; url?: string }[] = result.products.map((p) => ({
        name: p.name,
        price: p.price,
        url: p.url,
      }));
      if (products.length === 0) {
        try {
          const r = await fetchWithTimeout(url);
          if (r.ok) products = extractProductsFromHomepage(load(await r.text()), baseUrlForContact);
        } catch {
          /* keep empty */
        }
      }
      return NextResponse.json({
        title: result.title,
        description: result.description,
        content: finalContent,
        products,
      });
    }

    // 1) If store type is set, try product feed + sitemap scraper first
    if (storeType) {
      try {
        const result = await runScraper(url, storeType, loadCheerio);
        let finalContent = result.content;
        try {
          finalContent = await appendInfoPolicyPages(url, result.content, fetchWithTimeout, baseUrlForContact);
        } catch (e) {
          console.warn("appendInfoPolicyPages (store type):", e);
        }
        const products = result.products.map((p) => ({ name: p.name, price: p.price, url: p.url }));
        return NextResponse.json({
          title: result.title,
          description: result.description,
          content: finalContent,
          products,
        });
      } catch (feedErr) {
        const msg = feedErr instanceof Error ? feedErr.message : "";
        if (msg === "CAPTCHA_DETECTED") {
          const detectedPlatform = await detectStorePlatform(url);
          const hint =
            detectedPlatform === "shopify"
              ? " This looks like a Shopify store — install our app from the Shopify App Store to connect."
              : detectedPlatform === "woocommerce"
                ? " This looks like WooCommerce — we can connect via the store’s product feed or snippet."
                : "";
          return NextResponse.json(
            {
              error:
                "This site showed a security check (CAPTCHA or bot detection). We can't read the page automatically." +
                hint +
                (detectedPlatform === "custom" ? " Try a Shopify or WooCommerce store, or a different URL." : ""),
              code: "ACCESS_DENIED",
              detectedPlatform,
            },
            { status: 403 }
          );
        }
        console.warn("Feed/sitemap scrape failed, falling back to homepage:", feedErr);
      }
    }

    // 2) Single-page scrape (legacy + fallback)
    let response = await fetchWithTimeout(url);
    if (!response.ok && (response.status === 429 || response.status === 503)) {
      await new Promise((r) => setTimeout(r, 4000));
      response = await fetchWithTimeout(url);
    }

    if (!response.ok) {
      const status = response.status;
      const messages: Record<number, string> = {
        429: "This site is rate-limiting requests (429). Try again in a few minutes or use a different store URL.",
        403: "Access denied (403). This site may block automated requests. Try a different store URL.",
        404: "Page not found (404). Check the URL and try again.",
        503: "Service temporarily unavailable (503). Try again in a minute or use a different URL.",
        502: "The site returned a bad gateway (502). Try again shortly.",
        500: "The site returned an error (500). Try again or use a different URL.",
      };
      let errorMessage =
        messages[status] ||
        `The site returned ${status}. Please check the URL and try again.`;
      const code = status === 429 ? "RATE_LIMIT" : status === 403 ? "ACCESS_DENIED" : undefined;
      let detectedPlatform: StoreType | undefined;
      if (status === 403) {
        detectedPlatform = await detectStorePlatform(url);
        if (detectedPlatform === "shopify") errorMessage += " This looks like a Shopify store — install our app from the Shopify App Store to connect.";
        else if (detectedPlatform === "woocommerce") errorMessage += " This looks like WooCommerce — we can connect via the store's product feed or snippet.";
      }
      const httpStatus = status === 429 ? 429 : status >= 500 ? 502 : 502;
      return NextResponse.json(
        { error: errorMessage, ...(code && { code }), ...(detectedPlatform && { detectedPlatform }) },
        { status: httpStatus }
      );
    }

    const html = await response.text();
    if (isCaptchaOrBotPage(html)) {
      const detectedPlatform = await detectStorePlatform(url);
      const hint =
        detectedPlatform === "shopify"
          ? " This looks like a Shopify store — install our app from the Shopify App Store to connect."
          : detectedPlatform === "woocommerce"
            ? " This looks like WooCommerce — we can connect via the store's product feed or snippet."
            : " Try a Shopify or WooCommerce store, or a different URL.";
      return NextResponse.json(
        {
          error:
            "This site showed a security check (CAPTCHA or bot detection). We can't read the page automatically." + hint,
          code: "ACCESS_DENIED",
          detectedPlatform,
        },
        { status: 403 }
      );
    }
    const $ = load(html);

    const title = $("title").first().text().trim() ?? "";
    let description = $('meta[name="description"]').attr("content")?.trim() ?? "";
    if (!description) {
      description = $('meta[property="og:description"]').attr("content")?.trim() ?? "";
    }

    let finalContent = buildContentFromCheerio($) + extractContactFromPage($, baseUrlForContact);
    const products = extractProductsFromHomepage($, baseUrlForContact);
    try {
      finalContent = await appendInfoPolicyPages(url, finalContent, fetchWithTimeout, baseUrlForContact);
    } catch (e) {
      console.warn("appendInfoPolicyPages (fallback):", e);
    }

    return NextResponse.json({
      title,
      description,
      content: finalContent,
      products,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("abort") || message.includes("fetch")) {
      return NextResponse.json(
        { error: "Request timed out or URL could not be reached. Please try again." },
        { status: 504 }
      );
    }
    console.error("Scrape API error:", err);
    return NextResponse.json(
      { error: "Unexpected error while scraping website." },
      { status: 500 }
    );
  }
}
