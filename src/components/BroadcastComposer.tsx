"use client";

import { useState, useActionState } from "react";
import { sendBroadcast, type BroadcastAudience } from "@/lib/actions/broadcast";

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

  const [state, formAction, isPending] = useActionState(
    sendBroadcast.bind(null, weddingId),
    { error: null } as { error: string | null; sent?: number }
  );

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
