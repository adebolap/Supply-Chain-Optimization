"use client";

import { useActionState } from "react";
import { addGuest } from "@/lib/actions/guests";
import type { ActionState } from "@/lib/actions/types";

const initialState: ActionState = { error: null };

export default function AddGuestForm({ weddingId }: { weddingId: string }) {
  const [state, formAction, isPending] = useActionState(
    addGuest.bind(null, weddingId),
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input
          name="firstName"
          required
          placeholder="First name"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
        />
        <input
          name="lastName"
          placeholder="Last name"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
        />
        <input
          name="household"
          placeholder="Household (optional)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
        />
        <select
          name="side"
          defaultValue="SHARED"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
        >
          <option value="SHARED">Shared</option>
          <option value="PARTNER_ONE">Partner 1</option>
          <option value="PARTNER_TWO">Partner 2</option>
        </select>
        <input
          name="email"
          type="email"
          placeholder="Email (optional)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
        />
        <input
          name="phone"
          placeholder="Phone (optional)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
        />
        <input
          name="tags"
          placeholder="Tags, comma separated"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
        />
        <input
          name="dietaryNotes"
          placeholder="Dietary notes"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          disabled={isPending}
          className="col-span-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50 sm:col-span-4"
        >
          {isPending ? "Adding..." : "Add guest"}
        </button>
      </div>
    </form>
  );
}
