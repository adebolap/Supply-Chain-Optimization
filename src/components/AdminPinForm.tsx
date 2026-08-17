"use client";

import { useActionState } from "react";
import { verifyCheckInPin } from "@/lib/actions/checkin";
import type { ActionState } from "@/lib/actions/types";

const initialState: ActionState = { error: null };

export default function AdminPinForm({ weddingSlug }: { weddingSlug: string }) {
  const [state, formAction, isPending] = useActionState(
    verifyCheckInPin.bind(null, weddingSlug),
    initialState
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6"
    >
      <label className="text-sm font-medium" htmlFor="pin">
        Enter the admin check-in code
      </label>
      <p className="text-xs text-muted-foreground">
        Ask the couple for this code. It&apos;s different from a guest&apos;s
        QR code.
      </p>
      {state.error && (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          {state.error}
        </p>
      )}
      <input
        id="pin"
        name="pin"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        required
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending ? "Checking..." : "Continue"}
      </button>
    </form>
  );
}
