import { requireWeddingOwner } from "@/lib/actions/weddings";
import { startPremiumCheckout, simulatePremiumUpgrade } from "@/lib/actions/billing";
import { PREMIUM_PRICE_USD } from "@/lib/stripe";
import { FREE_TIER_LIMITS } from "@/lib/limits";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { weddingId } = await params;
  const { wedding } = await requireWeddingOwner(weddingId);
  const { upgraded } = await searchParams;
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex flex-col gap-8">
      {upgraded && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          You&apos;re on Premium — unlimited guests and events are unlocked.
        </p>
      )}

      <div>
        <h2 className="mb-1 text-lg font-semibold">Plan</h2>
        <p className="mb-4 text-sm text-zinc-500">
          {wedding.tier === "PREMIUM"
            ? "You have Premium — thanks for supporting Aisle."
            : `Free plan: up to ${FREE_TIER_LIMITS.maxGuests} guests, ${FREE_TIER_LIMITS.maxEvents} event.`}
        </p>

        {wedding.tier === "FREE" && (
          <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
            <h3 className="mb-1 font-semibold">Upgrade to Premium — ${PREMIUM_PRICE_USD} one-time</h3>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              No subscription. Pay once for this wedding, unlock unlimited
              guests, multi-event support, custom branding, SMS reminders,
              seating chart export, and day-of coordinator mode.
            </p>
            <form action={startPremiumCheckout.bind(null, weddingId)}>
              <button
                type="submit"
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
              >
                Upgrade with Stripe
              </button>
            </form>

            {isDev && (
              <form
                action={simulatePremiumUpgrade.bind(null, weddingId)}
                className="mt-3"
              >
                <button
                  type="submit"
                  className="rounded-lg border border-black/10 px-4 py-2 text-sm dark:border-white/10"
                >
                  Simulate upgrade (dev only)
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold">Wedding link</h2>
        <p className="text-sm text-zinc-500">
          Slug: <code className="font-mono">{wedding.slug}</code>
        </p>
      </div>
    </div>
  );
}
