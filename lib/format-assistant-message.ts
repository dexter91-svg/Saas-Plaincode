/**
 * Turn common LLM markdown into plain text for chat bubbles (no markdown renderer).
 * Avoids stripping every "*" (e.g. "5*" ratings) unlike a global /\*+/g removal.
 */
export function formatAssistantMessageForDisplay(content: string): string {
  let s = content;
  // Fenced code blocks → inner text only
  s = s.replace(/```(?:[\w-]+)?\n([\s\S]*?)```/g, "$1");
  s = s.replace(/```([\s\S]*?)```/g, "$1");
  // **bold** and __bold__
  s = s.replace(/\*\*([\s\S]*?)\*\*/g, (_, inner: string) => inner.trim());
  s = s.replace(/__([^_\n]+)__/g, "$1");
  // *italic* (single asterisks, not **)
  s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1");
  // ATX headings at line start
  s = s.replace(/^#{1,6}\s+/gm, "");
  // Unicode bullets at line start → hyphen lists (bullet, middle dot, geometric shapes)
  s = s.replace(/^[\u2022\u00B7\u25AA\u25B8\u25E6]\s+/gm, "- ");
  s = s.replace(/\u2022\s+/g, "- ");
  return s;
}
