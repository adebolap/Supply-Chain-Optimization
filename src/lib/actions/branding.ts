"use server";

import { revalidatePath } from "next/cache";
import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import { uploadWeddingImage, deleteWeddingImage } from "@/lib/blob";
import type { ActionState } from "@/lib/actions/types";

const MAX_PHOTOS = 4;

export async function uploadLogo(
  weddingId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { wedding } = await requireWeddingOwner(weddingId);

  const file = formData.get("logo");
  if (!(file instanceof File)) return { error: "Choose an image to upload." };

  let url: string;
  try {
    url = await uploadWeddingImage(file, weddingId, "logo");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't upload that logo." };
  }

  if (wedding.logoUrl) await deleteWeddingImage(wedding.logoUrl);
  await prisma.wedding.update({ where: { id: weddingId }, data: { logoUrl: url } });

  revalidatePath(`/dashboard/w/${weddingId}/settings`);
  return { error: null };
}

export async function removeLogo(weddingId: string) {
  const { wedding } = await requireWeddingOwner(weddingId);
  if (wedding.logoUrl) await deleteWeddingImage(wedding.logoUrl);
  await prisma.wedding.update({ where: { id: weddingId }, data: { logoUrl: null } });
  revalidatePath(`/dashboard/w/${weddingId}/settings`);
}

export async function uploadPhoto(
  weddingId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { wedding } = await requireWeddingOwner(weddingId);

  if (wedding.photoUrls.length >= MAX_PHOTOS) {
    return { error: `You can only have ${MAX_PHOTOS} photos. Remove one first.` };
  }

  const file = formData.get("photo");
  if (!(file instanceof File)) return { error: "Choose an image to upload." };

  let url: string;
  try {
    url = await uploadWeddingImage(file, weddingId, "photo");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't upload that photo." };
  }

  await prisma.wedding.update({
    where: { id: weddingId },
    data: { photoUrls: { push: url } },
  });

  revalidatePath(`/dashboard/w/${weddingId}/settings`);
  return { error: null };
}

export async function removePhoto(weddingId: string, url: string) {
  const { wedding } = await requireWeddingOwner(weddingId);
  await deleteWeddingImage(url);
  await prisma.wedding.update({
    where: { id: weddingId },
    data: { photoUrls: wedding.photoUrls.filter((u) => u !== url) },
  });
  revalidatePath(`/dashboard/w/${weddingId}/settings`);
}
