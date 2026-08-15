import Link from "next/link";
import { auth } from "@/lib/auth";
import { FREE_TIER_LIMITS } from "@/lib/limits";

const FEATURES = [
  {
    title: "Guest list",
    body: "Add guests one by one or import a CSV. Group by household, tag the bridal party, track dietary notes.",
  },
  {
    title: "RSVP page",
    body: "A shareable link your guests use to respond with attendance, meal choice, and plus-one, synced live to your dashboard.",
  },
  {
    title: "Seating chart",
    body: "Drag and drop guests into tables, built directly from your guest list and RSVP data. No re-entry.",
  },
  {
    title: "Countdown checklist",
    body: "Milestones counting down to the big day, tied to guest-list tasks like save-the-dates and final headcount.",
  },
];

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="font-display text-2xl font-semibold tracking-tight">
          Aisle
        </span>
        <nav className="flex items-center gap-4 text-sm">
          {session?.user ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-accent px-4 py-2 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-accent px-4 py-2 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-16 px-6 py-24 text-center">
        <div className="flex flex-col items-center gap-6">
          <h1 className="font-display max-w-xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Your guest list, RSVPs, and seating chart, finally in one place.
          </h1>
          <p className="max-w-lg text-lg leading-8 text-muted-foreground">
            Free for up to {FREE_TIER_LIMITS.maxGuests} guests and one event.
            Unlock unlimited guests, multi-event planning, and day-of
            coordinator mode with a single one-time payment, no subscription.
          </p>
          <Link
            href="/login"
            className="rounded-full bg-accent px-6 py-3 text-base font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Start your guest list
          </Link>
        </div>

        <div className="grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border p-6 "
            >
              <h2 className="mb-2 font-semibold">{f.title}</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        Aisle: built for guest lists, not gift registries.
      </footer>
    </div>
  );
}
