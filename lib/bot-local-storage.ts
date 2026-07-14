/**
 * Client-only persisted bot UI state. Must be reset when the logged-in user changes,
 * otherwise another account's scraped URL / chatbot id can appear after signup or login.
 */
export const BOT_STATE_STORAGE_KEY = "bot-state-v2";

/** Replace storage with a clean slate for the current session user (call after signup / login). */
export function resetBotStorageForNewAccount(userPlan: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      BOT_STATE_STORAGE_KEY,
      JSON.stringify({
        userPlan,
        chatbotId: null,
        stores: [],
        storeLimit: 1,
        scrapedData: null,
        personality: null,
        conversationRemaining: 100,
        messages: [],
        forwarded: [],
        recentActivity: [],
        tickets: [],
      })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearBotStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BOT_STATE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
