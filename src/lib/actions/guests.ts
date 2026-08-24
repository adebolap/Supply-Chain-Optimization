"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import { FREE_TIER_LIMITS } from "@/lib/limits";
import { mapGuestRow, type RawGuestRow } from "@/lib/guestImport";
import type { GuestSide, RsvpStatus } from "@/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

async function assertGuestCapacity(
  weddingId: string,
  tier: string,
  adding: number
): Promise<string | null> {
  if (tier === "PREMIUM") return null;
  const count = await prisma.guest.count({ where: { weddingId } });
  if (count + adding > FREE_TIER_LIMITS.maxGuests) {
    return `Free plan is limited to ${FREE_TIER_LIMITS.maxGuests} guests. Upgrade to add more.`;
  }
  return null;
}

export async function addGuest(
  weddingId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { wedding } = await requireWeddingOwner(weddingId);
  const capacityError = await assertGuestCapacity(weddingId, wedding.tier, 1);
  if (capacityError) return { error: capacityError };

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  if (!firstName) return { error: "First name is required." };

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
      notes: String(formData.get("notes") || "").trim() || null,
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
  revalidatePath(`/dashboard/w/${weddingId}`);
  return { error: null };
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
      notes: String(formData.get("notes") || "").trim() || null,
      tags: String(formData.get("tags") || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    },
  });

  revalidatePath(`/dashboard/w/${weddingId}/guests`);
}

/** Lets the couple record a guest's RSVP themselves, e.g. after a phone call
 * or in-person answer, without the guest ever visiting the RSVP page. */
export async function setGuestRsvpStatus(
  weddingId: string,
  guestId: string,
  eventId: string,
  status: RsvpStatus
) {
  await requireWeddingOwner(weddingId);
  await prisma.rSVP.update({
    where: { guestId_eventId: { guestId, eventId } },
    data: { status, respondedAt: new Date() },
  });
  revalidatePath(`/dashboard/w/${weddingId}/guests`);
  revalidatePath(`/dashboard/w/${weddingId}`);
}

export async function deleteGuest(weddingId: string, guestId: string) {
  await requireWeddingOwner(weddingId);
  await prisma.guest.delete({ where: { id: guestId } });
  revalidatePath(`/dashboard/w/${weddingId}/guests`);
  revalidatePath(`/dashboard/w/${weddingId}`);
}

export async function bulkSetSide(weddingId: string, guestIds: string[], side: GuestSide) {
  await requireWeddingOwner(weddingId);
  await prisma.guest.updateMany({
    where: { id: { in: guestIds }, weddingId },
    data: { side },
  });
  revalidatePath(`/dashboard/w/${weddingId}/guests`);
}

export async function bulkAddTag(weddingId: string, guestIds: string[], tag: string) {
  await requireWeddingOwner(weddingId);
  const cleanTag = tag.trim();
  if (!cleanTag) return;

  const guests = await prisma.guest.findMany({
    where: { id: { in: guestIds }, weddingId },
  });
  await prisma.$transaction(
    guests
      .filter((g) => !g.tags.includes(cleanTag))
      .map((g) =>
        prisma.guest.update({
          where: { id: g.id },
          data: { tags: [...g.tags, cleanTag] },
        })
      )
  );
  revalidatePath(`/dashboard/w/${weddingId}/guests`);
}

export async function bulkDeleteGuests(weddingId: string, guestIds: string[]) {
  await requireWeddingOwner(weddingId);
  await prisma.guest.deleteMany({ where: { id: { in: guestIds }, weddingId } });
  revalidatePath(`/dashboard/w/${weddingId}/guests`);
  revalidatePath(`/dashboard/w/${weddingId}`);
}

interface ImportResult {
  error: string | null;
  imported?: number;
  updated?: number;
}

function normalizeNameKey(firstName: string, lastName: string): string {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;
}

async function createGuestsFromRows(
  weddingId: string,
  tier: string,
  rawRows: RawGuestRow[]
): Promise<ImportResult> {
  const mapped = rawRows.map(mapGuestRow);
  const valid = mapped.filter((r) => r.firstName);

  // Re-importing an updated sheet shouldn't create duplicates: a row whose
  // name matches an existing guest updates that guest instead (only the
  // columns present in the row, so a sparse re-upload never blanks out
  // fields it didn't include).
  const existingGuests = await prisma.guest.findMany({ where: { weddingId } });
  const existingByName = new Map(
    existingGuests.map((g) => [normalizeNameKey(g.firstName, g.lastName), g])
  );

  const toCreate = valid.filter(
    (r) => !existingByName.has(normalizeNameKey(r.firstName, r.lastName))
  );
  const toUpdate = valid.filter((r) =>
    existingByName.has(normalizeNameKey(r.firstName, r.lastName))
  );

  const capacityError = await assertGuestCapacity(weddingId, tier, toCreate.length);
  if (capacityError) return { error: capacityError };

  const events = await prisma.event.findMany({ where: { weddingId } });

  await prisma.$transaction(async (tx) => {
    for (const row of toCreate) {
      const guest = await tx.guest.create({
        data: {
          weddingId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email || null,
          phone: row.phone || null,
          household: row.household || null,
          dietaryNotes: row.dietaryNotes || null,
          notes: row.notes || null,
        },
      });
      await tx.rSVP.createMany({
        data: events.map((e) => ({
          guestId: guest.id,
          eventId: e.id,
          status: row.rsvpStatus || "PENDING",
        })),
      });
    }

    for (const row of toUpdate) {
      const existing = existingByName.get(normalizeNameKey(row.firstName, row.lastName))!;
      const updateData: Record<string, string> = {};
      if (row.email) updateData.email = row.email;
      if (row.phone) updateData.phone = row.phone;
      if (row.household) updateData.household = row.household;
      if (row.dietaryNotes) updateData.dietaryNotes = row.dietaryNotes;
      if (row.notes) updateData.notes = row.notes;
      if (Object.keys(updateData).length > 0) {
        await tx.guest.update({ where: { id: existing.id }, data: updateData });
      }
      if (row.rsvpStatus) {
        await tx.rSVP.updateMany({
          where: { guestId: existing.id },
          data: { status: row.rsvpStatus, respondedAt: new Date() },
        });
      }
    }
  });

  revalidatePath(`/dashboard/w/${weddingId}/guests`);
  revalidatePath(`/dashboard/w/${weddingId}`);
  return { error: null, imported: toCreate.length, updated: toUpdate.length };
}

export async function importGuestsCsv(
  weddingId: string,
  rows: RawGuestRow[]
): Promise<ImportResult> {
  try {
    const { wedding } = await requireWeddingOwner(weddingId);
    return await createGuestsFromRows(weddingId, wedding.tier, rows);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Import failed." };
  }
}

function parseGoogleSheetUrl(url: string): { id: string; gid: string } | null {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  return { id: idMatch[1], gid: gidMatch ? gidMatch[1] : "0" };
}

export async function importGuestsFromSheet(
  weddingId: string,
  sheetUrl: string
): Promise<ImportResult> {
  try {
    const { wedding } = await requireWeddingOwner(weddingId);

    const parsed = parseGoogleSheetUrl(sheetUrl.trim());
    if (!parsed) {
      return { error: "That doesn't look like a Google Sheets link." };
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${parsed.id}/export?format=csv&gid=${parsed.gid}`;
    const res = await fetch(csvUrl);
    const csvText = await res.text();

    if (!res.ok || csvText.trim().startsWith("<")) {
      return {
        error:
          'Couldn\'t read that sheet. Make sure it\'s shared as "Anyone with the link can view."',
      };
    }

    const { data } = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    return await createGuestsFromRows(weddingId, wedding.tier, data);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Couldn't import from that sheet.",
    };
  }
}
