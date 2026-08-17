import { notFound } from "next/navigation";
import Link from "next/link";
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
        <GuestCheckInCard
          weddingSlug={slug}
          guestId={data.guest.id}
          firstName={data.guest.firstName}
          lastName={data.guest.lastName}
          rsvps={data.guest.rsvps}
        />
        <Link
          href={`/checkin/${slug}`}
          className="mt-6 block text-center text-sm text-muted-foreground hover:underline"
        >
          Check in a different guest
        </Link>
      </div>
    </div>
  );
}
