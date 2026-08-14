"use server";

import { revalidatePath } from "next/cache";
import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import { FREE_TIER_LIMITS } from "@/lib/limits";

export async function createEvent(weddingId: string, formData: FormData) {
  const { wedding } = await requireWeddingOwner(weddingId);

  if (wedding.tier === "FREE") {
    const count = await prisma.event.count({ where: { weddingId } });
    if (count >= FREE_TIER_LIMITS.maxEvents) {
      throw new Error(
        `Free plan supports ${FREE_TIER_LIMITS.maxEvents} event. Upgrade to add more.`
      );
    }
  }

  const name = String(formData.get("name") || "").trim();
  const startsAtRaw = String(formData.get("startsAt") || "");
  if (!name || !startsAtRaw) throw new Error("Name and date/time are required.");

  const event = await prisma.event.create({
    data: {
      weddingId,
      name,
      startsAt: new Date(startsAtRaw),
      location: String(formData.get("location") || "").trim() || null,
    },
  });

  const guests = await prisma.guest.findMany({ where: { weddingId } });
  await prisma.rSVP.createMany({
    data: guests.map((g) => ({ guestId: g.id, eventId: event.id })),
  });

  revalidatePath(`/dashboard/w/${weddingId}/events`);
}

export async function deleteEvent(weddingId: string, eventId: string) {
  await requireWeddingOwner(weddingId);
  const remaining = await prisma.event.count({ where: { weddingId } });
  if (remaining <= 1) {
    throw new Error("A wedding must have at least one event.");
  }
  await prisma.event.delete({ where: { id: eventId } });
  revalidatePath(`/dashboard/w/${weddingId}/events`);
}
