"use client";

import { useActionState } from "react";
import { uploadPhoto, removePhoto } from "@/lib/actions/branding";
import type { ActionState } from "@/lib/actions/types";

const initialState: ActionState = { error: null };
const MAX_PHOTOS = 4;

export default function PhotoGalleryUpload({
  weddingId,
  photoUrls,
}: {
  weddingId: string;
  photoUrls: string[];
}) {
  const [state, formAction, isPending] = useActionState(
    uploadPhoto.bind(null, weddingId),
    initialState
  );

  return (
    <div className="flex flex-col gap-3">
      {photoUrls.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photoUrls.map((url) => (
            <div key={url} className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Wedding photo"
                className="h-20 w-20 rounded-lg border border-border object-cover"
              />
              <form action={removePhoto.bind(null, weddingId, url)}>
                <button
                  type="submit"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Remove
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
      {state.error && (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{state.error}</p>
      )}
      {photoUrls.length < MAX_PHOTOS ? (
        <form action={formAction} className="flex items-center gap-3">
          <input
            type="file"
            name="photo"
            accept="image/*"
            required
            disabled={isPending}
            className="text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {isPending ? "Uploading..." : "Add photo"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">
          You&apos;ve reached the {MAX_PHOTOS}-photo limit. Remove one to add another.
        </p>
      )}
    </div>
  );
}
