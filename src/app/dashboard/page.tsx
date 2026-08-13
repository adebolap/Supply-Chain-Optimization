import Link from "next/link";
import { getMyWeddings, createWedding } from "@/lib/actions/weddings";

export default async function DashboardPage() {
  const weddings = await getMyWeddings();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Your weddings</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pick a wedding to manage its guest list, or start a new one.
        </p>
      </div>

      {weddings.length > 0 && (
        <ul className="flex flex-col gap-3">
          {weddings.map((w) => (
            <li key={w.id}>
              <Link
                href={`/dashboard/w/${w.id}/guests`}
                className="flex items-center justify-between rounded-xl border border-black/10 px-5 py-4 hover:bg-black/[.02] dark:border-white/10 dark:hover:bg-white/[.03]"
              >
                <span className="font-medium">{w.title}</span>
                <span className="text-sm text-zinc-500">
                  {new Date(w.weddingDate).toLocaleDateString()} ·{" "}
                  {w.tier === "PREMIUM" ? "Premium" : "Free"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
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
              className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
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
              className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background"
          >
            Create wedding
          </button>
        </form>
      </div>
    </div>
  );
}
