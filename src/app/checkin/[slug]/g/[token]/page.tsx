import { notFound } from "next/navigation";
import { getGuestForCheckIn } from "@/lib/actions/checkin";
import GuestCheckInCard from "@/components/GuestCheckInCard";

export default async function CheckInGuestPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;
  const data = await getGuestForCheckIn(slug, token);
  if (!data) notFound();

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs tracking-[0.3em] text-muted-foreground uppercase">
            Day-of check-in
          </p>
          <h1 className="font-display text-3xl font-semibold">
            {data.weddingTitle}
          </h1>
        </div>
        {data.notYetOpen ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="text-lg font-semibold">Check-in isn&apos;t open yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Come back at{" "}
              {new Date(data.opensAt!).toLocaleString([], {
                dateStyle: "long",
                timeStyle: "short",
              })}
              .
            </p>
          </div>
        ) : (
          <>
            <GuestCheckInCard
              weddingSlug={slug}
              guestId={data.guest.id}
              firstName={data.guest.firstName}
              lastName={data.guest.lastName}
              tableName={data.guest.tableName}
              tableMates={data.guest.tableMates}
              primaryEventId={data.guest.primaryEventId}
              wasAlreadyCheckedIn={data.guest.wasAlreadyCheckedIn}
              justCheckedIn={data.guest.justCheckedIn}
              rsvps={data.guest.rsvps}
            />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Scan the next guest&apos;s code to check them in.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
