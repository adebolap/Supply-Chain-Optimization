import QRCode from "qrcode";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";

export default async function GuestQrPage({
  params,
}: {
  params: Promise<{ weddingId: string; guestId: string }>;
}) {
  const { weddingId, guestId } = await params;
  const { wedding } = await requireWeddingOwner(weddingId);

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, weddingId },
    include: { seat: { include: { table: true } } },
  });
  if (!guest) notFound();

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";
  const checkInUrl = `${baseUrl}/checkin/${wedding.slug}/g/${guest.checkInToken}`;

  const qrDataUrl = await QRCode.toDataURL(checkInUrl, { width: 320, margin: 2 });

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <img
        src={qrDataUrl}
        alt={`Check-in QR code for ${guest.firstName} ${guest.lastName}`}
        className="rounded-2xl border border-border bg-surface p-4"
        width={320}
        height={320}
      />
      <div>
        <div className="font-display text-2xl font-semibold">
          {guest.firstName} {guest.lastName}
        </div>
        <div className="text-sm text-muted-foreground">{wedding.title}</div>
        {guest.seat && (
          <div className="mt-1 text-sm font-medium text-accent">
            Table {guest.seat.table.name}
          </div>
        )}
      </div>
      <p className="max-w-sm text-xs text-muted-foreground">
        Print this and hand it to your guest, or scan it yourself at the door
        with any phone camera to check them in.
      </p>
      <Link
        href={`/dashboard/w/${weddingId}/guests`}
        className="text-sm text-muted-foreground hover:underline"
      >
        Back to guest list
      </Link>
    </div>
  );
}
