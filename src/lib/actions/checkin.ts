"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function findGuestsForCheckIn(weddingSlug: string, query: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding || query.trim().length < 2) return [];

  const terms = query.trim().split(/\s+/);

  const guests = await prisma.guest.findMany({
    where: {
      weddingId: wedding.id,
      OR: terms.flatMap((term) => [
        { firstName: { contains: term, mode: "insensitive" as const } },
        { lastName: { contains: term, mode: "insensitive" as const } },
      ]),
    },
    take: 10,
  });

  return guests.map((g) => ({
    id: g.id,
    firstName: g.firstName,
    lastName: g.lastName,
    household: g.household,
    checkInToken: g.checkInToken,
  }));
}

export async function getGuestForCheckIn(weddingSlug: string, token: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) return null;

  const guest = await prisma.guest.findFirst({
    where: { checkInToken: token, weddingId: wedding.id },
    include: {
      rsvps: { include: { event: true }, orderBy: { event: { startsAt: "asc" } } },
    },
  });
  if (!guest) return null;

  return {
    weddingTitle: wedding.title,
    guest: {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      rsvps: guest.rsvps.map((r) => ({
        eventId: r.eventId,
        eventName: r.event.name,
        status: r.status,
        checkedInAt: r.checkedInAt,
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
