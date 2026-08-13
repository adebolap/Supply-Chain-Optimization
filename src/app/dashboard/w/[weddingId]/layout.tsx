import Link from "next/link";
import { requireWeddingOwner } from "@/lib/actions/weddings";

const TABS = [
  { href: "guests", label: "Guest list" },
  { href: "checklist", label: "Checklist" },
  { href: "seating", label: "Seating" },
  { href: "events", label: "Events" },
  { href: "settings", label: "Settings" },
];

export default async function WeddingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  const { wedding } = await requireWeddingOwner(weddingId);

  const daysToGo = Math.max(
    0,
    Math.ceil(
      (new Date(wedding.weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-black/10 px-6 py-5 dark:border-white/10">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-xs text-zinc-500 hover:underline"
            >
              &larr; All weddings
            </Link>
            <h1 className="text-xl font-semibold">{wedding.title}</h1>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {daysToGo} day{daysToGo === 1 ? "" : "s"} to go
            </div>
            <div className="text-xs text-zinc-500">
              {wedding.tier === "PREMIUM" ? "Premium plan" : "Free plan"}
            </div>
          </div>
        </div>
        <nav className="mx-auto mt-4 flex w-full max-w-4xl gap-1 text-sm">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={`/dashboard/w/${weddingId}/${tab.href}`}
              className="rounded-full px-3 py-1.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
