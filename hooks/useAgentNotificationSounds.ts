"use client";

import { useEffect, useRef } from "react";
import { playNewMessageSound } from "@/lib/agent-notification-sounds";

export type ConversationNotifyRow = {
  id: string;
  lastUserMessageId: string | null;
  userMessageCount: number;
};

type SnapshotEntry = {
  lastUserMessageId: string | null;
  userMessageCount: number;
};

/**
 * Compare inbox poll results and play a multi-beep alert when a new customer message
 * appears — either the first message of a new conversation, or any new message in a
 * conversation still awaiting a reply.
 * First call after mount is silent (establishes baseline).
 */
export function useAgentNotificationSounds(
  conversations: ConversationNotifyRow[] | undefined,
  soundEnabled: boolean,
  enabled: boolean,
  resetKey?: string | null
): void {
  const snapshotRef = useRef<Map<string, SnapshotEntry>>(new Map());
  const silentFirstRef = useRef(true);

  useEffect(() => {
    silentFirstRef.current = true;
    snapshotRef.current = new Map();
  }, [resetKey]);

  useEffect(() => {
    if (!enabled || !soundEnabled || !conversations) return;

    if (silentFirstRef.current) {
      const map = new Map<string, SnapshotEntry>();
      conversations.forEach((c) => {
        map.set(c.id, {
          lastUserMessageId: c.lastUserMessageId,
          userMessageCount: c.userMessageCount,
        });
      });
      snapshotRef.current = map;
      silentFirstRef.current = false;
      return;
    }

    const prev = snapshotRef.current;
    const next = new Map<string, SnapshotEntry>();

    for (const c of conversations) {
      const curr: SnapshotEntry = {
        lastUserMessageId: c.lastUserMessageId,
        userMessageCount: c.userMessageCount,
      };
      next.set(c.id, curr);

      const p = prev.get(c.id);
      if (!p) {
        if (c.userMessageCount >= 1 && c.lastUserMessageId) {
          playNewMessageSound();
        }
        continue;
      }

      if (
        c.lastUserMessageId &&
        c.lastUserMessageId !== p.lastUserMessageId &&
        c.userMessageCount > p.userMessageCount
      ) {
        playNewMessageSound();
      }
    }

    snapshotRef.current = next;
  }, [conversations, soundEnabled, enabled]);
}
