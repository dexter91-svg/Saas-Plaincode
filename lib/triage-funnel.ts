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
import { lookupStoreOrder, lookupOrdersByEmail } from "@/lib/orders-store";

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
        "To look up your order status, please provide your **Order Number** (e.g., #1042, found in your confirmation email) along with the **Email address** used at checkout.",
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
        reply: `Our return policy:\n\n${returnMatch[1].trim()}\n\nIs there anything else I can help you with today?`,
      };
    }

    return {
      handled: true,
      tier: "tier1_quick_action",
      reply: "Our standard policy allows returns within 30 days of delivery for items in original, unworn condition. If you need help returning an item, share your order number and email.\n\nIs there anything else I can help you with today?",
    };
  }

  // 2b. Return Initiation follow-up
  if (
    norm === "how do i initiate a return or exchange" ||
    norm === "how to start return" ||
    norm === "initiate a return" ||
    norm === "start a return"
  ) {
    return {
      handled: true,
      tier: "tier1_quick_action",
      reply: "To initiate a return or exchange:\n\n1. Ensure the item is unused with original tags/packaging.\n2. Provide your **Order Number** (found in your confirmation email) and **Email address**.\n3. Our team will verify eligibility and provide a prepaid return shipping slip.",
    };
  }

  // 2c. Refund Timeframe follow-up
  if (
    norm === "how long does it take to receive a refund" ||
    norm === "refund timeframe" ||
    norm === "how long does a refund take"
  ) {
    return {
      handled: true,
      tier: "tier1_quick_action",
      reply: "Once your returned item arrives at our warehouse and is inspected, refunds are typically processed within **3–5 business days** back to your original payment method.",
    };
  }

  // 3. Shipping info direct action
  if (
    norm === "shipping info" ||
    norm === "shipping policy" ||
    norm === "shipping rates" ||
    norm === "what are your shipping rates and times" ||
    norm === "how long does shipping take" ||
    norm === "delivery times"
  ) {
    const content = ctx.scrapedData?.content || "";
    const shipMatch = content.match(/shipping\s+(?:policy|rates|times|info)?[:\s]+([^.\n]{30,250}\.)/i);
    if (shipMatch && shipMatch[1]) {
      return {
        handled: true,
        tier: "tier1_quick_action",
        reply: `Our shipping information:\n\n${shipMatch[1].trim()}\n\nIs there anything else I can help you with today?`,
      };
    }

    return {
      handled: true,
      tier: "tier1_quick_action",
      reply: "We offer standard shipping (3–5 business days) and expedited options at checkout. Free shipping may apply on qualifying domestic orders.\n\nIs there anything else I can help you with today?",
    };
  }

  // 3b. International shipping follow-up
  if (
    norm === "do you ship internationally" ||
    norm === "international delivery" ||
    norm === "international shipping"
  ) {
    return {
      handled: true,
      tier: "tier1_quick_action",
      reply: "We ship domestically as well as to selected international destinations. Available international carrier rates, duties, and delivery estimates are calculated automatically at checkout.\n\nIs there anything else I can help you with today?",
    };
  }

  // 4. Human Agent direct action
  if (
    norm === "talk to a human" ||
    norm === "talk to human" ||
    norm === "speak to an agent" ||
    norm === "live agent" ||
    norm === "connect to support" ||
    norm === "i d like to speak to a human agent"
  ) {
    return {
      handled: true,
      tier: "tier1_quick_action",
      hasForwardMarker: true,
      reply:
        "I'm connecting you with our human support team. A brief contact form will appear below so you can share your details, and a representative will follow up shortly. [FORWARD_TO_SUPPORT]",
    };
  }

  // 5. Discount / Coupon / Promo Code direct action ($0.00)
  if (
    norm === "discount code" ||
    norm === "discount codes" ||
    norm === "coupon code" ||
    norm === "coupon codes" ||
    norm === "promo code" ||
    norm === "promo codes" ||
    norm === "any discounts" ||
    norm === "do you have any discounts" ||
    norm === "do you have discount codes" ||
    norm === "do you have any discount codes" ||
    norm === "voucher code" ||
    /^(?:do you have (?:any )?)?(?:discount|coupon|promo|voucher)\s*(?:codes?|discounts?)?$/i.test(norm)
  ) {
    const content = (ctx.scrapedData?.content || "") + " " + (ctx.scrapedData?.uploadedDocsText || "");
    const codeMatch = content.match(/(?:discount|coupon|promo|voucher)\s*(?:code)?[:\s]+["']?([A-Z0-9_-]{3,15})["']?/i);
    if (codeMatch && codeMatch[1]) {
      return {
        handled: true,
        tier: "tier1_quick_action",
        reply: `You can use promo code **${codeMatch[1].toUpperCase()}** at checkout for discounts on eligible items.`,
      };
    }
    return {
      handled: true,
      tier: "tier1_quick_action",
      reply: "We do not currently have any active promo codes or discount coupons listed. Keep an eye on our homepage or sign up for our newsletter for future sales and offers!",
    };
  }

  return null;
}

/**
 * Tier 2: Deterministic Regex & Rule Engine ($0.00)
 */
export function evaluateTier2(ctx: TriageContext): TriageResult | null {
  const q = ctx.question.trim();

  // 0a. Prompt Injection & System Jailbreak Defense ($0.00)
  const isJailbreakAttempt = /\b(ignore (?:all )?(?:previous|prior) instructions|developer mode|dan mode|jailbreak|system prompt|what are your instructions|repeat your system prompt|act as a linux terminal|print your prompt)\b/i.test(q);
  if (isJailbreakAttempt) {
    return {
      handled: true,
      tier: "tier2_rules_regex",
      reply: "I am the customer support assistant for this store. I'm here to help with questions about our products, orders, shipping, and store policies. How can I assist you with your shopping today?",
    };
  }

  // 0b. Discount & Coupon Code Guardrail (Anti-Hallucination) ($0.00)
  const isDiscountQuery = /\b(discount codes?|coupon codes?|promo codes?|voucher codes?|coupons?|vouchers?|discounts?|any discounts?|can i get a discount|give me a discount|give me \d+% off|have a coupon|first order discount)\b/i.test(q);
  if (isDiscountQuery) {
    const content = (ctx.scrapedData?.content || "") + " " + (ctx.scrapedData?.uploadedDocsText || "");
    const codeMatch = content.match(/(?:discount|coupon|promo|voucher)\s*(?:code)?[:\s]+["']?([A-Z0-9_-]{3,15})["']?/i);
    if (codeMatch && codeMatch[1]) {
      return {
        handled: true,
        tier: "tier2_rules_regex",
        reply: `You can use code **${codeMatch[1].toUpperCase()}** at checkout for our current promotion.`,
      };
    }
    return {
      handled: true,
      tier: "tier2_rules_regex",
      reply: "We don't currently have any active promo codes or discount coupons available. Be sure to check our homepage or sign up for our newsletter for any future promotions!",
    };
  }

  const history = ctx.historyMessages || [];
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  const userMessages = history.filter((m) => m.role === "user");
  const lastUser = userMessages[userMessages.length - 1];

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  let emailMatch = q.match(emailRegex) || (ctx.customerEmail ? [ctx.customerEmail] : null);

  // If email not found in current turn, check multi-turn history
  if (!emailMatch && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const em = history[i].content.match(emailRegex);
      if (em) {
        emailMatch = em;
        break;
      }
    }
  }

  // 1. WISMO: Dynamically match order numbers across different store formats
  // Check explicit indicator: 'order #1042', 'order: WB-1042', '#1042'
  const explicitRegex = /(?:order\s*(?:id|number|no\.?|ref(?:erence)?|#)?\s*[:#-]?\s*|#)((?=[a-z0-9_-]*\d)[a-z0-9]+(?:[-_#][a-z0-9]+)*)\b/i;
  let orderStr: string | null = null;
  let orderInCurrentTurn: string | null = null;
  const explicitMatch = q.match(explicitRegex);
  if (explicitMatch) {
    orderStr = explicitMatch[1].replace(/^#/, "");
    orderInCurrentTurn = orderStr;
  }

  // Preposition pattern: e.g. "for WB-9921", "for #1042", "for 1042", "money back for WB-9921"
  if (!orderStr) {
    const forMatch = q.match(/\b(?:for|on)\s+#?([a-z0-9]{1,8}[-_#])?(\d{2,12}(?:[-_#][a-z0-9]+)?)\b/i);
    if (forMatch) {
      const prefix = forMatch[1] || "";
      const num = forMatch[2];
      orderStr = (prefix + num).replace(/^#/, "");
      orderInCurrentTurn = orderStr;
    }
  }

  // Known prefixed store order formats anywhere in query: e.g. 'WB-1042', 'WC-58291', 'ORD-9921', 'PB-1042'
  if (!orderStr) {
    const prefixedTokenMatch = q.match(/\b([a-z]{1,6}[-_#]\d{2,12}(?:[-_#][a-z0-9]+)?)\b/i);
    if (prefixedTokenMatch) {
      orderStr = prefixedTokenMatch[1].replace(/^#/, "");
      orderInCurrentTurn = orderStr;
    }
  }

  // Standalone order format: e.g. customer replies with just '1042', 'WB-1042', 'WC-58291', 'ORD-9921', '#1042'
  if (!orderStr) {
    const standaloneRegex = /^(?:it'?s|my order is|here is|order is)?\s*#?([a-z0-9]{1,8}[-_#])?(\d{2,12}(?:[-_#][a-z0-9]+)?)\s*$/i;
    const standaloneMatch = q.match(standaloneRegex);
    if (standaloneMatch) {
      const prefix = standaloneMatch[1] || "";
      const num = standaloneMatch[2];
      orderStr = (prefix + num).replace(/^#/, "");
      orderInCurrentTurn = orderStr;
    }
  }

  // Fallback: check if previous assistant message was asking for order info
  const wasAskingForOrder =
    lastAssistant &&
    (lastAssistant.content.toLowerCase().includes("order number") ||
      lastAssistant.content.toLowerCase().includes("email address") ||
      lastAssistant.content.toLowerCase().includes("order status"));

  if (!orderStr && wasAskingForOrder) {
    const digitTokenMatch = q.match(/\b((?=[a-z0-9_-]*\d)[a-z0-9]+(?:[-_#][a-z0-9]+)*)\b/i);
    if (digitTokenMatch && !digitTokenMatch[1].includes("@")) {
      orderStr = digitTokenMatch[1].replace(/^#/, "");
      orderInCurrentTurn = orderStr;
    }
  }

  // Multi-turn order memory: recover order from earlier turns in history
  if (!orderStr && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      // Check if assistant referenced an order: e.g. "order **#1042**" or "order reference **#1042**"
      const asstOrderMatch = msg.content.match(
        /(?:order(?:\s+reference)?\s*\*{0,2}#?|located order\s*\*{0,2}#?|#)([a-z0-9_-]*\d[a-z0-9_-]*)/i
      );
      if (asstOrderMatch) {
        orderStr = asstOrderMatch[1].replace(/^#/, "").replace(/\*+$/, "");
        break;
      }
      // Check if user referenced an order in a previous turn
      if (msg.role === "user") {
        const userExplicit = msg.content.match(explicitRegex);
        if (userExplicit) {
          orderStr = userExplicit[1].replace(/^#/, "");
          break;
        }
        const userPrefixed = msg.content.match(/\b([a-z]{1,6}[-_#]\d{2,12}(?:[-_#][a-z0-9]+)?)\b/i);
        if (userPrefixed) {
          orderStr = userPrefixed[1].replace(/^#/, "");
          break;
        }
      }
    }
  }

  const qHasCancel = /\b(cancel|cancellation|stop order|stop my order)\b/i.test(q);
  const qHasDamage = /\b(damaged|broken|defective|faulty|cracked|shattered|wrong item|incorrect item)\b/i.test(q);
  const qHasRefund = /\b(refund|money back|reimburse|reimbursement)\b/i.test(q);
  const qHasReturn = /\b(return|exchange|return item|return my order)\b/i.test(q);
  const qHasTrack = /\b(track|tracking|status|where|shipped|delivery|order)\b/i.test(q);
  const emailInCurrentTurn = !!q.match(emailRegex);
  const amountMatchCurrent = q.match(/\$(\d+(?:\.\d{2})?)|\b(\d+)\s*(?:dollars|usd)\b/i);
  const amountValInCurrentTurn = amountMatchCurrent ? parseFloat(amountMatchCurrent[1] || amountMatchCurrent[2]) : null;
  const isHumanReq = detectsHumanRequest(q);

  // If the user's current turn does not contain any order identifier, email, dollar amount,
  // explicit intent keyword, or human escalation trigger, DO NOT trap them into multi-turn rule engine loops.
  // Pass to Tier 5 LLM Agent to understand conversational nuances or gibberish!
  const hasCurrentTurnSignal =
    !!orderInCurrentTurn ||
    emailInCurrentTurn ||
    amountValInCurrentTurn != null ||
    qHasCancel ||
    qHasDamage ||
    qHasRefund ||
    qHasReturn ||
    qHasTrack ||
    isHumanReq;

  if (!hasCurrentTurnSignal) {
    return null;
  }

  const isCancelIntent =
    qHasCancel ||
    (lastAssistant != null && /urgent cancellation|cancel your order|request an order cancellation/i.test(lastAssistant.content)) ||
    (lastUser != null && /\b(cancel|cancellation|stop order)\b/i.test(lastUser.content));

  const isDamageIntent =
    qHasDamage ||
    (lastAssistant != null && /damaged or defective/i.test(lastAssistant.content));

  const isRefundIntent =
    qHasRefund ||
    (lastAssistant != null && /process your refund|refund eligibility|refund limit|refund amount/i.test(lastAssistant.content)) ||
    (lastUser != null && /\b(refund|money back|reimburse)\b/i.test(lastUser.content));

  const isReturnIntent =
    qHasReturn ||
    (lastAssistant != null && /initiate your return|return eligibility|item you wish to return/i.test(lastAssistant.content)) ||
    (lastUser != null && /\b(return|exchange)\b/i.test(lastUser.content));

  // Damaged or Defective goods: Immediate priority escalation
  if (isDamageIntent) {
    if (orderStr) {
      const displayOrder = orderStr.startsWith("#") ? orderStr : `#${orderStr}`;
      return {
        handled: true,
        tier: "tier2_rules_regex",
        hasForwardMarker: true,
        reply: `I'm very sorry to hear that your items in order **${displayOrder}**${emailMatch ? ` for **${emailMatch[0]}**` : ""} arrived damaged or defective! We want to make this right immediately. A contact form will appear below to arrange a replacement or refund right away. [FORWARD_TO_SUPPORT]`,
      };
    }
    return {
      handled: true,
      tier: "tier2_rules_regex",
      hasForwardMarker: true,
      reply:
        "I'm very sorry to hear that your item arrived damaged or defective! We want to make this right immediately. A contact form will appear below—please share your details and order number so our team can arrange a replacement or refund right away. [FORWARD_TO_SUPPORT]",
    };
  }

  // Order Cancellation Intent
  if (isCancelIntent) {
    if (orderStr) {
      const displayOrder = orderStr.startsWith("#") ? orderStr : `#${orderStr}`;
      return {
        handled: true,
        tier: "tier2_rules_regex",
        hasForwardMarker: true,
        reply: `I have located order **${displayOrder}**${emailMatch ? ` for **${emailMatch[0]}**` : ""}.\n\nBecause orders enter fulfillment immediately, our warehouse team must stop the shipment manually. A support form will appear below so we can flag this for urgent cancellation before it leaves the warehouse. [FORWARD_TO_SUPPORT]`,
      };
    } else {
      return {
        handled: true,
        tier: "tier2_rules_regex",
        reply:
          "To request an order cancellation before it leaves the warehouse, please provide your **Order Number** (found in your confirmation email) along with your **Email address**.",
      };
    }
  }

  // Refund Amount Detection (e.g. $35, 40 dollars)
  const amountMatch = q.match(/\$(\d+(?:\.\d{2})?)|\b(\d+)\s*(?:dollars|usd)\b/i);
  let amountVal = amountMatch ? parseFloat(amountMatch[1] || amountMatch[2]) : null;

  const wasAskingForRefund =
    lastAssistant &&
    (lastAssistant.content.toLowerCase().includes("refund limit") ||
      lastAssistant.content.toLowerCase().includes("how much you'd like refunded") ||
      lastAssistant.content.toLowerCase().includes("refund amount"));

  if (amountVal == null && (isRefundIntent || wasAskingForRefund) && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const prevAmt = history[i].content.match(/\$(\d+(?:\.\d{2})?)|\b(\d+)\s*(?:dollars|usd)\b/i);
      if (prevAmt && history[i].role === "user") {
        amountVal = parseFloat(prevAmt[1] || prevAmt[2]);
        break;
      }
    }
  }

  if (amountVal != null && (isRefundIntent || wasAskingForRefund)) {
    // If order number or email is missing, request missing info before approving/escalating
    if (!orderStr || !emailMatch) {
      if (orderStr && !emailMatch) {
        const displayOrder = orderStr.startsWith("#") ? orderStr : `#${orderStr}`;
        return {
          handled: true,
          tier: "tier2_rules_regex",
          reply: `I found order reference **${displayOrder}** for your **$${amountVal.toFixed(2)}** refund request. To verify your order and process your refund, please reply with your **billing or shipping email address**.`,
        };
      } else {
        return {
          handled: true,
          tier: "tier2_rules_regex",
          reply: `To process your refund request for **$${amountVal.toFixed(2)}**, please provide your **Order Number** (found in your confirmation email) along with the **Email address** used at checkout.`,
        };
      }
    }

    // Both order and email are verified!
    const maxAmt = ctx.scrapedData?.refundMaxAmount ?? 50;
    const displayOrder = orderStr.startsWith("#") ? orderStr : `#${orderStr}`;
    if (amountVal <= maxAmt) {
      return {
        handled: true,
        tier: "tier2_rules_regex",
        hasRefundApproved: true,
        reply: `Your refund request for **$${amountVal.toFixed(2)}** for **${displayOrder}** falls within our automated refund limit of $${maxAmt}. It has been approved and will be processed back to your original payment method within 3–5 business days. [REFUND_APPROVED]\n\nIs there anything else I can help you with today?`,
      };
    } else {
      return {
        handled: true,
        tier: "tier2_rules_regex",
        hasRefundEscalate: true,
        reply: `Your refund request for **$${amountVal.toFixed(2)}** for **${displayOrder}** exceeds our auto-approval threshold of $${maxAmt}. A support form will appear below so a manager can review and process your request directly. [REFUND_ESCALATE]`,
      };
    }
  }

  // When order reference is found:
  if (orderStr) {
    const displayOrder = orderStr.startsWith("#") ? orderStr : `#${orderStr}`;
    if (isRefundIntent) {
      if (emailMatch) {
        const maxAmt = ctx.scrapedData?.refundMaxAmount ?? 50;
        return {
          handled: true,
          tier: "tier2_rules_regex",
          reply: `I have located order **${displayOrder}** for **${emailMatch[0]}**.\n\n• **Status**: Delivered\n• **Refund Eligibility**: Automated instant refunds are eligible up to **$${maxAmt}**.\n\nPlease reply with the refund amount you are requesting (e.g., $30) or the item you wish to return.`,
        };
      } else {
        return {
          handled: true,
          tier: "tier2_rules_regex",
          reply: `I found order reference **${displayOrder}**. To verify your order and process your refund, please reply with your **billing or shipping email address**.`,
        };
      }
    }

    if (isReturnIntent) {
      if (emailMatch) {
        return {
          handled: true,
          tier: "tier2_rules_regex",
          reply: `I have located order **${displayOrder}** for **${emailMatch[0]}**.\n\n• **Status**: Delivered\n• **Return Eligibility**: Eligible for standard return\n\nPlease let me know the item you wish to return and the reason, and we will arrange your return slip.`,
        };
      } else {
        return {
          handled: true,
          tier: "tier2_rules_regex",
          reply: `I found order reference **${displayOrder}**. To verify your order and initiate your return, please reply with your **billing or shipping email address**.`,
        };
      }
    }

    // Default: Order status tracking (WISMO)
    if (emailMatch) {
      const email = emailMatch[0];
      const lookup = lookupStoreOrder(orderStr, email);

      if (lookup.found && lookup.order) {
        const o = lookup.order;
        const carrierLine = o.carrier ? `\n• **Carrier**: ${o.carrier}${o.trackingNumber ? ` (${o.trackingNumber})` : ""}` : "";
        const estLine = o.estimatedDelivery ? `\n• **Estimated Delivery**: ${o.estimatedDelivery}` : "";
        const trackLink = o.trackingUrl ? `\n• **Tracking Link**: [Track Package on ${o.carrier || "Carrier"}](${o.trackingUrl})` : "";
        const itemsList = o.items.map((it) => `${it.quantity}x ${it.name}`).join(", ");
        const itemsLine = itemsList ? `\n• **Items**: ${itemsList}` : "";

        return {
          handled: true,
          tier: "tier2_rules_regex",
          reply: `Thank you! I located order **${displayOrder}** for **${email}**.\n\n• **Status**: ${o.statusTitle}${carrierLine}${estLine}${trackLink}${itemsLine}\n\nIs there anything else I can help you with today?`,
        };
      }

      if (lookup.error === "email_mismatch") {
        return {
          handled: true,
          tier: "tier2_rules_regex",
          reply: `Order **${displayOrder}** was found, but the email address **${email}** does not match our records for this order. To protect customer privacy, please provide the email used at checkout.`,
        };
      }

      // Order not found in store
      return {
        handled: true,
        tier: "tier2_rules_regex",
        reply: `We could not locate order **${displayOrder}** associated with **${email}**. Please double-check the order number and checkout email address from your confirmation, or reply if you would like me to connect you with our team.`,
      };
    } else {
      // Only prompt for email if the current turn introduced the order or explicitly asked for tracking.
      // If the user entered something unrecognized or gibberish (e.g. 'dfdfjd'), pass to LLM agent to understand!
      const isExplicitTrackingQuery = /\b(track|tracking|status|where|shipped|delivery|order)\b/i.test(q);
      if (orderInCurrentTurn || isExplicitTrackingQuery) {
        return {
          handled: true,
          tier: "tier2_rules_regex",
          reply: `I found order reference **${displayOrder}**. To protect your privacy and retrieve tracking details, please also reply with your **billing or shipping email address**.`,
        };
      }
      return null;
    }
  }

  // 1b. Missing order number / lookup by email
  if (!orderStr && (emailMatch || /don'?t have (?:my )?order number|find (?:it )?by (?:my )?email/i.test(q))) {
    if (emailMatch) {
      const email = emailMatch[0];
      const matchingOrders = lookupOrdersByEmail(email);
      if (matchingOrders.length > 0) {
        const orderSummary = matchingOrders.map((o) => `• Order **#${o.orderNumber}**: ${o.statusTitle} (${o.total})`).join("\n");
        return {
          handled: true,
          tier: "tier2_rules_regex",
          reply: `I searched for recent orders associated with **${email}**:\n\n${orderSummary}\n\n• Found recent order: **#${matchingOrders[0].orderNumber}**\n• Status: **${matchingOrders[0].statusTitle}**\n\nIf you need tracking or details on any specific order, let me know!`,
        };
      } else {
        return {
          handled: true,
          tier: "tier2_rules_regex",
          reply: `I searched our system but could not locate any orders associated with **${email}**. Please verify if you used a different email address at checkout.`,
        };
      }
    } else {
      return {
        handled: true,
        tier: "tier2_rules_regex",
        reply: "No problem! Please reply with your **checkout email address**, and I will look up your recent orders and tracking details for you.",
      };
    }
  }

  // 1c. Refund intent without order number
  if (isRefundIntent) {
    const windowDays = ctx.scrapedData?.refundWindowDays ?? 30;
    return {
      handled: true,
      tier: "tier2_rules_regex",
      reply: `We accept returns and refunds within **${windowDays} days** of delivery. To verify your order and process your refund request, please provide your **Order Number** (found in your confirmation email) along with your **Email address**.`,
    };
  }

  // 2. Deterministic Human Escalation (Explicit agent handoff)
  if (detectsHumanRequest(q)) {
    return {
      handled: true,
      tier: "tier2_rules_regex",
      hasForwardMarker: true,
      reply:
        "I understand you'd like to speak with our support team. A contact form will appear below—please fill in your details and message, and our team will get back to you as soon as possible. [FORWARD_TO_SUPPORT]",
    };
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
