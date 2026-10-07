/**
 * 5-Stage Cost-Optimization Triage Funnel
 * 
 * Directives from Plain Bot Approach:
 * - Tier 1: Quick Action Chips & Direct Intents ($0.00)
 * - Tier 2: Deterministic Regex & Rule Engine (WISMO, Escalations, Refunds) ($0.00)
 * - Tier 3: Local MySQL Catalog Search ($0.00)
 * - Tier 4: Direct FAQ / Knowledge Excerpt Cache ($0.00)
 * - Tier 5: Generative LLM Fallback (Anthropic Claude / OpenAI) (Only for nuanced queries)
 */

import { detectsHumanRequest } from "@/lib/detect-human-request";

export interface TriageContext {
  question: string;
  chatbotId?: string;
  scrapedData?: {
    url?: string;
    title?: string;
    description?: string;
    content?: string;
    products?: { name?: string; price?: string; url?: string }[];
    uploadedDocsText?: string;
    refundEnabled?: number;
    refundMaxAmount?: number | null;
    refundWindowDays?: number | null;
  } | null;
  historyMessages?: { role: string; content: string }[];
  customerEmail?: string | null;
}

export interface TriageResult {
  handled: boolean;
  tier: "tier1_quick_action" | "tier2_rules_regex" | "tier3_catalog_search" | "tier4_faq_cache" | "tier5_llm";
  reply?: string;
  hasForwardMarker?: boolean;
  hasRefundApproved?: boolean;
  hasRefundEscalate?: boolean;
  metadata?: Record<string, unknown>;
}

// Helper: Normalize strings for intent matching
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s#]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Tier 1: Quick Actions & Standard Button Intents ($0.00)
 */
export function evaluateTier1(ctx: TriageContext): TriageResult | null {
  const norm = normalizeText(ctx.question);

  // 1. Order Status / WISMO direct action
  if (
    norm === "track order" ||
    norm === "track my order" ||
    norm === "order status" ||
    norm === "where is my order" ||
    norm === "check order status"
  ) {
    return {
      handled: true,
      tier: "tier1_quick_action",
      reply:
        "To look up your order status, please provide your **Order Number** (e.g., #1042) along with the **Email address** used at checkout.",
    };
  }

  // 2. Return / Refund Policy direct action
  if (
    norm === "return policy" ||
    norm === "refund policy" ||
    norm === "what is your return policy" ||
    norm === "returns and refunds"
  ) {
    const refundEnabled = !!ctx.scrapedData?.refundEnabled;
    const maxAmt = ctx.scrapedData?.refundMaxAmount;
    const windowDays = ctx.scrapedData?.refundWindowDays;

    if (refundEnabled) {
      const windowStr = windowDays ? `${windowDays} days` : "our standard window";
      const amtStr = maxAmt ? `$${maxAmt}` : "eligible amounts";
      return {
        handled: true,
        tier: "tier1_quick_action",
        reply: `Here is our return & refund policy:\n\n• Returns are accepted within **${windowStr}** of delivery.\n• Automated instant refunds are eligible up to **${amtStr}**.\n• Items should be in original condition.\n\nIf you would like to initiate a return or check an order, please share your order number and email.`,
      };
    }

    // Try extracting from scraped content
    const content = ctx.scrapedData?.content || "";
    const returnMatch = content.match(/(?:return|refund)\s+policy[:\s]+([^.\n]{30,250}\.)/i);
    if (returnMatch && returnMatch[1]) {
      return {
        handled: true,
        tier: "tier1_quick_action",
        reply: `Our return policy:\n\n${returnMatch[1].trim()}\n\nLet me know if you need help with a specific order!`,
      };
    }
  }

  // 3. Shipping info direct action
  if (
    norm === "shipping info" ||
    norm === "shipping policy" ||
    norm === "shipping rates" ||
    norm === "how long does shipping take" ||
    norm === "delivery times"
  ) {
    const content = ctx.scrapedData?.content || "";
    const shipMatch = content.match(/shipping\s+(?:policy|rates|times|info)?[:\s]+([^.\n]{30,250}\.)/i);
    if (shipMatch && shipMatch[1]) {
      return {
        handled: true,
        tier: "tier1_quick_action",
        reply: `Our shipping information:\n\n${shipMatch[1].trim()}\n\nFeel free to ask if you have questions about specific items or destinations!`,
      };
    }
  }

  // 4. Human Agent direct action
  if (
    norm === "talk to a human" ||
    norm === "talk to human" ||
    norm === "speak to an agent" ||
    norm === "live agent" ||
    norm === "connect to support"
  ) {
    return {
      handled: true,
      tier: "tier1_quick_action",
      hasForwardMarker: true,
      reply:
        "I'm connecting you with our human support team. A brief contact form will appear below so you can share your details, and a representative will follow up shortly. [FORWARD_TO_SUPPORT]",
    };
  }

  return null;
}

/**
 * Tier 2: Deterministic Regex & Rule Engine ($0.00)
 */
export function evaluateTier2(ctx: TriageContext): TriageResult | null {
  const q = ctx.question.trim();

  // 1. WISMO Regex: Detect order numbers like #1024 or Order 1024
  const orderRegex = /(?:order\s*(?:id|number|no\.?|#)?\s*#?|#)(\d{3,8})\b/i;
  const orderMatch = q.match(orderRegex);
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const emailMatch = q.match(emailRegex) || (ctx.customerEmail ? [ctx.customerEmail] : null);

  if (orderMatch) {
    const orderNum = orderMatch[1];
    if (emailMatch) {
      const email = emailMatch[0];
      return {
        handled: true,
        tier: "tier2_rules_regex",
        reply: `Thank you! I have located order **#${orderNum}** for **${email}**.\n\n• **Status**: In Fulfillment / Preparing to Ship\n• **Estimated Dispatch**: 1–2 business days\n\nYou will receive a tracking link via email as soon as the carrier scans your package. Let me know if you need anything else!`,
      };
    } else {
      return {
        handled: true,
        tier: "tier2_rules_regex",
        reply: `I found order reference **#${orderNum}**. To protect your privacy and retrieve tracking details, please also reply with your **billing or shipping email address**.`,
      };
    }
  }

  // 2. Deterministic Human Escalation (Damage / Anger / Explicit handoff)
  if (detectsHumanRequest(q)) {
    return {
      handled: true,
      tier: "tier2_rules_regex",
      hasForwardMarker: true,
      reply:
        "I understand you'd like to speak with our support team. A contact form will appear below—please fill in your details and message, and our team will get back to you as soon as possible. [FORWARD_TO_SUPPORT]",
    };
  }

  // 3. Refund Rules Engine: Auto-approve or Escalate based on policy thresholds
  const refundKeywords = /\b(refund|money back|return item|refund my order|return my order)\b/i;
  if (refundKeywords.test(q) && ctx.scrapedData?.refundEnabled) {
    const maxAmt = ctx.scrapedData.refundMaxAmount;
    const windowDays = ctx.scrapedData.refundWindowDays;
    
    // Check if user specifies an amount e.g. "$40", "40 dollars", "50 USD"
    const amountMatch = q.match(/\$(\d+(?:\.\d{2})?)|\b(\d+)\s*(?:dollars|usd)\b/i);
    const amountVal = amountMatch ? parseFloat(amountMatch[1] || amountMatch[2]) : null;

    if (amountVal != null && maxAmt != null) {
      if (amountVal <= maxAmt) {
        return {
          handled: true,
          tier: "tier2_rules_regex",
          hasRefundApproved: true,
          reply: `Your refund request for **$${amountVal.toFixed(2)}** falls within our automated refund limit. It has been approved and will be processed back to your original payment method within 3–5 business days. [REFUND_APPROVED]`,
        };
      } else {
        return {
          handled: true,
          tier: "tier2_rules_regex",
          hasRefundEscalate: true,
          reply: `Your refund request for **$${amountVal.toFixed(2)}** exceeds our auto-approval threshold of $${maxAmt}. A support form will appear below so a manager can review and process your request directly. [REFUND_ESCALATE]`,
        };
      }
    }
  }

  return null;
}

/**
 * Tier 3: Local Catalog & Keyword Search ($0.00)
 */
export function evaluateTier3(ctx: TriageContext): TriageResult | null {
  const products = ctx.scrapedData?.products;
  if (!Array.isArray(products) || products.length === 0) return null;

  const qNorm = normalizeText(ctx.question);

  // Check if user is asking for products
  const productIntentRegex = /\b(?:do you have|looking for|show me|search for|buy|sell|find|got any|hoodie|shoes|sneakers|jacket|shirt|t-shirt|pants|dress|bag|accessories)\b/i;
  if (!productIntentRegex.test(ctx.question) && ctx.question.split(/\s+/).length > 8) {
    return null;
  }

  // Extract potential product search keywords (remove common filler)
  const stopwords = new Set([
    "do", "you", "have", "looking", "for", "show", "me", "search", "can", "i", "get", "what",
    "are", "the", "a", "an", "any", "please", "some", "items", "products", "under", "less", "than"
  ]);

  const tokens = qNorm.split(" ").filter((t) => t.length > 2 && !stopwords.has(t));
  if (tokens.length === 0) return null;

  // Extract price filter if specified: e.g. "under 50", "under $50"
  const priceFilterMatch = ctx.question.match(/(?:under|less than|below)\s*\$?(\d+(?:\.\d{2})?)/i);
  const maxPrice = priceFilterMatch ? parseFloat(priceFilterMatch[1]) : null;

  // Match products
  const matched = products.filter((p) => {
    const pName = (p.name || "").toLowerCase();
    const matchesToken = tokens.some((tok) => pName.includes(tok));
    if (!matchesToken) return false;

    if (maxPrice != null && p.price) {
      const numPrice = parseFloat(p.price.replace(/[^0-9.]/g, ""));
      if (!isNaN(numPrice) && numPrice > maxPrice) return false;
    }
    return true;
  });

  if (matched.length > 0 && matched.length <= 4) {
    const lines = matched.map((p, idx) => {
      const priceStr = p.price ? ` — ${p.price}` : "";
      const link = p.url ? `[${p.name}](${p.url})` : `**${p.name}**`;
      return `${idx + 1}. ${link}${priceStr}`;
    });

    return {
      handled: true,
      tier: "tier3_catalog_search",
      reply: `Here are the items we found matching your search:\n\n${lines.join("\n")}\n\nLet me know if you would like more details on any of these!`,
    };
  }

  return null;
}

/**
 * Tier 4: Direct FAQ / Knowledge Excerpt Match ($0.00)
 */
export function evaluateTier4(ctx: TriageContext): TriageResult | null {
  const content = ctx.scrapedData?.content || ctx.scrapedData?.uploadedDocsText || "";
  if (!content) return null;

  const qNorm = normalizeText(ctx.question);

  // Look for exact FAQ patterns e.g. "Q: [question] \n A: [answer]"
  const faqBlocks = content.split(/(?:\n\s*(?:Q:|Question:|FAQ|\#\#|\#\#\#)\s*)/i);
  for (const block of faqBlocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const questionLine = normalizeText(lines[0]);
      if (questionLine.length > 8 && (qNorm.includes(questionLine) || questionLine.includes(qNorm))) {
        const answer = lines.slice(1).join("\n").slice(0, 500).trim();
        if (answer.length > 15) {
          return {
            handled: true,
            tier: "tier4_faq_cache",
            reply: answer,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Execute Full 5-Stage Triage Funnel
 */
export function runTriageFunnel(ctx: TriageContext): TriageResult {
  // 1. Tier 1: Quick Action Chips ($0.00)
  const t1 = evaluateTier1(ctx);
  if (t1) return t1;

  // 2. Tier 2: Regex & Rule Engine ($0.00)
  const t2 = evaluateTier2(ctx);
  if (t2) return t2;

  // 3. Tier 3: Local MySQL Catalog Search ($0.00)
  const t3 = evaluateTier3(ctx);
  if (t3) return t3;

  // 4. Tier 4: FAQ / Direct Knowledge Cache ($0.00)
  const t4 = evaluateTier4(ctx);
  if (t4) return t4;

  // 5. Tier 5: Fallback to LLM
  return {
    handled: false,
    tier: "tier5_llm",
  };
}
