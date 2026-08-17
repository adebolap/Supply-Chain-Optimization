"use client";

import { useActionState } from "react";
import { createWedding } from "@/lib/actions/weddings";
import { initialActionState } from "@/lib/actions/types";

export default function CreateWeddingForm() {
  const [state, formAction, isPending] = useActionState(
    createWedding,
    initialActionState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          {state.error}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="title">
          Wedding title
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="Sam & Jordan's Wedding"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="weddingDate">
          Wedding date
        </label>
        <input
          id="weddingDate"
          name="weddingDate"
          type="date"
          required
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create wedding"}
      </button>
    </form>
  );
}
