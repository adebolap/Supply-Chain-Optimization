import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import { createTable } from "@/lib/actions/seating";
import SeatingBoard from "@/components/SeatingBoard";
import Link from "next/link";

export default async function SeatingPage({
  params,
  searchParams,
}: {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const { weddingId } = await params;
  await requireWeddingOwner(weddingId);
  const { event: eventIdParam } = await searchParams;

  const events = await prisma.event.findMany({
    where: { weddingId },
    orderBy: { startsAt: "asc" },
  });
  const activeEvent = events.find((e) => e.id === eventIdParam) || events[0];

  if (!activeEvent) {
    return <p className="text-sm text-zinc-500">Create an event first.</p>;
  }

  const [tables, guests] = await Promise.all([
    prisma.table.findMany({
      where: { weddingId, eventId: activeEvent.id },
      include: { seats: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.guest.findMany({
      where: { weddingId },
      include: { seat: true, rsvps: { where: { eventId: activeEvent.id } } },
    }),
  ]);

  const eligibleGuests = guests.filter(
    (g) => g.rsvps[0]?.status !== "DECLINED"
  );
  const guestsById = Object.fromEntries(
    eligibleGuests.map((g) => [
      g.id,
      { id: g.id, firstName: g.firstName, lastName: g.lastName },
    ])
  );
  const unseatedGuests = eligibleGuests
    .filter((g) => !g.seat || !tables.some((t) => t.id === g.seat!.tableId))
    .map((g) => guestsById[g.id]);

  const createTableAction = createTable.bind(null, weddingId, activeEvent.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {events.map((e) => (
          <Link
            key={e.id}
            href={`/dashboard/w/${weddingId}/seating?event=${e.id}`}
            className={`rounded-full px-3 py-1.5 text-sm ${
              e.id === activeEvent.id
                ? "bg-foreground text-background"
                : "border border-black/10 dark:border-white/10"
            }`}
          >
            {e.name}
          </Link>
        ))}
      </div>

      <form action={createTableAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Table name</label>
          <input
            name="name"
            required
            placeholder="Table 1"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Capacity</label>
          <input
            name="capacity"
            type="number"
            min={1}
            defaultValue={8}
            className="w-24 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background"
        >
          Add table
        </button>
      </form>

      <SeatingBoard
        weddingId={weddingId}
        tables={tables}
        unseatedGuests={unseatedGuests}
        guestsById={guestsById}
      />
    </div>
  );
}
