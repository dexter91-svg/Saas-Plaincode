/**
 * Shopify Admin GraphQL API — authenticated store data for a connected (OAuth)
 * store. Replaces the public /products.json feed for stores that have granted
 * access, so data no longer depends on an endpoint bot-protection can block.
 */

const ADMIN_API_VERSION = "2026-10";
const MAX_PRODUCTS = 150;
const REQUEST_TIMEOUT_MS = 15000;

export interface ShopifyAdminProduct {
  name: string;
  price?: string;
  url?: string;
  image?: string;
  description?: string;
}

async function adminGraphQL<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`https://${shop}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Shopify Admin API error: ${res.status}`);
    }
    const json = (await res.json()) as { data?: T; errors?: unknown };
    if (json.errors) {
      throw new Error(`Shopify Admin API GraphQL error: ${JSON.stringify(json.errors)}`);
    }
    if (!json.data) throw new Error("Shopify Admin API returned no data");
    return json.data;
  } finally {
    clearTimeout(timeout);
  }
}

interface ProductsResponse {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: {
      title: string;
      handle: string;
      descriptionHtml: string | null;
      featuredImage: { url: string } | null;
      priceRangeV2: { minVariantPrice: { amount: string } } | null;
    }[];
  };
}

const PRODUCTS_QUERY = `
  query Products($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        title
        handle
        descriptionHtml
        featuredImage { url }
        priceRangeV2 { minVariantPrice { amount } }
      }
    }
  }
`;

export async function fetchShopifyAdminProducts(
  shop: string,
  accessToken: string
): Promise<ShopifyAdminProduct[]> {
  const products: ShopifyAdminProduct[] = [];
  let cursor: string | null = null;

  while (products.length < MAX_PRODUCTS) {
    const data: ProductsResponse = await adminGraphQL<ProductsResponse>(shop, accessToken, PRODUCTS_QUERY, {
      cursor,
    });
    for (const node of data.products.nodes) {
      const name = node.title?.trim();
      if (!name) continue;
      products.push({
        name,
        price: node.priceRangeV2?.minVariantPrice?.amount,
        url: node.handle ? `https://${shop}/products/${node.handle}` : undefined,
        image: node.featuredImage?.url,
        description: node.descriptionHtml
          ? node.descriptionHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500)
          : undefined,
      });
    }
    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }

  return products;
}

interface PoliciesAndPagesResponse {
  shop: {
    shippingPolicy: { title: string; body: string } | null;
    refundPolicy: { title: string; body: string } | null;
    privacyPolicy: { title: string; body: string } | null;
    termsOfService: { title: string; body: string } | null;
  };
  pages: {
    nodes: { title: string; body: string }[];
  };
}

const POLICIES_AND_PAGES_QUERY = `
  query PoliciesAndPages {
    shop {
      shippingPolicy { title body }
      refundPolicy { title body }
      privacyPolicy { title body }
      termsOfService { title body }
    }
    pages(first: 20) {
      nodes { title body }
    }
  }
`;

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Shop policies (shipping/refund/privacy/terms) + custom pages (about/FAQ/etc.), as chatbot knowledge content. */
export async function fetchShopifyAdminInfoContent(shop: string, accessToken: string): Promise<string> {
  const data = await adminGraphQL<PoliciesAndPagesResponse>(shop, accessToken, POLICIES_AND_PAGES_QUERY);
  const parts: string[] = [];

  const policies = [data.shop.shippingPolicy, data.shop.refundPolicy, data.shop.privacyPolicy, data.shop.termsOfService];
  for (const policy of policies) {
    if (!policy?.body) continue;
    const text = stripHtml(policy.body);
    if (text) parts.push(`--- ${policy.title} ---\n${text.slice(0, 4000)}`);
  }

  for (const page of data.pages.nodes) {
    if (!page.body) continue;
    const text = stripHtml(page.body);
    if (text) parts.push(`--- Page: ${page.title} ---\n${text.slice(0, 4000)}`);
  }

  return parts.join("\n\n");
}
