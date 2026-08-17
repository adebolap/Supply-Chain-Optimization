"use client";

import { useActionState } from "react";
import { updatePartnerEmail } from "@/lib/actions/weddings";
import { initialActionState } from "@/lib/actions/types";

export default function PartnerEmailForm({
  weddingId,
  currentEmail,
}: {
  weddingId: string;
  currentEmail: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    updatePartnerEmail.bind(null, weddingId),
    initialActionState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          {state.error}
        </p>
      )}
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="partnerEmail">
            Spouse&apos;s email
          </label>
          <input
            id="partnerEmail"
            name="partnerEmail"
            type="email"
            placeholder="partner@example.com"
            defaultValue={currentEmail || ""}
            className="w-64 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
