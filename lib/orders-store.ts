export interface StoreOrderItem {
  name: string;
  quantity: number;
  price: string;
}

export interface StoreOrder {
  orderNumber: string; // e.g. "1042", "ORD-9921", "WC-58291"
  customerEmails: string[]; // matching emails (case-insensitive)
  customerName: string;
  status: "out_for_delivery" | "delivered" | "in_transit" | "processing" | "cancelled";
  statusTitle: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  shippingAddress?: string;
  items: StoreOrderItem[];
  total: string;
  orderDate: string;
}

// Realistic store demo order database
export const DEMO_STORE_ORDERS: StoreOrder[] = [
  {
    orderNumber: "1042",
    customerEmails: ["alex@example.com", "buyer@example.com", "user@test.com", "alex@test.com", "buyer@gmail.com"],
    customerName: "Alex Mercer",
    status: "out_for_delivery",
    statusTitle: "Out for Delivery",
    carrier: "FedEx Express",
    trackingNumber: "FX-940018291042",
    trackingUrl: "https://www.fedex.com/fedextrack/?trknbr=FX-940018291042",
    estimatedDelivery: "Today by 5:00 PM",
    shippingAddress: "Austin, TX",
    items: [
      { name: "Classic Minimalist Hoodie (Black, L)", quantity: 1, price: "$65.00" },
      { name: "Organic Cotton Cap", quantity: 1, price: "$25.00" },
    ],
    total: "$90.00",
    orderDate: "October 6, 2026",
  },
  {
    orderNumber: "1089",
    customerEmails: ["sarah@example.com", "sarah.jenkins@gmail.com"],
    customerName: "Sarah Jenkins",
    status: "delivered",
    statusTitle: "Delivered",
    carrier: "UPS Ground",
    trackingNumber: "1Z9999999999991089",
    trackingUrl: "https://www.ups.com/track?tracknum=1Z9999999999991089",
    estimatedDelivery: "Delivered on Oct 5, 2026 (Left at front door)",
    shippingAddress: "Seattle, WA",
    items: [
      { name: "Trailblazer Waterproof Boots (Size 8)", quantity: 1, price: "$140.00" },
    ],
    total: "$140.00",
    orderDate: "October 1, 2026",
  },
  {
    orderNumber: "2041",
    customerEmails: ["mark@example.com", "mark.t@outlook.com"],
    customerName: "Mark Thompson",
    status: "in_transit",
    statusTitle: "In Transit",
    carrier: "DHL Express",
    trackingNumber: "DHL-8472910291",
    trackingUrl: "https://www.dhl.com/en/express/tracking.html?AWB=DHL-8472910291",
    estimatedDelivery: "Friday, October 10 by 7:00 PM",
    shippingAddress: "Denver, CO",
    items: [
      { name: "Merino Wool Thermal Crew", quantity: 2, price: "$45.00" },
    ],
    total: "$90.00",
    orderDate: "October 5, 2026",
  },
  {
    orderNumber: "3012",
    customerEmails: ["emma@example.com", "emma.d@store.com"],
    customerName: "Emma Davies",
    status: "processing",
    statusTitle: "In Fulfillment / Preparing to Ship",
    carrier: "USPS Priority",
    estimatedDelivery: "Dispatches within 1 business day",
    shippingAddress: "Chicago, IL",
    items: [
      { name: "Canvas Everyday Tote Bag", quantity: 1, price: "$38.00" },
    ],
    total: "$38.00",
    orderDate: "October 8, 2026",
  },
  {
    orderNumber: "ORD-9921",
    customerEmails: ["buyer@shop.com", "buyer@example.com"],
    customerName: "David Miller",
    status: "in_transit",
    statusTitle: "In Transit",
    carrier: "USPS Priority Mail",
    trackingNumber: "940011189922319921",
    trackingUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels=940011189922319921",
    estimatedDelivery: "Arriving Saturday, Oct 11",
    shippingAddress: "Brooklyn, NY",
    items: [
      { name: "Everyday Relaxed Fit Jeans (32x32)", quantity: 1, price: "$78.00" },
    ],
    total: "$78.00",
    orderDate: "October 6, 2026",
  },
  {
    orderNumber: "WC-58291",
    customerEmails: ["alex@store.com", "buyer@example.com"],
    customerName: "Alex Wright",
    status: "processing",
    statusTitle: "Preparing to Ship",
    carrier: "DHL eCommerce",
    estimatedDelivery: "Dispatches in 1–2 business days",
    shippingAddress: "San Francisco, CA",
    items: [
      { name: "Vintage Oversized Crewneck", quantity: 1, price: "$52.00" },
    ],
    total: "$52.00",
    orderDate: "October 7, 2026",
  },
  {
    orderNumber: "WB-1042",
    customerEmails: ["buyer@store.com", "buyer@example.com"],
    customerName: "Taylor Brooks",
    status: "out_for_delivery",
    statusTitle: "Out for Delivery",
    carrier: "FedEx Home Delivery",
    trackingNumber: "FX-1042892188",
    trackingUrl: "https://www.fedex.com/fedextrack/?trknbr=FX-1042892188",
    estimatedDelivery: "Today by 6:00 PM",
    shippingAddress: "Miami, FL",
    items: [
      { name: "Waterproof Lightweight Windbreaker", quantity: 1, price: "$85.00" },
    ],
    total: "$85.00",
    orderDate: "October 6, 2026",
  },
  {
    orderNumber: "4090",
    customerEmails: ["jordan@example.com"],
    customerName: "Jordan Vance",
    status: "cancelled",
    statusTitle: "Cancelled",
    estimatedDelivery: "Cancelled before fulfillment upon customer request",
    shippingAddress: "Atlanta, GA",
    items: [
      { name: "Pro Trail Running Shoes", quantity: 1, price: "$120.00" },
    ],
    total: "$120.00",
    orderDate: "October 4, 2026",
  },
];

export interface OrderLookupResult {
  found: boolean;
  order?: StoreOrder;
  error?: "not_found" | "email_mismatch" | "missing_email";
}

/**
 * Clean and normalize order strings: remove leading '#' and whitespace, case-insensitive
 */
function cleanOrderNumber(raw: string): string {
  return raw.replace(/^#+/, "").trim().toLowerCase();
}

/**
 * Look up an order by order number and optional email.
 * Mirrors the exact contract that Shopify / WooCommerce API integration will use.
 */
export function lookupStoreOrder(orderNumberRaw: string, emailRaw?: string | null): OrderLookupResult {
  const targetNum = cleanOrderNumber(orderNumberRaw);
  const targetEmail = (emailRaw || "").trim().toLowerCase();

  const match = DEMO_STORE_ORDERS.find(
    (o) => cleanOrderNumber(o.orderNumber) === targetNum
  );

  if (!match) {
    return { found: false, error: "not_found" };
  }

  // If email was provided, verify it matches
  if (targetEmail) {
    const emailMatches = match.customerEmails.some((e) => e.toLowerCase() === targetEmail);
    if (!emailMatches) {
      return { found: false, error: "email_mismatch", order: match };
    }
  }

  return { found: true, order: match };
}

/**
 * Look up recent orders for an email address (used when customer doesn't know their order number).
 */
export function lookupOrdersByEmail(emailRaw: string): StoreOrder[] {
  const targetEmail = emailRaw.trim().toLowerCase();
  if (!targetEmail) return [];

  return DEMO_STORE_ORDERS.filter((o) =>
    o.customerEmails.some((e) => e.toLowerCase() === targetEmail)
  );
}
