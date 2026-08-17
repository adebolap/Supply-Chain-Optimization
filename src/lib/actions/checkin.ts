"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// No name-search lookup here on purpose: admission is only ever triggered
// by visiting a guest's own check-in link (their QR code), never by an
// usher typing a name. That's the only way to guarantee nobody gets
// admitted under someone else's name.
export async function getGuestForCheckIn(weddingSlug: string, token: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) return null;

  const guest = await prisma.guest.findFirst({
    where: { checkInToken: token, weddingId: wedding.id },
    include: {
      rsvps: { include: { event: true }, orderBy: { event: { startsAt: "asc" } } },
      seat: { include: { table: { include: { seats: { include: { guest: true } } } } } },
    },
  });
  if (!guest) return null;

  const tableMates = guest.seat
    ? guest.seat.table.seats
        .filter((s) => s.guestId !== guest.id)
        .map((s) => `${s.guest.firstName} ${s.guest.lastName}`)
    : [];

  // Scanning a code at the door is the check-in action itself, so this
  // admits the guest for whichever event's door they're at (the one
  // closest to right now) with no extra tap. Showing the code again after
  // that flips into the "already admitted" warning below instead of
  // silently re-toggling, so a screenshotted code can't be reused.
  let primaryEventId: string | null = null;
  let wasAlreadyCheckedIn = false;
  let justCheckedIn = false;

  const eligible = guest.rsvps.filter((r) => r.status !== "DECLINED");
  if (eligible.length > 0) {
    const now = Date.now();
    const primary = eligible.reduce((closest, r) =>
      Math.abs(r.event.startsAt.getTime() - now) <
      Math.abs(closest.event.startsAt.getTime() - now)
        ? r
        : closest
    );
    primaryEventId = primary.eventId;
    wasAlreadyCheckedIn = Boolean(primary.checkedInAt);

    if (!wasAlreadyCheckedIn) {
      await prisma.rSVP.update({
        where: { guestId_eventId: { guestId: guest.id, eventId: primary.eventId } },
        data: { checkedInAt: new Date() },
      });
      justCheckedIn = true;
      // No revalidatePath here: this runs during a page render (not inside
      // a Server Action), where cache revalidation isn't supported. Every
      // page that reads check-in state is already fully dynamic (no static
      // caching), so it picks up this write on its next request regardless.
    }
  }

  return {
    weddingTitle: wedding.title,
    guest: {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      tableName: guest.seat?.table.name ?? null,
      tableMates,
      primaryEventId,
      wasAlreadyCheckedIn,
      justCheckedIn,
      rsvps: guest.rsvps.map((r) => ({
        eventId: r.eventId,
        eventName: r.event.name,
        status: r.status,
        checkedInAt: r.eventId === primaryEventId && justCheckedIn ? new Date() : r.checkedInAt,
        admits: r.status === "DECLINED" ? 0 : r.plusOne ? 2 : 1,
        plusOneName: r.plusOneName,
      })),
    },
  };
}

export async function toggleCheckIn(
  weddingSlug: string,
  guestId: string,
  eventId: string,
  checkedIn: boolean
) {
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Wedding not found.");

  await prisma.rSVP.update({
    where: { guestId_eventId: { guestId, eventId } },
    data: { checkedInAt: checkedIn ? new Date() : null },
  });

  revalidatePath(`/checkin/${weddingSlug}`);
  revalidatePath(`/dashboard/w/${wedding.id}`);
  revalidatePath(`/dashboard/w/${wedding.id}/checkin`);
}

export async function getCheckInStats(weddingId: string) {
  const events = await prisma.event.findMany({
    where: { weddingId },
    orderBy: { startsAt: "asc" },
    include: {
      rsvps: true,
    },
  });

  return events.map((e) => {
    // "Expected" is anyone who hasn't explicitly declined, so guests who
    // never formally RSVP'd (or are checked in as a walk-in) still count.
    const expected = e.rsvps.filter((r) => r.status !== "DECLINED");
    const checkedIn = e.rsvps.filter((r) => r.checkedInAt);
    return {
      id: e.id,
      name: e.name,
      attending: expected.length,
      checkedIn: checkedIn.length,
    };
  });
}
