import { addGuest } from "@/lib/actions/guests";

export default function AddGuestForm({ weddingId }: { weddingId: string }) {
  const action = addGuest.bind(null, weddingId);

  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <input
        name="firstName"
        required
        placeholder="First name"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
      />
      <input
        name="lastName"
        placeholder="Last name"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
      />
      <input
        name="household"
        placeholder="Household (optional)"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
      />
      <select
        name="side"
        defaultValue="SHARED"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
      >
        <option value="SHARED">Shared</option>
        <option value="PARTNER_ONE">Partner 1</option>
        <option value="PARTNER_TWO">Partner 2</option>
      </select>
      <input
        name="email"
        type="email"
        placeholder="Email (optional)"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
      />
      <input
        name="phone"
        placeholder="Phone (optional)"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
      />
      <input
        name="tags"
        placeholder="Tags, comma separated"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
      />
      <input
        name="dietaryNotes"
        placeholder="Dietary notes"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
      />
      <button
        type="submit"
        className="col-span-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover sm:col-span-4"
      >
        Add guest
      </button>
    </form>
  );
}
