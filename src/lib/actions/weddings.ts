"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, randomSuffix } from "@/lib/slug";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

/** Loads a wedding and verifies the current user owns it, or redirects. */
export async function requireWeddingOwner(weddingId: string) {
  const session = await requireSession();
  const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
  if (!wedding || wedding.ownerId !== session.user!.id) {
    redirect("/dashboard");
  }
  return { session, wedding };
}

export async function createWedding(formData: FormData) {
  const session = await requireSession();

  const title = String(formData.get("title") || "").trim();
  const weddingDateRaw = String(formData.get("weddingDate") || "");
  if (!title || !weddingDateRaw) {
    throw new Error("Title and wedding date are required.");
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

export async function getMyWeddings() {
  const session = await requireSession();
  return prisma.wedding.findMany({
    where: { ownerId: session.user!.id! },
    orderBy: { weddingDate: "asc" },
  });
}
