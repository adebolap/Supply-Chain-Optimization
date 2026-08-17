import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckInSearch from "@/components/CheckInSearch";

export default async function CheckInSearchPage({
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
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs tracking-[0.3em] text-muted-foreground uppercase">
            Day-of check-in
          </p>
          <h1 className="font-display text-4xl font-semibold">
            {wedding.title}
          </h1>
        </div>
        <CheckInSearch weddingSlug={slug} />
      </div>
    </div>
  );
}
