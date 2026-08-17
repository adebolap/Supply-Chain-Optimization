import { notFound } from "next/navigation";
import { getAdminCheckInAccess } from "@/lib/actions/checkin";
import AdminPinForm from "@/components/AdminPinForm";
import AdminCheckInSearch from "@/components/AdminCheckInSearch";

export default async function CheckInAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const access = await getAdminCheckInAccess(slug);
  if (!access) notFound();

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs tracking-[0.3em] text-muted-foreground uppercase">
            Admin check-in
          </p>
          <h1 className="font-display text-3xl font-semibold">
            {access.weddingTitle}
          </h1>
        </div>
        {access.authenticated ? (
          <AdminCheckInSearch weddingSlug={slug} />
        ) : (
          <AdminPinForm weddingSlug={slug} />
        )}
      </div>
    </div>
  );
}
