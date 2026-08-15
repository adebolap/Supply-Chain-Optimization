import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import { createEvent, deleteEvent } from "@/lib/actions/events";
import { FREE_TIER_LIMITS } from "@/lib/limits";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  const { wedding } = await requireWeddingOwner(weddingId);

  const events = await prisma.event.findMany({
    where: { weddingId },
    orderBy: { startsAt: "asc" },
  });

  const createAction = createEvent.bind(null, weddingId);
  const atLimit = wedding.tier === "FREE" && events.length >= FREE_TIER_LIMITS.maxEvents;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Events</h2>
        <ul className="flex flex-col gap-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm "
            >
              <div>
                <span className="font-medium">{e.name}</span>{" "}
                <span className="text-muted-foreground">
                  {new Date(e.startsAt).toLocaleString()}
                  {e.location ? ` · ${e.location}` : ""}
                </span>
              </div>
              {events.length > 1 && (
                <form action={deleteEvent.bind(null, weddingId, e.id)}>
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </div>

      {atLimit ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          The free plan supports {FREE_TIER_LIMITS.maxEvents} event.{" "}
          <a href={`/dashboard/w/${weddingId}/settings`} className="underline">
            Upgrade for multi-event support.
          </a>
        </p>
      ) : (
        <div>
          <h3 className="mb-3 font-semibold">Add an event</h3>
          <form action={createAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              name="name"
              required
              placeholder="e.g. Rehearsal Dinner"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
            />
            <input
              name="startsAt"
              type="datetime-local"
              required
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
            />
            <input
              name="location"
              placeholder="Location (optional)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover sm:col-span-3"
            >
              Add event
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
