import Link from "next/link";
import { requireWeddingOwner } from "@/lib/actions/weddings";

const TABS = [
  { href: "guests", label: "Guest list" },
  { href: "checklist", label: "Checklist" },
  { href: "seating", label: "Seating" },
  { href: "events", label: "Events" },
  { href: "checkin", label: "Check-in" },
  { href: "broadcast", label: "Broadcast" },
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
      <div className="border-b border-border px-6 py-5">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:underline"
            >
              &larr; All weddings
            </Link>
            <h1 className="font-display text-2xl font-semibold">
              {wedding.title}
            </h1>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-semibold text-accent">
              {daysToGo} day{daysToGo === 1 ? "" : "s"} to go
            </div>
            <div className="text-xs text-muted-foreground">
              {wedding.tier === "PREMIUM" ? "Premium plan" : "Free plan"}
            </div>
          </div>
        </div>
        <nav className="mx-auto mt-4 flex w-full max-w-5xl flex-wrap gap-1 text-sm">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={`/dashboard/w/${weddingId}/${tab.href}`}
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-muted"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
