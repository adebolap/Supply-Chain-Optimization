import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMyWeddings, createWedding } from "@/lib/actions/weddings";

export default async function DashboardPage() {
  const [session, weddings] = await Promise.all([auth(), getMyWeddings()]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Your weddings</h1>
        <p className="text-sm text-muted-foreground">
          Pick a wedding to manage its guest list, or start a new one.
        </p>
      </div>

      {weddings.length > 0 && (
        <ul className="flex flex-col gap-3">
          {weddings.map((w) => (
            <li key={w.id}>
              <Link
                href={`/dashboard/w/${w.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4 transition-colors hover:bg-muted"
              >
                <span className="font-medium">
                  {w.title}
                  {w.ownerId !== session?.user?.id && (
                    <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-normal text-accent">
                      Shared with you
                    </span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">
                  {new Date(w.weddingDate).toLocaleDateString()} ·{" "}
                  {w.tier === "PREMIUM" ? "Premium" : "Free"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl border border-border p-6 ">
        <h2 className="mb-4 font-semibold">Start a new wedding</h2>
        <form action={createWedding} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="title">
              Wedding title
            </label>
            <input
              id="title"
              name="title"
              required
              placeholder="Sam & Jordan's Wedding"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="weddingDate">
              Wedding date
            </label>
            <input
              id="weddingDate"
              name="weddingDate"
              type="date"
              required
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Create wedding
          </button>
        </form>
      </div>
    </div>
  );
}
