import { addGuest } from "@/lib/actions/guests";

export default function AddGuestForm({ weddingId }: { weddingId: string }) {
  const action = addGuest.bind(null, weddingId);

  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <input
        name="firstName"
        required
        placeholder="First name"
        className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
      />
      <input
        name="lastName"
        placeholder="Last name"
        className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
      />
      <input
        name="household"
        placeholder="Household (optional)"
        className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
      />
      <select
        name="side"
        defaultValue="SHARED"
        className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
      >
        <option value="SHARED">Shared</option>
        <option value="PARTNER_ONE">Partner 1</option>
        <option value="PARTNER_TWO">Partner 2</option>
      </select>
      <input
        name="email"
        type="email"
        placeholder="Email (optional)"
        className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
      />
      <input
        name="phone"
        placeholder="Phone (optional)"
        className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
      />
      <input
        name="tags"
        placeholder="Tags, comma separated"
        className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
      />
      <input
        name="dietaryNotes"
        placeholder="Dietary notes"
        className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
      />
      <button
        type="submit"
        className="col-span-2 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background sm:col-span-4"
      >
        Add guest
      </button>
    </form>
  );
}
