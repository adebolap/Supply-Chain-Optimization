"use client";

import { useActionState } from "react";
import { startPremiumCheckout } from "@/lib/actions/billing";
import { initialActionState } from "@/lib/actions/types";

export default function UpgradeButton({ weddingId }: { weddingId: string }) {
  const [state, formAction, isPending] = useActionState(
    startPremiumCheckout.bind(null, weddingId),
    initialActionState
  );

  return (
    <form action={formAction}>
      {state.error && (
        <p className="mb-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending ? "Starting checkout..." : "Upgrade with Stripe"}
      </button>
    </form>
  );
}
