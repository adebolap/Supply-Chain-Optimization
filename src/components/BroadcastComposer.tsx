"use client";

import { useState, useEffect, useActionState } from "react";
import {
  sendBroadcast,
  getSmsCostEstimate,
  type BroadcastAudience,
} from "@/lib/actions/broadcast";
import type { SmsCostEstimate } from "@/lib/smsCost";

interface Counts {
  ALL: number;
  ATTENDING: number;
  NOT_RESPONDED: number;
  DECLINED: number;
}

export default function BroadcastComposer({
  weddingId,
  counts,
  rsvpDeadline,
}: {
  weddingId: string;
  counts: Counts;
  rsvpDeadline: string | null;
}) {
  const [channel, setChannel] = useState("EMAIL");
  const [audience, setAudience] = useState<BroadcastAudience>("ALL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [smsEstimate, setSmsEstimate] = useState<SmsCostEstimate | null>(null);

  const [state, formAction, isPending] = useActionState(
    sendBroadcast.bind(null, weddingId),
    { error: null } as { error: string | null; sent?: number }
  );

  useEffect(() => {
    let cancelled = false;
    if (channel !== "SMS") {
      Promise.resolve().then(() => {
        if (!cancelled) setSmsEstimate(null);
      });
      return () => {
        cancelled = true;
      };
    }
    getSmsCostEstimate(weddingId, audience).then((result) => {
      if (!cancelled) setSmsEstimate(result);
    });
    return () => {
      cancelled = true;
    };
  }, [weddingId, channel, audience]);

  function applyReminderTemplate() {
    setChannel("EMAIL");
    setAudience("NOT_RESPONDED");
    setSubject("Quick reminder to RSVP");
    setBody(
      `Hi! Just a friendly reminder to RSVP${
        rsvpDeadline ? ` by ${rsvpDeadline}` : ""
      }. We'd love to know if you can make it!`
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {counts.NOT_RESPONDED > 0 && (
        <button
          type="button"
          onClick={applyReminderTemplate}
          className="self-start rounded-full border border-accent px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
        >
          Remind {counts.NOT_RESPONDED} guest
          {counts.NOT_RESPONDED === 1 ? "" : "s"} who haven&apos;t responded
        </button>
      )}
      {state.error && (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          {state.error}
        </p>
      )}
      {state.sent !== undefined && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          Sent to {state.sent} guest{state.sent === 1 ? "" : "s"}.
        </p>
      )}
      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="channel">
              Channel
            </label>
            <select
              id="channel"
              name="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="EMAIL">Email</option>
              <option value="SMS">Text message (SMS)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="audience">
              Send to
            </label>
            <select
              id="audience"
              name="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as BroadcastAudience)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="ALL">All guests ({counts.ALL})</option>
              <option value="ATTENDING">Attending ({counts.ATTENDING})</option>
              <option value="NOT_RESPONDED">
                Haven&apos;t responded yet ({counts.NOT_RESPONDED})
              </option>
              <option value="DECLINED">Declined ({counts.DECLINED})</option>
            </select>
          </div>
        </div>

        <input
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (email only)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
        />
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={5}
          placeholder="Your message to guests..."
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
        />
        {(audience === "NOT_RESPONDED" || /rsvp/i.test(body)) && (
          <p className="text-xs text-muted-foreground">
            Your RSVP link will be added to the end of this message
            automatically.
          </p>
        )}
        {channel === "SMS" && smsEstimate && smsEstimate.breakdown.length > 0 && (
          <div className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            <div className="mb-1 font-medium text-foreground">
              Estimated cost: ${smsEstimate.total.toFixed(2)}
            </div>
            {smsEstimate.breakdown.map((b) => (
              <div key={b.country} className="flex justify-between">
                <span>
                  {b.country} &times; {b.count}
                </span>
                <span>${b.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? "Sending..." : "Send announcement"}
        </button>
      </form>
    </div>
  );
}
