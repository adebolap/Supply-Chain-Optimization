"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { RsvpStatus } from "@/generated/prisma/enums";

export async function findGuestsByName(weddingSlug: string, query: string) {
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
  }));
}

/** Resolves a guest's personal RSVP link to their id, for the pre-filled flow. */
export async function getGuestIdFromRsvpToken(weddingSlug: string, token: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) return null;

  const guest = await prisma.guest.findFirst({
    where: { rsvpToken: token, weddingId: wedding.id },
  });
  return guest?.id ?? null;
}

export async function getHouseholdForRsvp(weddingSlug: string, guestId: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) return null;

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, weddingId: wedding.id },
  });
  if (!guest) return null;

  const householdGuests = await prisma.guest.findMany({
    where: guest.household
      ? { weddingId: wedding.id, household: guest.household }
      : { id: guest.id },
    include: {
      rsvps: { include: { event: true } },
    },
    orderBy: { firstName: "asc" },
  });

  const events = await prisma.event.findMany({
    where: { weddingId: wedding.id },
    orderBy: { startsAt: "asc" },
  });

  return {
    weddingTitle: wedding.title,
    events,
    guests: householdGuests.map((g) => ({
      id: g.id,
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email,
      phone: g.phone,
      notes: g.notes,
      dietaryNotes: g.dietaryNotes,
      rsvps: g.rsvps.map((r) => ({
        eventId: r.eventId,
        status: r.status,
        mealChoice: r.mealChoice,
        plusOne: r.plusOne,
        plusOneName: r.plusOneName,
        notes: r.notes,
      })),
    })),
  };
}

export interface GuestContactUpdate {
  guestId: string;
  email?: string;
  phone?: string;
  notes?: string;
  dietaryNotes?: string;
}

/** Lets a guest keep their own contact info current from the RSVP page,
 * scoped to guests in this wedding so a crafted guestId can't touch anyone
 * else's record. */
export async function updateGuestContactInfo(
  weddingSlug: string,
  updates: GuestContactUpdate[]
) {
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Wedding not found.");

  await prisma.$transaction(
    updates.map((u) =>
      prisma.guest.updateMany({
        where: { id: u.guestId, weddingId: wedding.id },
        data: {
          email: u.email?.trim() || null,
          phone: u.phone?.trim() || null,
          notes: u.notes?.trim() || null,
          dietaryNotes: u.dietaryNotes?.trim() || null,
        },
      })
    )
  );

  revalidatePath(`/dashboard/w/${wedding.id}/guests`);
}

export interface RsvpEntry {
  guestId: string;
  eventId: string;
  status: RsvpStatus;
  mealChoice?: string;
  plusOne?: boolean;
  plusOneName?: string;
  notes?: string;
}

export async function submitRsvps(weddingSlug: string, entries: RsvpEntry[]) {
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Wedding not found.");

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.rSVP.update({
        where: { guestId_eventId: { guestId: entry.guestId, eventId: entry.eventId } },
        data: {
          status: entry.status,
          mealChoice: entry.mealChoice || null,
          plusOne: entry.plusOne ?? false,
          plusOneName: entry.plusOneName || null,
          notes: entry.notes || null,
          respondedAt: new Date(),
        },
      })
    )
  );

  revalidatePath(`/rsvp/${weddingSlug}`);
  revalidatePath(`/dashboard/w/${wedding.id}`);
}
