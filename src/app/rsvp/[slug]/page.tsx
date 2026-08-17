import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pickPhotoForPage } from "@/lib/branding";
import RsvpFlow from "@/components/RsvpFlow";
import WeddingBackdrop from "@/components/WeddingBackdrop";

export default async function PublicRsvpPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wedding = await prisma.wedding.findUnique({ where: { slug } });
  if (!wedding) notFound();

  const photoUrl = pickPhotoForPage(wedding.photoUrls, "rsvp");

  return (
    <div className="relative flex flex-1 flex-col items-center px-6 py-16">
      <WeddingBackdrop photoUrl={photoUrl} />
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          {wedding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wedding.logoUrl}
              alt={wedding.title}
              className="mx-auto mb-4 max-h-16 w-auto"
            />
          ) : (
            <p className="mb-2 text-xs tracking-[0.3em] text-muted-foreground uppercase">
              You&apos;re invited
            </p>
          )}
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">
            {wedding.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {new Date(wedding.weddingDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <RsvpFlow weddingSlug={slug} />
        {wedding.tier === "FREE" && (
          <p className="mt-10 text-center text-xs text-muted-foreground">
            Powered by Aisle
          </p>
        )}
      </div>
    </div>
  );
}
