export function register() {
  const secret = process.env.CRON_SECRET;
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production" || !secret) return;

  const run = (path: string) =>
    fetch(`http://127.0.0.1:${process.env.PORT || 3000}${path}`, {
      headers: { Authorization: `Bearer ${secret}` },
    }).catch((err) => console.error(`Cron ${path} failed:`, err));

  setInterval(() => run("/api/cron/escalation-alerts"), 5 * 60 * 1000);
  setInterval(() => run("/api/cron/ticket-sla-reminders"), 10 * 60 * 1000);
}
