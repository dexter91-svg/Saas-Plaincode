/** Browser notification sounds for agents (unlock required after user gesture). */

let audioUnlocked = false;

export function isAgentAudioUnlocked(): boolean {
  return audioUnlocked;
}

/** Call once after login + user click/keypress so playback is allowed. */
export function unlockAgentNotificationAudio(): void {
  audioUnlocked = true;
}

function playToneSequence(
  steps: { freq: number; durationMs: number; gapMs?: number }[],
  volume = 0.25
): void {
  if (!audioUnlocked || typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    let t = ctx.currentTime;
    steps.forEach((step) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = step.freq;
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + step.durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + step.durationMs / 1000);
      t += step.durationMs / 1000 + (step.gapMs ?? 0) / 1000;
    });
    const totalMs = steps.reduce((s, x) => s + x.durationMs + (x.gapMs ?? 0), 0);
    window.setTimeout(() => void ctx.close(), totalMs + 80);
  } catch {
    /* ignore */
  }
}

/**
 * Multi-beep alert for a new incoming customer message — a new customer's first
 * message, or any new message in a conversation still awaiting a reply.
 */
export function playNewMessageSound(): void {
  playToneSequence([
    { freq: 988, durationMs: 90, gapMs: 70 },
    { freq: 988, durationMs: 90, gapMs: 70 },
    { freq: 988, durationMs: 110 },
  ]);
}

export function playTestNotificationSound(): void {
  if (!audioUnlocked) {
    unlockAgentNotificationAudio();
  }
  playNewMessageSound();
}
