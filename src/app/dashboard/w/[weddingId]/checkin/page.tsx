import { requireWeddingOwner } from "@/lib/actions/weddings";
import { getCheckInStats } from "@/lib/actions/checkin";
import LinkBanner from "@/components/LinkBanner";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  const { wedding } = await requireWeddingOwner(weddingId);

  const stats = await getCheckInStats(weddingId);

  return (
    <div className="flex flex-col gap-8">
      <LinkBanner
        label="Day-of check-in page (for staff or door table)"
        path={`/checkin/${wedding.slug}`}
      />

      <div>
        <h2 className="mb-2 text-lg font-semibold">Check-in progress</h2>
        {stats.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {stats.map((s) => {
              const pct = s.attending === 0 ? 0 : Math.round((s.checkedIn / s.attending) * 100);
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-border px-4 py-3 text-sm"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">
                      {s.checkedIn} / {s.attending} checked in
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Each guest also has their own QR code (find it via the &quot;QR&quot;
        link on their row in the{" "}
        <a
          href={`/dashboard/w/${weddingId}/guests`}
          className="underline"
        >
          guest list
        </a>
        ) that opens straight to their check-in screen when scanned with any
        phone camera.
      </p>
    </div>
  );
}
