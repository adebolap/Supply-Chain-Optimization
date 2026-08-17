"use client";

import { useState, useTransition } from "react";
import { toggleCheckIn } from "@/lib/actions/checkin";

interface RsvpForEvent {
  eventId: string;
  eventName: string;
  status: string;
  checkedInAt: Date | null;
  admits: number;
  plusOneName: string | null;
}

export default function GuestCheckInCard({
  weddingSlug,
  guestId,
  firstName,
  lastName,
  tableName,
  tableMates,
  primaryEventId,
  wasAlreadyCheckedIn,
  justCheckedIn,
  rsvps,
}: {
  weddingSlug: string;
  guestId: string;
  firstName: string;
  lastName: string;
  tableName: string | null;
  tableMates: string[];
  primaryEventId: string | null;
  wasAlreadyCheckedIn: boolean;
  justCheckedIn: boolean;
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

  const primary = rsvps.find((r) => r.eventId === primaryEventId);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-display mb-1 text-2xl font-semibold">
        {firstName} {lastName}
      </h2>
      {primary && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Admits {primary.admits}
            {primary.plusOneName ? ` (with ${primary.plusOneName})` : ""}
            {tableName ? ` · Table ${tableName}` : ""}
          </p>
          {tableMates.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Seated with: {tableMates.join(", ")}
            </p>
          )}
        </div>
      )}

      {primary && justCheckedIn && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-center dark:bg-emerald-900/20">
          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            Admitted
          </p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
            {primary.eventName}
          </p>
        </div>
      )}
      {primary && wasAlreadyCheckedIn && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-center dark:bg-amber-900/20">
          <p className="text-lg font-semibold text-amber-800 dark:text-amber-300">
            Already checked in
          </p>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
            {primary.eventName}
            {primary.checkedInAt
              ? ` at ${new Date(primary.checkedInAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : ""}
          </p>
        </div>
      )}

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
