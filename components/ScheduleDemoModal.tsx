"use client";

import { useState } from "react";
import Button from "./Button";
import Input from "./Input";

type Step = "calendar" | "details" | "done";

export default function ScheduleDemoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("calendar");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetLink, setMeetLink] = useState<string | null>(null);

  const handleClose = () => {
    setStep("calendar");
    setDate("");
    setTime("");
    setName("");
    setEmail("");
    setError(null);
    setMeetLink(null);
    onClose();
  };

  const handleCalendarNext = () => {
    if (date && time) setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/schedule-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          date,
          time,
          timeZone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || "Failed to schedule demo. Please try again.";
        const isExpired = msg.toLowerCase().includes("re-authorize") || msg.toLowerCase().includes("expired");
        setError(
          isExpired
            ? "Calendar access expired. Get a new refresh token (OAuth flow with your Gmail), then set GOOGLE_REFRESH_TOKEN in .env.local. See DEMO_CALENDAR_INTEGRATION.md."
            : msg
        );
        setSubmitting(false);
        return;
      }
      setMeetLink(data.meetLink || null);
      setStep("done");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-soft-lg">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">
            {step === "calendar" && "Schedule a demo"}
            {step === "details" && "Your details"}
            {step === "done" && "You're all set!"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6">
          {step === "calendar" && (
            <>
              <p className="text-sm text-slate-400 mb-4">
                Pick a date and time. We'll send a Google Meet link to your email and add the meeting to your calendar.
              </p>
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">Time</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                </label>
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleCalendarNext} disabled={!date || !time}>
                  Next
                </Button>
              </div>
            </>
          )}

          {step === "details" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-400">
                Your demo: <strong className="text-slate-200">{date}</strong> at <strong className="text-slate-200">{time}</strong>
              </p>
              {error && (
                <p className="text-sm text-red-400 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
                  {error}
                </p>
              )}
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <div className="mt-6 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("calendar")}>
                  Back
                </Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
                  {submitting ? "Scheduling…" : "Schedule demo"}
                </Button>
              </div>
            </form>
          )}

          {step === "done" && (
            <>
              <div className="flex justify-center mb-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-500/20 text-primary-400">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </div>
              <p className="text-center text-slate-300">
                Your demo has been scheduled. You'll receive a confirmation email at{" "}
                <span className="font-medium text-primary-400">{email}</span> with the Google Meet link.
              </p>
              {meetLink && (
                <p className="mt-3 text-center">
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:underline text-sm"
                  >
                    Join Google Meet →
                  </a>
                </p>
              )}
              <p className="mt-3 text-center text-sm text-slate-500">
                When: {date} at {time} · 30 min
              </p>
              <div className="mt-6">
                <Button variant="outline" fullWidth onClick={handleClose}>
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
