/**
 * Embeddable widget script tags for customer sites.
 * `async` avoids parser-blocking / Theme Check ParserBlockingScript warnings.
 */

function normalizeOrigin(origin: string): string {
  const t = origin.trim().replace(/\/$/, "");
  return t || "https://yourapp.com";
}

/** Single-line HTML for WooCommerce, custom sites, or any layout before </body>. */
export function widgetScriptTagHtml(origin: string, chatbotId: string | null): string {
  const base = normalizeOrigin(origin);
  const id = chatbotId?.trim() || "YOUR_BOT_ID";
  return `<script async src="${base}/widget.js" data-bot-id="${id}"></script>`;
}

/**
 * Shopify `theme.liquid`: wraps the script so Theme Check does not flag RemoteAsset;
 * `async` satisfies ParserBlockingScript.
 */
export function shopifyThemeLiquidSnippet(origin: string, chatbotId: string | null): string {
  const base = normalizeOrigin(origin);
  const id = chatbotId?.trim() || "YOUR_BOT_ID";
  return `{% # theme-check-disable RemoteAsset %}
<script async src="${base}/widget.js" data-bot-id="${id}"></script>
{% # theme-check-enable RemoteAsset %}`;
}
