import Link from "next/link";
import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import { getAudienceCounts } from "@/lib/actions/broadcast";
import { getCheckInStats } from "@/lib/actions/checkin";
import { FREE_TIER_LIMITS } from "@/lib/limits";
import ProgressRing from "@/components/ProgressRing";
import CelebrationTrigger from "@/components/CelebrationTrigger";

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function WeddingOverviewPage({
  params,
}: {
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  const { wedding } = await requireWeddingOwner(weddingId);

  const [audience, checklistItems, checkInStats] = await Promise.all([
    getAudienceCounts(weddingId),
    prisma.checklistItem.findMany({ where: { weddingId } }),
    getCheckInStats(weddingId),
  ]);

  const responded = audience.ATTENDING + audience.DECLINED;
  const rsvpPercent = audience.ALL === 0 ? 0 : Math.round((responded / audience.ALL) * 100);

  const checklistDone = checklistItems.filter((i) => i.isComplete).length;
  const checklistPercent =
    checklistItems.length === 0
      ? 0
      : Math.round((checklistDone / checklistItems.length) * 100);

  const daysToWedding = Math.max(0, daysUntil(new Date(wedding.weddingDate)));
  const daysToDeadline = wedding.rsvpDeadline
    ? daysUntil(new Date(wedding.rsvpDeadline))
    : null;

  const totalCheckedIn = checkInStats.reduce((sum, e) => sum + e.checkedIn, 0);
  const showCheckIn = totalCheckedIn > 0 || daysToWedding <= 3;

  return (
    <div className="flex flex-col gap-10">
      <CelebrationTrigger
        milestoneKey={`${weddingId}:rsvp-complete`}
        active={audience.ALL > 0 && rsvpPercent === 100}
      />
      <CelebrationTrigger
        milestoneKey={`${weddingId}:checklist-complete`}
        active={checklistItems.length > 0 && checklistPercent === 100}
      />

      <div className="flex flex-wrap items-center gap-10 rounded-2xl border border-border bg-surface p-8">
        <ProgressRing
          percent={rsvpPercent}
          value={`${rsvpPercent}%`}
          label={`${responded} / ${audience.ALL} responded`}
        />
        <ProgressRing
          percent={checklistPercent}
          value={`${checklistPercent}%`}
          label={`${checklistDone} / ${checklistItems.length} tasks done`}
        />
        <div className="flex flex-1 flex-col gap-1 text-sm">
          <div className="font-display text-2xl font-semibold text-accent">
            {daysToWedding} day{daysToWedding === 1 ? "" : "s"} to go
          </div>
          {daysToDeadline !== null && (
            <div className="text-muted-foreground">
              {daysToDeadline > 0
                ? `RSVP deadline in ${daysToDeadline} day${daysToDeadline === 1 ? "" : "s"}`
                : "RSVP deadline has passed"}
            </div>
          )}
          <div className="text-muted-foreground">
            {audience.ALL}
            {wedding.tier === "FREE" ? ` / ${FREE_TIER_LIMITS.maxGuests}` : ""} guests
            {" · "}
            {wedding.tier === "PREMIUM" ? "Premium" : "Free plan"}
          </div>
        </div>
      </div>

      {showCheckIn && (
        <div className="rounded-2xl border border-border p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Day-of check-in</h2>
            <Link
              href={`/dashboard/w/${weddingId}/checkin`}
              className="text-xs text-muted-foreground hover:underline"
            >
              Open check-in
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {checkInStats.map((s) => (
              <div key={s.id} className="text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span>{s.name}</span>
                  <span className="text-muted-foreground">
                    {s.checkedIn} / {s.attending}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500"
                    style={{
                      width: `${s.attending === 0 ? 0 : Math.round((s.checkedIn / s.attending) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "guests", label: "Add a guest" },
            { href: "broadcast", label: "Send announcement" },
            { href: "seating", label: "View seating chart" },
            { href: "checklist", label: "View checklist" },
            { href: "print", label: "Print coordinator sheet" },
          ].map((action) => (
            <Link
              key={action.href}
              href={`/dashboard/w/${weddingId}/${action.href}`}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm font-medium transition-colors hover:bg-muted"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
