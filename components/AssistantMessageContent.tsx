"use client";

import { formatAssistantMessageForDisplay } from "@/lib/format-assistant-message";

/**
 * Renders assistant text with [label](url) and raw https://… as links (opens in new tab).
 */
export default function AssistantMessageContent({ content }: { content: string }) {
  const plain = formatAssistantMessageForDisplay(content);
  const block: { type: "text" | "a"; v: string; href?: string }[] = [];
  let i = 0;
  while (i < plain.length) {
    const rest = plain.slice(i);
    const md = rest.match(/^\[([^\]]+)\]\((https?:[^)\s]+)\)/);
    if (md) {
      block.push({ type: "a", v: md[1], href: md[2] });
      i += md[0].length;
      continue;
    }
    const raw = rest.match(/^(https?:\/\/[^\s<]+?)(?=[\s<]|$)/);
    if (raw) {
      const href = raw[1].replace(/[.,;:!?)\]]+$/, "");
      block.push({ type: "a", v: href, href });
      i += raw[0].length;
      continue;
    }
    const m = rest.match(/(\[|https?:\/\/)/);
    const jump = m && m.index !== undefined ? m.index : rest.length;
    if (jump > 0) {
      block.push({ type: "text", v: rest.slice(0, jump) });
      i += jump;
    } else {
      block.push({ type: "text", v: rest[0] });
      i += 1;
    }
  }

  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {block.map((b, idx) =>
        b.type === "a" && b.href ? (
          <a
            key={idx}
            href={b.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-400 underline hover:text-primary-300 break-all"
          >
            {b.v}
          </a>
        ) : (
          <span key={idx}>{b.v}</span>
        )
      )}
    </p>
  );
}
