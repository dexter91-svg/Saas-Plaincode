"use client";

import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";

interface ChatWidgetProps {
  /** Force embed mode (minimal header, no Dashboard/Integration/conversation count). When true or when running inside an iframe, snippet-style UI is used. */
  embed?: boolean;
}

export default function ChatWidget({ embed: embedProp }: ChatWidgetProps = {}) {
  const [open, setOpen] = useState(false);
  const isInIframe = typeof window !== "undefined" && window.self !== window.top;
  const embed = embedProp ?? isInIframe;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <div className="mb-3 w-[320px] sm:w-[380px]">
          <ChatPanel compact embed={embed} />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        {open ? "Close Assistant" : "Chat with Assistant"}
      </button>
    </div>
  );
}

