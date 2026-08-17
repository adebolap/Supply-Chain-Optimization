import QRCode from "qrcode";
import { headers } from "next/headers";
import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";

export default async function CheckInCardsPage({
  params,
}: {
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  const { wedding } = await requireWeddingOwner(weddingId);

  const guests = await prisma.guest.findMany({
    where: { weddingId },
    orderBy: [{ household: "asc" }, { lastName: "asc" }],
    include: { seat: { include: { table: true } } },
  });

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";

  const cards = await Promise.all(
    guests.map(async (guest) => {
      const checkInUrl = `${baseUrl}/checkin/${wedding.slug}/g/${guest.checkInToken}`;
      const qrDataUrl = await QRCode.toDataURL(checkInUrl, { width: 200, margin: 1 });
      return {
        id: guest.id,
        name: `${guest.firstName} ${guest.lastName}`,
        tableName: guest.seat?.table.name ?? null,
        qrDataUrl,
      };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Guest check-in cards</h1>
          <p className="text-sm text-muted-foreground">
            One QR code per guest, ready to cut apart and hand to ushers.
            Keep these with door staff, don&apos;t distribute them to
            guests ahead of time, so admission stays invitation-only.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center break-inside-avoid"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.qrDataUrl}
              alt={`Check-in QR code for ${card.name}`}
              width={140}
              height={140}
            />
            <div className="text-sm font-medium">{card.name}</div>
            {card.tableName && (
              <div className="text-xs text-muted-foreground">
                Table {card.tableName}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
