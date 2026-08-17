"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, randomSuffix } from "@/lib/slug";
import type { ActionState } from "@/lib/actions/types";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

/** Loads a wedding and verifies the current user owns it or is the invited
 * partner, or redirects. */
export async function requireWeddingOwner(weddingId: string) {
  const session = await requireSession();
  const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
  const isOwner = wedding?.ownerId === session.user!.id;
  const isPartner =
    !!wedding?.partnerEmail &&
    wedding.partnerEmail.toLowerCase() === session.user!.email?.toLowerCase();
  if (!wedding || (!isOwner && !isPartner)) {
    redirect("/dashboard");
  }
  return { session, wedding, isOwner };
}

function generateCheckInPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createWedding(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();

  const title = String(formData.get("title") || "").trim();
  const weddingDateRaw = String(formData.get("weddingDate") || "");
  if (!title || !weddingDateRaw) {
    return { error: "Title and wedding date are required." };
  }

  const base = slugify(title) || "wedding";
  let slug = base;
  while (await prisma.wedding.findUnique({ where: { slug } })) {
    slug = `${base}-${randomSuffix()}`;
  }

  const wedding = await prisma.wedding.create({
    data: {
      title,
      slug,
      weddingDate: new Date(weddingDateRaw),
      checkInPin: generateCheckInPin(),
      ownerId: session.user!.id!,
      events: {
        create: [{ name: "Reception", startsAt: new Date(weddingDateRaw) }],
      },
      checklistItems: {
        create: [
          { title: "Finalize guest list", category: "GUEST_LIST" },
          { title: "Send save-the-dates", category: "GUEST_LIST" },
          { title: "Set RSVP deadline", category: "RSVP" },
          { title: "Confirm final headcount with caterer", category: "RSVP" },
          { title: "Assign seating chart", category: "SEATING" },
        ],
      },
    },
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/w/${wedding.id}`);
}

export async function updateRsvpDeadline(weddingId: string, formData: FormData) {
  await requireWeddingOwner(weddingId);

  const raw = String(formData.get("rsvpDeadline") || "").trim();
  await prisma.wedding.update({
    where: { id: weddingId },
    data: { rsvpDeadline: raw ? new Date(raw) : null },
  });

  revalidatePath(`/dashboard/w/${weddingId}/settings`);
  revalidatePath(`/dashboard/w/${weddingId}`);
}

export async function updatePartnerEmail(
  weddingId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { session, wedding } = await requireWeddingOwner(weddingId);
  if (wedding.ownerId !== session.user!.id) {
    return { error: "Only the wedding owner can change who it's shared with." };
  }

  const raw = String(formData.get("partnerEmail") || "").trim();
  await prisma.wedding.update({
    where: { id: weddingId },
    data: { partnerEmail: raw || null },
  });

  revalidatePath(`/dashboard/w/${weddingId}/settings`);
  return { error: null };
}

/** Backfills a check-in PIN for weddings created before this feature existed. */
export async function ensureCheckInPin(weddingId: string, currentPin: string | null) {
  if (currentPin) return currentPin;
  const pin = generateCheckInPin();
  await prisma.wedding.update({ where: { id: weddingId }, data: { checkInPin: pin } });
  return pin;
}

export async function regenerateCheckInPin(weddingId: string) {
  await requireWeddingOwner(weddingId);
  await prisma.wedding.update({
    where: { id: weddingId },
    data: { checkInPin: generateCheckInPin() },
  });
  revalidatePath(`/dashboard/w/${weddingId}/settings`);
}

export async function getMyWeddings() {
  const session = await requireSession();
  return prisma.wedding.findMany({
    where: {
      OR: [
        { ownerId: session.user!.id! },
        ...(session.user!.email
          ? [{ partnerEmail: { equals: session.user!.email, mode: "insensitive" as const } }]
          : []),
      ],
    },
    orderBy: { weddingDate: "asc" },
  });
}
