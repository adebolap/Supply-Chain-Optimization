import {
  requireWeddingOwner,
  updateRsvpDeadline,
  updateCheckInOpensAt,
  ensureCheckInPin,
  regenerateCheckInPin,
} from "@/lib/actions/weddings";
import { simulatePremiumUpgrade } from "@/lib/actions/billing";
import { blobConfigured } from "@/lib/blob";
import { PREMIUM_PRICE_USD } from "@/lib/stripe";
import { FREE_TIER_LIMITS } from "@/lib/limits";
import UpgradeButton from "@/components/UpgradeButton";
import PartnerEmailForm from "@/components/PartnerEmailForm";
import LogoUploadForm from "@/components/LogoUploadForm";
import PhotoGalleryUpload from "@/components/PhotoGalleryUpload";

function toLocalDateTimeInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

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
  const checkInPin = await ensureCheckInPin(weddingId, wedding.checkInPin);

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
              guests, multi-event support, custom branding, seating chart
              export, and day-of coordinator mode.
            </p>
            <UpgradeButton weddingId={weddingId} />

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

      <div>
        <h2 className="mb-1 text-lg font-semibold">Branding</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Your logo and photos appear as a subtle accent on the pages
          guests see (RSVP and check-in), not on your own dashboard.
          Images are automatically resized and compressed on upload.
        </p>
        {!blobConfigured ? (
          <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
            Image uploads aren&apos;t configured yet. Set BLOB_READ_WRITE_TOKEN
            to enable them.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="mb-2 text-sm font-medium">Logo</h3>
              <LogoUploadForm weddingId={weddingId} currentLogoUrl={wedding.logoUrl} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">Photos (up to 4)</h3>
              <PhotoGalleryUpload weddingId={weddingId} photoUrls={wedding.photoUrls} />
            </div>
          </div>
        )}
      </div>

      {isOwner && (
        <div>
          <h2 className="mb-1 text-lg font-semibold">Share with your spouse</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Add their email and they&apos;ll get full access to this wedding
            the moment they sign in with it, no separate invite link to
            manage.
          </p>
          <PartnerEmailForm weddingId={weddingId} currentEmail={wedding.partnerEmail} />
        </div>
      )}

      <div>
        <h2 className="mb-1 text-lg font-semibold">Check-in opens at</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Scanning or admin check-in won&apos;t admit anyone before this
          time, even with a valid code. Leave blank for no restriction.
        </p>
        <form
          action={updateCheckInOpensAt.bind(null, weddingId)}
          className="flex items-end gap-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="checkInOpensAt">
              Date and time
            </label>
            <input
              id="checkInOpensAt"
              name="checkInOpensAt"
              type="datetime-local"
              defaultValue={
                wedding.checkInOpensAt
                  ? toLocalDateTimeInputValue(new Date(wedding.checkInOpensAt))
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

      <div>
        <h2 className="mb-1 text-lg font-semibold">Admin check-in code</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Share this with trusted door staff only. It unlocks a manual
          check-in screen for guests who forgot their phone or printed
          code: search their name, confirm who they are, and check them
          in by hand.
        </p>
        <div className="flex items-center gap-3">
          <code className="rounded-lg border border-border bg-muted px-3 py-2 text-lg font-mono tracking-widest">
            {checkInPin}
          </code>
          <form action={regenerateCheckInPin.bind(null, weddingId)}>
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Regenerate
            </button>
          </form>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Admin page: <code className="font-mono">/checkin/{wedding.slug}/admin</code>
        </p>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold">Wedding link</h2>
        <p className="text-sm text-muted-foreground">
          Slug: <code className="font-mono">{wedding.slug}</code>
        </p>
      </div>
    </div>
  );
}
