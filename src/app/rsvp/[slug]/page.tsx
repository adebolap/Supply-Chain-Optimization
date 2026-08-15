import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RsvpFlow from "@/components/RsvpFlow";

export default async function PublicRsvpPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wedding = await prisma.wedding.findUnique({ where: { slug } });
  if (!wedding) notFound();

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs tracking-[0.3em] text-muted-foreground uppercase">
            You&apos;re invited
          </p>
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
