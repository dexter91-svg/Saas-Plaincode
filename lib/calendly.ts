/** Calendly for “custom plan” / enterprise conversations (dashboard CTA). Override with NEXT_PUBLIC_CALENDLY_URL. */
export const CUSTOM_PLAN_CALENDLY_URL =
  typeof process.env.NEXT_PUBLIC_CALENDLY_URL === "string" && process.env.NEXT_PUBLIC_CALENDLY_URL.trim()
    ? process.env.NEXT_PUBLIC_CALENDLY_URL.trim()
    : "https://calendly.com/mahrukh-plaincode";
