"use server";

import { revalidatePath } from "next/cache";
import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";

export async function createTable(weddingId: string, eventId: string, formData: FormData) {
  await requireWeddingOwner(weddingId);

  const name = String(formData.get("name") || "").trim();
  const capacity = Number(formData.get("capacity") || 8);
  if (!name) throw new Error("Table name is required.");

  await prisma.table.create({
    data: { weddingId, eventId, name, capacity: Number.isFinite(capacity) ? capacity : 8 },
  });

  revalidatePath(`/dashboard/w/${weddingId}/seating`);
}

export async function deleteTable(weddingId: string, tableId: string) {
  await requireWeddingOwner(weddingId);
  await prisma.table.delete({ where: { id: tableId } });
  revalidatePath(`/dashboard/w/${weddingId}/seating`);
}

export async function assignSeat(weddingId: string, guestId: string, tableId: string | null) {
  await requireWeddingOwner(weddingId);

  if (tableId === null) {
    await prisma.seat.deleteMany({ where: { guestId } });
    revalidatePath(`/dashboard/w/${weddingId}/seating`);
    return;
  }

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: { seats: true },
  });
  if (!table) throw new Error("Table not found.");
  if (table.seats.length >= table.capacity) {
    throw new Error(`${table.name} is at capacity.`);
  }

  await prisma.seat.upsert({
    where: { guestId },
    update: { tableId, position: table.seats.length },
    create: { guestId, tableId, position: table.seats.length },
  });

  revalidatePath(`/dashboard/w/${weddingId}/seating`);
}
