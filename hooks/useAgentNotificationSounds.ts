"use client";

import { useEffect, useRef } from "react";
import { playNewMessageSound, playHumanRequestSound } from "@/lib/agent-notification-sounds";

export type ConversationNotifyRow = {
  id: string;
  lastUserMessageId: string | null;
  userMessageCount: number;
  requestsHuman: boolean;
};

type SnapshotEntry = {
  lastUserMessageId: string | null;
  userMessageCount: number;
  requestsHuman: boolean;
};

/**
 * Compare inbox poll results and play a sound alert when activity changes:
 * - Plays the urgent human-request sound when a conversation is newly flagged
 *   as wanting a human agent (takes priority over the regular sound).
 * - Plays the regular multi-beep for any other new customer message.
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
          requestsHuman: c.requestsHuman,
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
        requestsHuman: c.requestsHuman,
      };
      next.set(c.id, curr);

      const p = prev.get(c.id);

      if (!p) {
        // Brand-new conversation in the list
        if (c.userMessageCount >= 1 && c.lastUserMessageId) {
          if (c.requestsHuman) {
            playHumanRequestSound();
          } else {
            playNewMessageSound();
          }
        }
        continue;
      }

      // Existing conversation — check what changed
      const humanRequestJustFlagged = c.requestsHuman && !p.requestsHuman;
      const hasNewMessage =
        c.lastUserMessageId &&
        c.lastUserMessageId !== p.lastUserMessageId &&
        c.userMessageCount > p.userMessageCount;

      if (humanRequestJustFlagged) {
        // Human-request flag newly set — always play the urgent sound
        playHumanRequestSound();
      } else if (hasNewMessage) {
        playNewMessageSound();
      }
    }

    snapshotRef.current = next;
  }, [conversations, soundEnabled, enabled]);
}
