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
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold">{wedding.title}</h1>
          <p className="text-sm text-zinc-500">
            {new Date(wedding.weddingDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <RsvpFlow weddingSlug={slug} />
        {wedding.tier === "FREE" && (
          <p className="mt-10 text-center text-xs text-zinc-400">
            Powered by Aisle
          </p>
        )}
      </div>
    </div>
  );
}
