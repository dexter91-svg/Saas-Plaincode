/**
 * Store-agnostic scraper: product feeds (Shopify JSON, WooCommerce Store API),
 * sitemaps, and fallback HTML extraction. No captcha bypass; uses public endpoints only.
 */

export type StoreType = "shopify" | "woocommerce" | "custom";

export interface ScrapedProduct {
  name: string;
  price?: string;
  url?: string;
  image?: string;
  description?: string;
}

const DEFAULT_FETCH_OPTIONS = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
};

const FETCH_TIMEOUT_MS = 18000;
const MAX_PRODUCTS_FROM_FEED = 100;
const MAX_PRODUCT_URLS_FROM_SITEMAP = 60;
const MAX_PRODUCT_PAGES_TO_FETCH = 25;

/** Detect if HTML is a CAPTCHA / bot challenge page so we don't use it as real content */
export function isCaptchaOrBotPage(html: string): boolean {
  const lower = html.toLowerCase();
  const patterns = [
    "are you a human",
    "captcha",
    "check the captcha",
    "check the box below",
    "we can't quite tell if you're a person",
    "person or a script",
    "bot detection",
    "detecting...",
    "please verify you are human",
    "verify you are human",
    "security check",
    "unusual traffic",
    "blocked by captcha",
    "recaptcha",
    "hcaptcha",
    "turnstile",
    "cloudflare",
    "please complete the security check",
    "enable javascript and cookies",
    "access denied",
    "you have been blocked",
    "blocked your request",
  ];
  return patterns.some((p) => lower.includes(p));
}

/** Get origin from URL (no path) */
export function getBaseUrl(inputUrl: string): string {
  try {
    const u = new URL(inputUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return inputUrl.replace(/\/$/, "").replace(/(https?:\/\/[^/]+).*/, "$1");
  }
}

const DETECT_TIMEOUT_MS = 5000;

async function fetchDetect(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DETECT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { ...DEFAULT_FETCH_OPTIONS.headers, Accept: "application/json" },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * When a site denies access (403/CAPTCHA), probe known endpoints to detect if it's
 * Shopify or WooCommerce so we can show the right next step (app vs snippet).
 */
export async function detectStorePlatform(inputUrl: string): Promise<StoreType> {
  const base = getBaseUrl(inputUrl).replace(/\/$/, "");
  try {
    const host = new URL(base).hostname.toLowerCase();
    if (host.endsWith(".myshopify.com")) return "shopify";
  } catch {
    /* ignore */
  }

  try {
    const shopifyRes = await fetchDetect(`${base}/products.json?limit=1`);
    if (shopifyRes.ok) {
      const data = (await shopifyRes.json()) as { products?: unknown };
      if (Array.isArray(data?.products)) return "shopify";
    }
  } catch {
    /* not Shopify or blocked */
  }

  try {
    const wcRes = await fetchDetect(`${base}/wp-json/wc/store/v1/products?per_page=1`);
    if (wcRes.ok) return "woocommerce";
    const wpRes = await fetchDetect(`${base}/wp-json`);
    if (wpRes.ok) {
      const data = (await wpRes.json()) as { namespaces?: string[] };
      if (Array.isArray(data?.namespaces) && data.namespaces.some((n: string) => n.includes("wc"))) return "woocommerce";
    }
  } catch {
    /* not WooCommerce or blocked */
  }

  return "custom";
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const res = await fetch(url, {
    ...options,
    headers: { ...DEFAULT_FETCH_OPTIONS.headers, ...options.headers },
    signal: controller.signal,
  });
  clearTimeout(timeout);
  return res;
}

// ---- Shopify ----

/** Shopify: GET /products.json?limit=250&page=N */
export async function fetchShopifyProductsJson(
  baseUrl: string
): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = [];
  let page = 1;
  const limit = 250;

  while (products.length < MAX_PRODUCTS_FROM_FEED) {
    const u = `${baseUrl.replace(/\/$/, "")}/products.json?limit=${limit}&page=${page}`;
    const res = await fetchWithTimeout(u, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { products?: unknown[] };
    const list = Array.isArray(data.products) ? data.products : [];
    if (list.length === 0) break;
    for (const p of list) {
      const rec = p as {
        title?: string;
        body_html?: string;
        variants?: { price?: string }[];
        handle?: string;
        images?: { src?: string }[];
      };
      const name = typeof rec.title === "string" ? rec.title.trim() : "";
      if (!name) continue;
      const price = rec.variants?.[0]?.price;
      const image = rec.images?.[0]?.src;
      const productPath = typeof rec.handle === "string" ? rec.handle : "";
      const url = productPath ? `${baseUrl}/products/${productPath}` : undefined;
      products.push({
        name,
        price: typeof price === "string" ? price : undefined,
        url,
        image: typeof image === "string" ? image : undefined,
        description:
          typeof rec.body_html === "string"
            ? rec.body_html.replace(/<[^>]+>/g, " ").trim().slice(0, 500)
            : undefined,
      });
    }
    if (list.length < limit) break;
    page++;
  }
  return products;
}

/** Parse sitemap XML and return <loc> URLs that look like product URLs */
function parseSitemapXml(xml: string, productPathPattern: RegExp): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = locRegex.exec(xml)) !== null) {
    const loc = m[1].trim();
    if (productPathPattern.test(loc)) urls.push(loc);
  }
  return urls;
}

const MAX_INFO_URLS_FROM_SITEMAP = 30;

function collectLocsFromSitemapXml(xml: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = locRegex.exec(xml)) !== null) {
    const loc = m[1].trim();
    if (loc) urls.push(loc);
  }
  return urls;
}

const INFO_PATH_KEYWORDS = /(about|about[_-]us|contact|contact[_-]us|faq|shipping|return|refund|polic|policies|terms|help|support|warranty|privacy|deliver|delivery|orders|legal|our[_-]story|questions)/i;

/** Heuristic: URL path looks like policy / about / contact / shipping (for sitemap + crawl filtering) */
export function isLikelyInfoOrPolicyPageUrl(href: string): boolean {
  try {
    const p = new URL(href).pathname.toLowerCase();
    if (/\.(xml|js|css|json|png|jpe?g|gif|webp|svg|pdf|gz|zip)(\?|$)/i.test(p)) return false;
    if (p === "/" || p === "" || p === "/index" || p === "/index.html") return false;
    if (/\/(cart|checkout|account|admin|my-account)(\/|$)/i.test(p)) return false;
    return (
      INFO_PATH_KEYWORDS.test(p) ||
      (/\/(pages?|p)\/[^/]+/i.test(p) && !/\/(product|products|item|shop)\b/i.test(p))
    );
  } catch {
    return false;
  }
}

/**
 * Discover policy / about / contact / FAQ type URLs from sitemap(s).
 * Tries the same sitemap locations as product discovery; for sitemap index files,
 * follows child sitemaps and collects matching page URLs.
 */
export async function fetchInfoAndPolicyUrlsFromSitemap(baseUrl: string): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (u: string) => {
    if (!u || out.length >= MAX_INFO_URLS_FROM_SITEMAP) return;
    if (!u.startsWith("http")) return;
    if (!isLikelyInfoOrPolicyPageUrl(u)) return;
    const key = u.split("#")[0];
    if (seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };

  const base = getBaseUrl(baseUrl).replace(/\/$/, "");
  const sitemapCandidates = [
    `${base}/sitemap.xml`,
    `${base}/sitemap_index.xml`,
    `${base}/sitemap-index.xml`,
    `${base}/wp-sitemap.xml`,
    `${base}/sitemap_pages_1.xml`,
    `${base}/sitemap_products_1.xml`,
    `${base}/product-sitemap.xml`,
    `${base}/sitemap-products.xml`,
  ];

  let sitemapBody: string | null = null;
  for (const candidate of sitemapCandidates) {
    try {
      const res = await fetchWithTimeout(candidate, {
        headers: { Accept: "application/xml, text/xml, */*" },
      });
      if (res.ok) {
        sitemapBody = await res.text();
        break;
      }
    } catch {
      // continue
    }
  }

  if (!sitemapBody) return [];

  const topLocs = collectLocsFromSitemapXml(sitemapBody);
  const isLikelyIndex =
    topLocs.length > 1 &&
    topLocs.slice(0, Math.min(8, topLocs.length)).filter(
      (l) => /\.(xml|gz)(\?.*)?$/i.test(l) || /wp-sitemap|sitemap[._-]/i.test(l)
    ).length >= 2;

  if (isLikelyIndex) {
    for (const loc of topLocs.slice(0, 10)) {
      if (!/\.(xml|gz)(\?.*)?$/i.test(loc) && isLikelyInfoOrPolicyPageUrl(loc)) {
        add(loc);
        if (out.length >= MAX_INFO_URLS_FROM_SITEMAP) return out;
        continue;
      }
      if (!/\.(xml|gz)(\?.*)?$/i.test(loc)) continue;
      try {
        const r = await fetchWithTimeout(loc, { headers: { Accept: "application/xml, text/xml, */*" } });
        if (!r.ok) continue;
        const subXml = await r.text();
        for (const u of collectLocsFromSitemapXml(subXml)) {
          add(u);
          if (out.length >= MAX_INFO_URLS_FROM_SITEMAP) return out;
        }
      } catch {
        // skip
      }
    }
  } else {
    for (const u of topLocs) {
      add(u);
      if (out.length >= MAX_INFO_URLS_FROM_SITEMAP) return out;
    }
  }
  return out;
}

/** Fetch sitemap index or sitemap and return product URLs */
export async function fetchProductUrlsFromSitemap(
  baseUrl: string,
  storeType: StoreType
): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();

  const productPatterns: Record<StoreType, RegExp> = {
    shopify: /\/products\/[^/?#]+/i,
    woocommerce: /\/(product|product-category)\/[^/?#]+/i,
    // e.g. /collections/season/products/slug (headless/custom Shopify) or /products/slug
    custom:
      /\/collections\/[^/]+\/products\/[^/?#]+|\/(product|products|product-category|item|shop|store|catalog|p)\/[^/?#]+/i,
  };
  const pattern = productPatterns[storeType];

  const sitemapCandidates = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap-index.xml`,
    `${baseUrl}/sitemap_products_1.xml`,
    `${baseUrl}/product-sitemap.xml`,
    `${baseUrl}/sitemap-products.xml`,
  ];

  let sitemapBody: string | null = null;
  let sitemapUrl = "";

  for (const candidate of sitemapCandidates) {
    try {
      const res = await fetchWithTimeout(candidate, {
        headers: { Accept: "application/xml, text/xml, */*" },
      });
      if (res.ok) {
        sitemapBody = await res.text();
        sitemapUrl = candidate;
        break;
      }
    } catch {
      // continue
    }
  }

  if (!sitemapBody) return [];

  // Sitemap index: <sitemap><loc>...</loc></sitemap>
  const sitemapIndexLocs = sitemapBody.match(/<loc>\s*([^<]+)\s*<\/loc>/gi);
  if (sitemapIndexLocs && sitemapIndexLocs.length > 1) {
    for (const tag of sitemapIndexLocs.slice(0, 10)) {
      const loc = tag.replace(/<\/?loc>\s*/gi, "").trim();
      if (!loc || seen.has(loc)) continue;
      seen.add(loc);
      try {
        const r = await fetchWithTimeout(loc, {
          headers: { Accept: "application/xml, text/xml, */*" },
        });
        if (r.ok) {
          const xml = await r.text();
          for (const u of parseSitemapXml(xml, pattern)) {
            if (out.length >= MAX_PRODUCT_URLS_FROM_SITEMAP) return out;
            if (!seen.has(u)) {
              seen.add(u);
              out.push(u);
            }
          }
        }
      } catch {
        // skip this sitemap
      }
    }
    return out;
  }

  for (const u of parseSitemapXml(sitemapBody, pattern)) {
    if (out.length >= MAX_PRODUCT_URLS_FROM_SITEMAP) break;
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

/** Extract product from Shopify product page (JSON-LD or meta) */
function extractProductFromShopifyHtml(html: string, pageUrl: string): ScrapedProduct | null {
  // JSON-LD Product
  const ldJsonMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ldJsonMatch) {
    try {
      const json = JSON.parse(ldJsonMatch[1].trim()) as { "@type"?: string; name?: string; offers?: { price?: string } };
      const arr = Array.isArray(json) ? json : [json];
      for (const item of arr) {
        if (item["@type"] === "Product" && item.name) {
          const price = item.offers?.price ?? (item as { price?: string }).price;
          return {
            name: String(item.name).trim(),
            price: typeof price === "string" ? price : undefined,
            url: pageUrl,
          };
        }
      }
    } catch {
      // ignore
    }
  }
  // Meta product
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitle) {
    return { name: ogTitle[1].trim(), url: pageUrl };
  }
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const name = titleMatch[1].replace(/\s*[-|]\s*.*$/, "").trim();
    if (name.length > 0 && name.length < 200) return { name, url: pageUrl };
  }
  return null;
}

/** Extract product from generic/WooCommerce product page */
function extractProductFromGenericHtml(html: string, pageUrl: string): ScrapedProduct | null {
  const ldJsonMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ldJsonMatch) {
    try {
      const json = JSON.parse(ldJsonMatch[1].trim()) as { "@type"?: string; name?: string; offers?: { price?: string }; image?: string };
      const arr = Array.isArray(json) ? json : [json];
      for (const item of arr) {
        if (item["@type"] === "Product" && item.name) {
          const offers = item.offers as { price?: string } | undefined;
          const price = offers?.price ?? (item as { price?: string }).price;
          const image = Array.isArray(item.image) ? item.image[0] : item.image;
          return {
            name: String(item.name).trim(),
            price: typeof price === "string" ? price : undefined,
            url: pageUrl,
            image: typeof image === "string" ? image : undefined,
          };
        }
      }
    } catch {
      // ignore
    }
  }
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitle) {
    const name = ogTitle[1].trim();
    if (name.length > 0 && name.length < 200) return { name, url: pageUrl };
  }
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const name = titleMatch[1].replace(/\s*[-|]\s*.*$/, "").trim();
    if (name.length > 0 && name.length < 200) return { name, url: pageUrl };
  }
  return null;
}

/** Fetch product pages and extract product data (rate-limited) */
export async function fetchProductsFromUrls(
  productUrls: string[],
  storeType: StoreType
): Promise<ScrapedProduct[]> {
  const slice = productUrls.slice(0, MAX_PRODUCT_PAGES_TO_FETCH);
  const products: ScrapedProduct[] = [];
  const extract =
    storeType === "shopify" ? extractProductFromShopifyHtml : extractProductFromGenericHtml;

  for (const u of slice) {
    try {
      const res = await fetchWithTimeout(u);
      if (!res.ok) continue;
      const html = await res.text();
      const p = extract(html, u);
      if (p && p.name) products.push(p);
    } catch {
      // skip
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return products;
}

// ---- WooCommerce ----

/** WooCommerce Store API: GET /wp-json/wc/store/v1/products (public, no auth) */
export async function fetchWooCommerceStoreProducts(
  baseUrl: string
): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = [];
  let page = 1;
  const perPage = 50;

  while (products.length < MAX_PRODUCTS_FROM_FEED) {
    const u = `${baseUrl.replace(/\/$/, "")}/wp-json/wc/store/v1/products?per_page=${perPage}&page=${page}`;
    const res = await fetchWithTimeout(u, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const list = (await res.json()) as unknown[];
    if (!Array.isArray(list) || list.length === 0) break;
    for (const p of list) {
      const rec = p as {
        name?: string;
        permalink?: string;
        prices?: { price_range?: { min_price?: string }; regular_price?: string };
        images?: { src?: string; alt?: string }[];
      };
      const name = typeof rec.name === "string" ? rec.name.trim() : "";
      if (!name) continue;
      const price =
        rec.prices?.price_range?.min_price ?? rec.prices?.regular_price;
      const image = rec.images?.[0]?.src;
      products.push({
        name,
        price: typeof price === "string" ? price : undefined,
        url: typeof rec.permalink === "string" ? rec.permalink : undefined,
        image: typeof image === "string" ? image : undefined,
      });
    }
    if (list.length < perPage) break;
    page++;
  }
  return products;
}

/** Some WooCommerce sites use /wp-json/wc/v3/products but that needs auth; we only use store API and sitemap here. */

// ---- Main entry: run by store type ----

export interface ScraperResult {
  title: string;
  description: string;
  content: string;
  products: ScrapedProduct[];
}

/** Fetch homepage HTML and extract title, description, and text content (for content string) */
async function fetchHomepageMeta(
  url: string,
  loadCheerio: (html: string) => { title: string; description: string; content: string }
): Promise<{ title: string; description: string; content: string }> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Homepage ${res.status}`);
  const html = await res.text();
  if (isCaptchaOrBotPage(html)) throw new Error("CAPTCHA_DETECTED");
  return loadCheerio(html);
}

/** Run scraper by store type; returns products + placeholder content. Caller can still fetch homepage for content. */
export async function runScraper(
  inputUrl: string,
  storeType: StoreType,
  loadCheerio: (html: string) => { title: string; description: string; content: string }
): Promise<ScraperResult> {
  const baseUrl = getBaseUrl(inputUrl);
  let products: ScrapedProduct[] = [];
  let title = "";
  let description = "";
  let content = "";

  if (storeType === "shopify") {
    products = await fetchShopifyProductsJson(baseUrl);
    if (products.length === 0) {
      const sitemapUrls = await fetchProductUrlsFromSitemap(baseUrl, "shopify");
      if (sitemapUrls.length > 0) {
        products = await fetchProductsFromUrls(sitemapUrls, "shopify");
      }
    }
  } else if (storeType === "woocommerce") {
    products = await fetchWooCommerceStoreProducts(baseUrl);
    if (products.length === 0) {
      const sitemapUrls = await fetchProductUrlsFromSitemap(baseUrl, "woocommerce");
      if (sitemapUrls.length > 0) {
        products = await fetchProductsFromUrls(sitemapUrls, "woocommerce");
      }
    }
  } else {
    // custom: sitemap first, then product pages
    const sitemapUrls = await fetchProductUrlsFromSitemap(baseUrl, "custom");
    if (sitemapUrls.length > 0) {
      products = await fetchProductsFromUrls(sitemapUrls, "custom");
    }
  }

  try {
    const meta = await fetchHomepageMeta(inputUrl, loadCheerio);
    title = meta.title;
    description = meta.description;
    content = meta.content;
  } catch {
    title = new URL(baseUrl).hostname || "Store";
  }

  // If we still have no products, caller's existing HTML scrape can add from homepage (handled in route)
  return { title, description, content, products };
}
