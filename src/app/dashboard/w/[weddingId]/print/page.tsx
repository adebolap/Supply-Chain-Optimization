import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";

export default async function CoordinatorPrintPage({
  params,
}: {
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  const { wedding } = await requireWeddingOwner(weddingId);

  if (wedding.tier === "FREE") {
    return (
      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        The printable seating chart and day-of coordinator sheet are a
        Premium feature.{" "}
        <a href={`/dashboard/w/${weddingId}/settings`} className="underline">
          Upgrade to unlock export.
        </a>
      </div>
    );
  }

  const [events, guests, checklistItems] = await Promise.all([
    prisma.event.findMany({
      where: { weddingId },
      orderBy: { startsAt: "asc" },
      include: {
        tables: {
          orderBy: { createdAt: "asc" },
          include: { seats: { include: { guest: true }, orderBy: { position: "asc" } } },
        },
        rsvps: { include: { guest: true } },
      },
    }),
    prisma.guest.findMany({
      where: { weddingId },
      orderBy: [{ household: "asc" }, { lastName: "asc" }],
      include: { rsvps: true },
    }),
    prisma.checklistItem.findMany({
      where: { weddingId, isComplete: false },
      orderBy: [{ dueDate: "asc" }],
    }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div className="print:hidden flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Day-of coordinator sheet</h1>
          <p className="text-sm text-muted-foreground">
            Seating chart, guest list, and remaining tasks in one printable
            page. Use your browser&apos;s print dialog to save as PDF.
          </p>
        </div>
        <PrintButton />
      </div>

      {events.map((event) => {
        const seatedGuestIds = new Set(
          event.tables.flatMap((t) => t.seats.map((s) => s.guestId))
        );
        const unseated = event.rsvps.filter(
          (r) => r.status !== "DECLINED" && !seatedGuestIds.has(r.guestId)
        );

        return (
          <section key={event.id} className="break-after-page">
            <h2 className="font-display mb-4 text-2xl font-semibold">
              Seating: {event.name}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {event.tables.map((table) => (
                <div
                  key={table.id}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="mb-2 text-sm font-semibold">
                    {table.name} ({table.seats.length}/{table.capacity})
                  </div>
                  <ul className="text-sm text-muted-foreground">
                    {table.seats.map((s) => (
                      <li key={s.id}>
                        {s.guest.firstName} {s.guest.lastName}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {unseated.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 text-sm font-semibold">Unseated</div>
                <p className="text-sm text-muted-foreground">
                  {unseated
                    .map((r) => `${r.guest.firstName} ${r.guest.lastName}`)
                    .join(", ")}
                </p>
              </div>
            )}
          </section>
        );
      })}

      <section className="break-after-page">
        <h2 className="font-display mb-4 text-2xl font-semibold">
          Master guest list
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-1.5 pr-3 font-medium">Name</th>
              <th className="py-1.5 pr-3 font-medium">Household</th>
              <th className="py-1.5 pr-3 font-medium">RSVP</th>
              <th className="py-1.5 font-medium">Dietary notes</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g) => {
              const attending = g.rsvps.some((r) => r.status === "ATTENDING");
              const declined =
                g.rsvps.length > 0 && g.rsvps.every((r) => r.status === "DECLINED");
              return (
                <tr key={g.id} className="border-b border-border-soft">
                  <td className="py-1.5 pr-3">
                    {g.firstName} {g.lastName}
                  </td>
                  <td className="py-1.5 pr-3 text-muted-foreground">
                    {g.household || "-"}
                  </td>
                  <td className="py-1.5 pr-3 text-muted-foreground">
                    {attending ? "Attending" : declined ? "Declined" : "No response"}
                  </td>
                  <td className="py-1.5 text-muted-foreground">
                    {g.dietaryNotes || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-display mb-4 text-2xl font-semibold">
          Remaining checklist
        </h2>
        {checklistItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Everything on the checklist is done.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {checklistItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <span>{item.title}</span>
                {item.dueDate && (
                  <span className="text-muted-foreground">
                    due {new Date(item.dueDate).toLocaleDateString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
