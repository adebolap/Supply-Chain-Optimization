import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pickPhotoForPage } from "@/lib/branding";
import WeddingBackdrop from "@/components/WeddingBackdrop";

export default async function CheckInLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wedding = await prisma.wedding.findUnique({ where: { slug } });
  if (!wedding) notFound();

  const photoUrl = pickPhotoForPage(wedding.photoUrls, "checkin");

  return (
    <div className="relative flex flex-1 flex-col items-center px-6 py-16">
      <WeddingBackdrop photoUrl={photoUrl} />
      <div className="w-full max-w-lg text-center">
        {wedding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wedding.logoUrl}
            alt={wedding.title}
            className="mx-auto mb-4 max-h-14 w-auto"
          />
        ) : (
          <p className="mb-2 text-xs tracking-[0.3em] text-muted-foreground uppercase">
            Day-of check-in
          </p>
        )}
        <h1 className="font-display mb-6 text-4xl font-semibold">
          {wedding.title}
        </h1>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted-foreground">
            Scan a guest&apos;s QR code with your phone camera to check them
            in. There&apos;s no name lookup here on purpose, admission is by
            invitation code only, so nobody can be checked in under someone
            else&apos;s name.
          </p>
        </div>
        <Link
          href={`/checkin/${slug}/admin`}
          className="mt-6 inline-block text-xs text-muted-foreground hover:underline"
        >
          Guest without their code? Admin check-in
        </Link>
      </div>
    </div>
  );
}
