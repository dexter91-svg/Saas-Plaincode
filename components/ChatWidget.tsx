"use client";

import { useState } from "react";
import Image from "next/image";
import ChatPanel from "@/components/ChatPanel";

interface ChatWidgetProps {
  /** Force embed mode (minimal header, no Dashboard/Integration/conversation count). When true or when running inside an iframe, snippet-style UI is used. */
  embed?: boolean;
}

export default function ChatWidget({ embed: embedProp }: ChatWidgetProps = {}) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isInIframe = typeof window !== "undefined" && window.self !== window.top;
  const embed = embedProp ?? isInIframe;

  const handleOpen = () => {
    setIsClosing(false);
    setOpen(true);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
    }, 320);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end font-poppins">
      {/* Smooth transitional opening & closing chat panel */}
      {open && (
        <div
          className={`mb-3 w-[340px] sm:w-[380px] origin-bottom-right ${
            isClosing ? "animate-widget-close pointer-events-none" : "animate-widget-open"
          }`}
        >
          <ChatPanel compact embed={embed} onClose={handleClose} />
        </div>
      )}

      {/* Floating Plainbot Site Logo Launcher Button */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          className="group relative flex h-14 w-14 animate-launcher-pop items-center justify-center rounded-full bg-white p-1.5 shadow-[0_12px_28px_-6px_rgba(43,34,28,0.35)] ring-4 ring-[#2B221C]/20 border-[2px] border-[#2B221C]/25 transition-all duration-300 hover:scale-108 hover:shadow-[0_16px_34px_-6px_rgba(43,34,28,0.5)] active:scale-95 focus:outline-none"
          aria-label="Open AI Chat Assistant"
          title="Chat with Plainbot Assistant"
        >
          <Image
            src="/logo.svg"
            alt="Plainbot"
            width={31}
            height={31}
            className="object-contain transition-transform duration-300 group-hover:scale-110"
            priority
          />
          {/* Subtle online badge */}
          <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#6B8F71] shadow-sm" />
        </button>
      )}
    </div>
  );
}
