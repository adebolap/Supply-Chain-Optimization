import { put, del } from "@vercel/blob";
import sharp from "sharp";

export const blobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const MAX_RAW_BYTES = 8 * 1024 * 1024; // 8MB raw upload cap, before compression
const MAX_WIDTH = 1600;

export async function uploadWeddingImage(
  file: File,
  weddingId: string,
  kind: "logo" | "photo"
): Promise<string> {
  if (!blobConfigured) {
    throw new Error(
      "Image uploads aren't configured yet. Set BLOB_READ_WRITE_TOKEN to enable them."
    );
  }
  if (file.size === 0) {
    throw new Error("Choose an image to upload.");
  }
  if (file.size > MAX_RAW_BYTES) {
    throw new Error("That image is too large. Please upload something under 8MB.");
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const outputBuffer = await sharp(inputBuffer)
    .rotate() // respect EXIF orientation before stripping metadata
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const blob = await put(`weddings/${weddingId}/${kind}-${Date.now()}.webp`, outputBuffer, {
    access: "public",
    contentType: "image/webp",
  });

  return blob.url;
}

export async function deleteWeddingImage(url: string): Promise<void> {
  if (!blobConfigured) return;
  await del(url);
}
