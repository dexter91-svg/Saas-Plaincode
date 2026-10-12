"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import ChatPanel from "@/components/ChatPanel";

interface ChatWidgetProps {
  /** Force embed mode (minimal header, no Dashboard/Integration/conversation count). When true or when running inside an iframe, snippet-style UI is used. */
  embed?: boolean;
}

export default function ChatWidget({ embed: embedProp }: ChatWidgetProps = {}) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [panelPos, setPanelPos] = useState<{ left?: number; right?: number; top?: number; bottom?: number; origin: string }>({
    origin: "bottom right",
  });

  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const elemStartRef = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const isInIframe = typeof window !== "undefined" && window.self !== window.top;
  const embed = embedProp ?? isInIframe;

  // Restore saved position from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("plainbot_widget_pos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.left === "number" && typeof parsed.top === "number") {
          setPos(parsed);
        }
      }
    } catch (_) {}
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    const rect = e.currentTarget.getBoundingClientRect();
    elemStartRef.current = { x: rect.left, y: rect.top };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (!dragMovedRef.current && Math.hypot(dx, dy) > 4) {
      dragMovedRef.current = true;
    }
    if (dragMovedRef.current) {
      const btnSize = 56;
      const maxLeft = window.innerWidth - btnSize - 12;
      const maxTop = window.innerHeight - btnSize - 12;
      const newLeft = Math.max(12, Math.min(maxLeft, elemStartRef.current.x + dx));
      const newTop = Math.max(12, Math.min(maxTop, elemStartRef.current.y + dy));
      setPos({ left: newLeft, top: newTop });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (dragMovedRef.current && pos) {
      try {
        sessionStorage.setItem("plainbot_widget_pos", JSON.stringify(pos));
      } catch (_) {}
    }
  };

  const handleOpen = () => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    setIsClosing(false);

    // Compute anchored coordinates and morph origin for panel
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = Math.min(380, window.innerWidth - 24);
      const panelHeight = Math.min(600, window.innerHeight - 24);

      const isRight = (rect.left + rect.width / 2) > (window.innerWidth / 2);
      const isBottom = (rect.top + rect.height / 2) > (window.innerHeight / 2);

      let pLeft = isRight ? rect.right - panelWidth : rect.left;
      let pTop = isBottom ? rect.bottom - panelHeight : rect.top;

      pLeft = Math.max(12, Math.min(window.innerWidth - panelWidth - 12, pLeft));
      pTop = Math.max(12, Math.min(window.innerHeight - panelHeight - 12, pTop));

      const originX_px = Math.round((rect.left + rect.width / 2) - pLeft);
      const originY_px = Math.round((rect.top + rect.height / 2) - pTop);
      const originStr = `${originX_px}px ${originY_px}px`;
      setPanelPos({
        left: pLeft,
        top: pTop,
        origin: originStr,
      });
    }

    setOpen(true);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
    }, 380);
  };

  return (
    <>
      {/* Morphing chat panel positioned relative to launcher placement */}
      {open && (
        <div
          style={{
            position: "fixed",
            left: panelPos.left ?? undefined,
            top: panelPos.top ?? undefined,
            bottom: panelPos.left === undefined && panelPos.bottom !== undefined ? panelPos.bottom : undefined,
            right: panelPos.left === undefined && panelPos.right !== undefined ? panelPos.right : undefined,
            ["--widget-origin" as any]: panelPos.origin,
            zIndex: 50,
          }}
          className={`w-[340px] sm:w-[380px] font-poppins ${
            isClosing ? "animate-widget-close pointer-events-none" : "animate-widget-open"
          }`}
        >
          <ChatPanel compact embed={embed} onClose={handleClose} />
        </div>
      )}

      {/* Clean Draggable Floating Launcher Emblem (No Clunky Rings or Green Dot) */}
      {!open && (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleOpen}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={
            pos
              ? { position: "fixed", left: pos.left, top: pos.top, zIndex: 50 }
              : { position: "fixed", right: 20, bottom: 20, zIndex: 50 }
          }
          className="group flex h-14 w-14 animate-launcher-pop items-center justify-center rounded-full bg-white p-2 shadow-[0_10px_28px_-4px_rgba(43,34,28,0.22),0_4px_10px_rgba(43,34,28,0.06)] border border-[#2B221C]/10 transition-transform duration-200 hover:scale-106 active:scale-95 cursor-grab active:cursor-grabbing select-none touch-none focus:outline-none"
          aria-label="Open AI Chat Assistant"
          title="Chat with Plainbot Assistant (Drag to move)"
        >
          <Image
            src="/logo.svg"
            alt="Plainbot"
            width={30}
            height={30}
            className="object-contain pointer-events-none"
            priority
          />
        </button>
      )}
    </>
  );
}
