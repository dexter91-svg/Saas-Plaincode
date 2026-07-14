"use client";

import { useEffect } from "react";
import { unlockAgentNotificationAudio, isAgentAudioUnlocked } from "@/lib/agent-notification-sounds";

/** Unlocks notification audio after the first user interaction in the dashboard. */
export default function AgentAudioUnlock() {
  useEffect(() => {
    if (isAgentAudioUnlocked()) return;

    const unlock = () => {
      unlockAgentNotificationAudio();
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };

    document.addEventListener("pointerdown", unlock, { once: true, passive: true });
    document.addEventListener("keydown", unlock, { once: true });

    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  return null;
}
