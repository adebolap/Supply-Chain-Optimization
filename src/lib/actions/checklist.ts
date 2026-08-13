"use server";

import { revalidatePath } from "next/cache";
import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import type { ChecklistCategory } from "@/generated/prisma/enums";

export async function addChecklistItem(weddingId: string, formData: FormData) {
  await requireWeddingOwner(weddingId);

  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title is required.");
  const dueDateRaw = String(formData.get("dueDate") || "");

  await prisma.checklistItem.create({
    data: {
      weddingId,
      title,
      category: (String(formData.get("category") || "GENERAL") as ChecklistCategory),
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
    },
  });

  revalidatePath(`/dashboard/w/${weddingId}/checklist`);
}

export async function toggleChecklistItem(weddingId: string, itemId: string, isComplete: boolean) {
  await requireWeddingOwner(weddingId);
  await prisma.checklistItem.update({ where: { id: itemId }, data: { isComplete } });
  revalidatePath(`/dashboard/w/${weddingId}/checklist`);
}

export async function deleteChecklistItem(weddingId: string, itemId: string) {
  await requireWeddingOwner(weddingId);
  await prisma.checklistItem.delete({ where: { id: itemId } });
  revalidatePath(`/dashboard/w/${weddingId}/checklist`);
}
