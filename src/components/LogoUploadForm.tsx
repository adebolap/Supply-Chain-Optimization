"use client";

import { useActionState } from "react";
import { uploadLogo, removeLogo } from "@/lib/actions/branding";
import type { ActionState } from "@/lib/actions/types";

const initialState: ActionState = { error: null };

export default function LogoUploadForm({
  weddingId,
  currentLogoUrl,
}: {
  weddingId: string;
  currentLogoUrl: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    uploadLogo.bind(null, weddingId),
    initialState
  );

  return (
    <div className="flex flex-col gap-3">
      {currentLogoUrl && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentLogoUrl} alt="Wedding logo" className="h-12 w-auto rounded border border-border" />
          <form action={removeLogo.bind(null, weddingId)}>
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:underline"
            >
              Remove
            </button>
          </form>
        </div>
      )}
      {state.error && (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{state.error}</p>
      )}
      <form action={formAction} className="flex items-center gap-3">
        <input
          type="file"
          name="logo"
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
          {isPending ? "Uploading..." : currentLogoUrl ? "Replace logo" : "Upload logo"}
        </button>
      </form>
    </div>
  );
}
