export interface QuickChip {
  id: string;
  label: string;
  query: string;
  action?: "query" | "human";
}

export const DEFAULT_INITIAL_CHIPS: QuickChip[] = [
  { id: "track", label: "Track Order", query: "Track order" },
  { id: "return", label: "Return Policy", query: "What is your return policy?" },
  { id: "shipping", label: "Shipping Info", query: "What are your shipping rates and times?" },
];

/**
 * Returns streamlined follow-up chips when an inquiry is resolved,
 * offering the remaining primary store topics without filler mock examples,
 * unnecessary leading chips, or redundant "speak to agent" chips (since the persistent
 * "Talk to a human" button is always present in the bottom toolbar).
 */
export function determineFollowUpChips(lastUserText: string = "", lastAssistantText: string = ""): QuickChip[] {
  const normUser = lastUserText.toLowerCase().trim();
  const normAssistant = lastAssistantText.toLowerCase().trim();

  // 1. If assistant is waiting for information from the customer (e.g. order number, email, details),
  // or a contact/support form is active, NEVER show any chips.
  const isAwaitingCustomerInput =
    !normAssistant.includes("is there anything else") &&
    (normAssistant.includes("email address") ||
      normAssistant.includes("order number") ||
      normAssistant.includes("protect your privacy") ||
      normAssistant.includes("please provide") ||
      normAssistant.includes("please reply") ||
      normAssistant.includes("reply with") ||
      normAssistant.includes("refund amount") ||
      normAssistant.includes("how much") ||
      normAssistant.includes("could you") ||
      normAssistant.includes("can you") ||
      normAssistant.includes("item you wish to return") ||
      normAssistant.includes("the reason") ||
      normAssistant.includes("contact form") ||
      normAssistant.includes("support form") ||
      normAssistant.includes("[forward_to_support]") ||
      normAssistant.includes("[refund_escalate]"));

  if (isAwaitingCustomerInput) {
    return [];
  }

  // 2. Chips should ONLY be offered once an inquiry is COMPLETED / RESOLVED.
  const isResolved =
    normAssistant.includes("is there anything else") ||
    normAssistant.includes("[refund_approved]") ||
    (normAssistant.includes("located order") && normAssistant.includes("in fulfillment")) ||
    normAssistant.includes("standard policy allows returns") ||
    normAssistant.includes("our shipping information") ||
    normAssistant.includes("we offer standard shipping");

  if (!isResolved) {
    return [];
  }

  // 3. When resolved, offer the remaining high-intent topics:
  if (
    normAssistant.includes("located order") ||
    normAssistant.includes("in fulfillment") ||
    normUser.includes("track")
  ) {
    return [
      { id: "return", label: "Return Policy", query: "What is your return policy?" },
      { id: "shipping", label: "Shipping Info", query: "What are your shipping rates and times?" },
    ];
  }

  if (
    normUser.includes("return") ||
    normUser.includes("refund") ||
    normAssistant.includes("refund") ||
    normAssistant.includes("return")
  ) {
    return [
      { id: "track", label: "Track Order", query: "Track order" },
      { id: "shipping", label: "Shipping Info", query: "What are your shipping rates and times?" },
    ];
  }

  if (
    (normUser.includes("shipping") || normUser.includes("delivery")) &&
    !normUser.includes("@")
  ) {
    return [
      { id: "track", label: "Track Order", query: "Track order" },
      { id: "return", label: "Return Policy", query: "What is your return policy?" },
    ];
  }

  return [
    { id: "track", label: "Track Order", query: "Track order" },
    { id: "return", label: "Return Policy", query: "What is your return policy?" },
    { id: "shipping", label: "Shipping Info", query: "What are your shipping rates and times?" },
  ];
}
