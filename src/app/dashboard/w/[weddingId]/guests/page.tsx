import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import { FREE_TIER_LIMITS } from "@/lib/limits";
import AddGuestForm from "@/components/AddGuestForm";
import CsvImportForm from "@/components/CsvImportForm";
import SheetImportForm from "@/components/SheetImportForm";
import GuestList from "@/components/GuestList";
import LinkBanner from "@/components/LinkBanner";

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  const { wedding } = await requireWeddingOwner(weddingId);

  const guests = await prisma.guest.findMany({
    where: { weddingId },
    orderBy: [{ household: "asc" }, { lastName: "asc" }],
    include: { rsvps: true },
  });

  const rsvpByGuest = Object.fromEntries(
    guests.map((g) => [
      g.id,
      g.rsvps.map((r) => ({ guestId: g.id, status: r.status })),
    ])
  );

  const atLimit = wedding.tier === "FREE" && guests.length >= FREE_TIER_LIMITS.maxGuests;

  return (
    <div className="flex flex-col gap-8">
      <LinkBanner label="Guest RSVP page" path={`/rsvp/${wedding.slug}`} />

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Guest list</h2>
          <span className="text-sm text-muted-foreground">
            {guests.length}
            {wedding.tier === "FREE" ? ` / ${FREE_TIER_LIMITS.maxGuests}` : ""} guests
          </span>
        </div>
        {atLimit && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            You&apos;ve reached the free plan&apos;s {FREE_TIER_LIMITS.maxGuests}-guest limit.{" "}
            <a href={`/dashboard/w/${weddingId}/settings`} className="underline">
              Upgrade to add more.
            </a>
          </p>
        )}
        <GuestList weddingId={weddingId} guests={guests} rsvpByGuest={rsvpByGuest} />
      </div>

      {!atLimit && (
        <div className="flex flex-col gap-4">
          <h3 className="font-semibold">Add a guest</h3>
          <AddGuestForm weddingId={weddingId} />
          <CsvImportForm weddingId={weddingId} />
          <SheetImportForm weddingId={weddingId} />
        </div>
      )}
    </div>
  );
}
