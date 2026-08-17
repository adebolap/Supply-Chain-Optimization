import {
  requireWeddingOwner,
  updateRsvpDeadline,
  updatePartnerEmail,
} from "@/lib/actions/weddings";
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
  const { wedding, isOwner } = await requireWeddingOwner(weddingId);
  const { upgraded } = await searchParams;
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex flex-col gap-8">
      {upgraded && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          You&apos;re on Premium. Unlimited guests and events are unlocked.
        </p>
      )}

      <div>
        <h2 className="mb-1 text-lg font-semibold">Plan</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {wedding.tier === "PREMIUM"
            ? "You have Premium. Thanks for supporting Aisle."
            : `Free plan: up to ${FREE_TIER_LIMITS.maxGuests} guests, ${FREE_TIER_LIMITS.maxEvents} event.`}
        </p>

        {wedding.tier === "FREE" && (
          <div className="rounded-2xl border border-border p-6 ">
            <h3 className="mb-1 font-semibold">
              Upgrade to Premium: ${PREMIUM_PRICE_USD} one-time
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              No subscription. Pay once for this wedding, unlock unlimited
              guests, multi-event support, custom branding, SMS reminders,
              seating chart export, and day-of coordinator mode.
            </p>
            <form action={startPremiumCheckout.bind(null, weddingId)}>
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
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
                  className="rounded-lg border border-border px-4 py-2 text-sm "
                >
                  Simulate upgrade (dev only)
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold">RSVP deadline</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Guests see this on their invite, and it powers reminder
          announcements to anyone who hasn&apos;t responded yet.
        </p>
        <form
          action={updateRsvpDeadline.bind(null, weddingId)}
          className="flex items-end gap-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="rsvpDeadline">
              Deadline date
            </label>
            <input
              id="rsvpDeadline"
              name="rsvpDeadline"
              type="date"
              defaultValue={
                wedding.rsvpDeadline
                  ? new Date(wedding.rsvpDeadline).toISOString().slice(0, 10)
                  : ""
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Save
          </button>
        </form>
      </div>

      {isOwner && (
        <div>
          <h2 className="mb-1 text-lg font-semibold">Share with your spouse</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Add their email and they&apos;ll get full access to this wedding
            the moment they sign in with it, no separate invite link to
            manage.
          </p>
          <form
            action={updatePartnerEmail.bind(null, weddingId)}
            className="flex items-end gap-3"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="partnerEmail">
                Spouse&apos;s email
              </label>
              <input
                id="partnerEmail"
                name="partnerEmail"
                type="email"
                placeholder="partner@example.com"
                defaultValue={wedding.partnerEmail || ""}
                className="w-64 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Save
            </button>
          </form>
        </div>
      )}

      <div>
        <h2 className="mb-1 text-lg font-semibold">Wedding link</h2>
        <p className="text-sm text-muted-foreground">
          Slug: <code className="font-mono">{wedding.slug}</code>
        </p>
      </div>
    </div>
  );
}
