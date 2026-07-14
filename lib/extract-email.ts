const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

export function extractEmailFromText(text: string): string | null {
  const m = (text || "").match(EMAIL_RE);
  return m ? m[0] : null;
}

/** Prefer most recent user message that contains an email. */
export function extractFirstEmailFromMessages(
  msgs: { role: string; content: string }[]
): string | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user") {
      const e = extractEmailFromText(msgs[i].content);
      if (e) return e;
    }
  }
  return null;
}
