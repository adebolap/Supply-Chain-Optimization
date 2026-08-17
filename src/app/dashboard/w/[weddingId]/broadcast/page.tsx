import { requireWeddingOwner } from "@/lib/actions/weddings";
import {
  sendBroadcast,
  getBroadcastHistory,
  getAudienceCounts,
} from "@/lib/actions/broadcast";

export default async function BroadcastPage({
  params,
}: {
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  const { wedding } = await requireWeddingOwner(weddingId);

  if (wedding.tier === "FREE") {
    return (
      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        Broadcast messaging (email and SMS announcements to your guest list)
        is a Premium feature.{" "}
        <a
          href={`/dashboard/w/${weddingId}/settings`}
          className="underline"
        >
          Upgrade to send announcements.
        </a>
      </div>
    );
  }

  const [counts, history] = await Promise.all([
    getAudienceCounts(weddingId),
    getBroadcastHistory(weddingId),
  ]);

  const action = sendBroadcast.bind(null, weddingId);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Send an announcement</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Reach your guests by email or text, no separate event-planner
          broadcast needed.
        </p>
        <form action={action} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="channel">
                Channel
              </label>
              <select
                id="channel"
                name="channel"
                defaultValue="EMAIL"
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
                defaultValue="ALL"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="ALL">All guests ({counts.ALL})</option>
                <option value="ATTENDING">
                  Attending ({counts.ATTENDING})
                </option>
                <option value="NOT_RESPONDED">
                  Haven&apos;t responded yet ({counts.NOT_RESPONDED})
                </option>
                <option value="DECLINED">Declined ({counts.DECLINED})</option>
              </select>
            </div>
          </div>

          <input
            name="subject"
            placeholder="Subject (email only)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
          />
          <textarea
            name="body"
            required
            rows={5}
            placeholder="Your message to guests..."
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
          />
          <button
            type="submit"
            className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Send announcement
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Sent history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No announcements sent yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((h) => (
              <li
                key={h.id}
                className="rounded-lg border border-border px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {h.channel === "EMAIL" ? "Email" : "Text message"}
                    {h.subject ? `: ${h.subject}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {h.audience}. Sent to {h.recipientCount}
                  {h.failureCount > 0 ? `, ${h.failureCount} failed` : ""}.
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
