"use server";

import { revalidatePath } from "next/cache";
import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import { FREE_TIER_LIMITS } from "@/lib/limits";
import type { GuestSide } from "@/generated/prisma/enums";

async function assertGuestCapacity(weddingId: string, tier: string, adding: number) {
  if (tier === "PREMIUM") return;
  const count = await prisma.guest.count({ where: { weddingId } });
  if (count + adding > FREE_TIER_LIMITS.maxGuests) {
    throw new Error(
      `Free plan is limited to ${FREE_TIER_LIMITS.maxGuests} guests. Upgrade to add more.`
    );
  }
}

export async function addGuest(weddingId: string, formData: FormData) {
  const { wedding } = await requireWeddingOwner(weddingId);
  await assertGuestCapacity(weddingId, wedding.tier, 1);

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  if (!firstName) throw new Error("First name is required.");

  const guest = await prisma.guest.create({
    data: {
      weddingId,
      firstName,
      lastName,
      email: String(formData.get("email") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      household: String(formData.get("household") || "").trim() || null,
      side: (String(formData.get("side") || "SHARED") as GuestSide),
      dietaryNotes: String(formData.get("dietaryNotes") || "").trim() || null,
      tags: String(formData.get("tags") || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    },
  });

  const events = await prisma.event.findMany({ where: { weddingId } });
  await prisma.rSVP.createMany({
    data: events.map((e) => ({ guestId: guest.id, eventId: e.id })),
  });

  revalidatePath(`/dashboard/w/${weddingId}/guests`);
}

export async function updateGuest(weddingId: string, guestId: string, formData: FormData) {
  await requireWeddingOwner(weddingId);

  await prisma.guest.update({
    where: { id: guestId },
    data: {
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      email: String(formData.get("email") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      household: String(formData.get("household") || "").trim() || null,
      side: (String(formData.get("side") || "SHARED") as GuestSide),
      dietaryNotes: String(formData.get("dietaryNotes") || "").trim() || null,
      tags: String(formData.get("tags") || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    },
  });

  revalidatePath(`/dashboard/w/${weddingId}/guests`);
}

export async function deleteGuest(weddingId: string, guestId: string) {
  await requireWeddingOwner(weddingId);
  await prisma.guest.delete({ where: { id: guestId } });
  revalidatePath(`/dashboard/w/${weddingId}/guests`);
}

interface CsvGuestRow {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  household?: string;
  dietaryNotes?: string;
}

export async function importGuestsCsv(weddingId: string, rows: CsvGuestRow[]) {
  const { wedding } = await requireWeddingOwner(weddingId);
  const valid = rows.filter((r) => r.firstName?.trim());
  await assertGuestCapacity(weddingId, wedding.tier, valid.length);

  const events = await prisma.event.findMany({ where: { weddingId } });

  await prisma.$transaction(async (tx) => {
    for (const row of valid) {
      const guest = await tx.guest.create({
        data: {
          weddingId,
          firstName: row.firstName.trim(),
          lastName: (row.lastName || "").trim(),
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          household: row.household?.trim() || null,
          dietaryNotes: row.dietaryNotes?.trim() || null,
        },
      });
      await tx.rSVP.createMany({
        data: events.map((e) => ({ guestId: guest.id, eventId: e.id })),
      });
    }
  });

  revalidatePath(`/dashboard/w/${weddingId}/guests`);
  return { imported: valid.length };
}
