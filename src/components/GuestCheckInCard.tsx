"use client";

import { useState, useTransition } from "react";
import { toggleCheckIn } from "@/lib/actions/checkin";

interface RsvpForEvent {
  eventId: string;
  eventName: string;
  status: string;
  checkedInAt: Date | null;
}

export default function GuestCheckInCard({
  weddingSlug,
  guestId,
  firstName,
  lastName,
  rsvps,
}: {
  weddingSlug: string;
  guestId: string;
  firstName: string;
  lastName: string;
  rsvps: RsvpForEvent[];
}) {
  const [state, setState] = useState(
    Object.fromEntries(rsvps.map((r) => [r.eventId, Boolean(r.checkedInAt)]))
  );
  const [isPending, startTransition] = useTransition();

  function handleToggle(eventId: string, next: boolean) {
    setState((prev) => ({ ...prev, [eventId]: next }));
    startTransition(async () => {
      await toggleCheckIn(weddingSlug, guestId, eventId, next);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-display mb-4 text-2xl font-semibold">
        {firstName} {lastName}
      </h2>
      <div className="flex flex-col gap-3">
        {rsvps.map((r) => {
          const checkedIn = state[r.eventId];
          const declined = r.status === "DECLINED";
          return (
            <div
              key={r.eventId}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium">{r.eventName}</div>
                {declined && (
                  <div className="text-xs text-muted-foreground">
                    Marked as not attending
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleToggle(r.eventId, !checkedIn)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  checkedIn
                    ? "bg-accent text-accent-foreground"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {checkedIn ? "Checked in" : "Check in"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
