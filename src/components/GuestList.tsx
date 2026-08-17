"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { updateGuest, deleteGuest } from "@/lib/actions/guests";

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  household: string | null;
  side: string;
  tags: string[];
  dietaryNotes: string | null;
  notes: string | null;
  rsvpToken: string;
}

interface RsvpSummary {
  guestId: string;
  status: string;
}

export default function GuestList({
  weddingId,
  weddingSlug,
  guests,
  rsvpByGuest,
}: {
  weddingId: string;
  weddingSlug: string;
  guests: Guest[];
  rsvpByGuest: Record<string, RsvpSummary[]>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyRsvpLink(guestId: string, token: string) {
    const url = `${window.location.origin}/rsvp/${weddingSlug}/g/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(guestId);
    setTimeout(() => setCopiedId((id) => (id === guestId ? null : id)), 2000);
  }

  if (guests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No guests yet. Add your first guest above, or import a CSV.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Household</th>
            <th className="px-4 py-2 font-medium">Tags</th>
            <th className="px-4 py-2 font-medium">RSVP</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {guests.map((g) => {
            const rsvps = rsvpByGuest[g.id] || [];
            const attending = rsvps.filter((r) => r.status === "ATTENDING").length;
            const declined = rsvps.filter((r) => r.status === "DECLINED").length;
            const pending = rsvps.length - attending - declined;

            return (
              <Fragment key={g.id}>
                <tr className="border-t border-border-soft">
                  <td className="px-4 py-2">
                    {g.firstName} {g.lastName}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {g.household || "-"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {g.tags.join(", ") || "-"}
                  </td>
                  <td className="px-4 py-2">
                    {pending > 0 && (
                      <span className="mr-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        {pending} pending
                      </span>
                    )}
                    {attending > 0 && (
                      <span className="mr-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {attending} yes
                      </span>
                    )}
                    {declined > 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {declined} no
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => copyRsvpLink(g.id, g.rsvpToken)}
                      className="mr-2 text-xs text-muted-foreground hover:underline"
                    >
                      {copiedId === g.id ? "Copied!" : "RSVP link"}
                    </button>
                    <Link
                      href={`/dashboard/w/${weddingId}/guests/${g.id}/qr`}
                      className="mr-2 text-xs text-muted-foreground hover:underline"
                    >
                      QR
                    </Link>
                    <button
                      onClick={() =>
                        setEditingId(editingId === g.id ? null : g.id)
                      }
                      className="mr-2 text-xs text-muted-foreground hover:underline"
                    >
                      {editingId === g.id ? "Close" : "Edit"}
                    </button>
                    <form
                      action={deleteGuest.bind(null, weddingId, g.id)}
                      className="inline"
                    >
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
                {editingId === g.id && (
                  <tr className="border-t border-border-soft bg-muted">
                    <td colSpan={5} className="px-4 py-3">
                      <form
                        action={async (formData) => {
                          await updateGuest(weddingId, g.id, formData);
                          setEditingId(null);
                        }}
                        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                      >
                        <input
                          name="firstName"
                          defaultValue={g.firstName}
                          required
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        />
                        <input
                          name="lastName"
                          defaultValue={g.lastName}
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        />
                        <input
                          name="household"
                          defaultValue={g.household || ""}
                          placeholder="Household"
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        />
                        <select
                          name="side"
                          defaultValue={g.side}
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        >
                          <option value="SHARED">Shared</option>
                          <option value="PARTNER_ONE">Partner 1</option>
                          <option value="PARTNER_TWO">Partner 2</option>
                        </select>
                        <input
                          name="email"
                          defaultValue={g.email || ""}
                          placeholder="Email"
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        />
                        <input
                          name="phone"
                          defaultValue={g.phone || ""}
                          placeholder="Phone"
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        />
                        <input
                          name="tags"
                          defaultValue={g.tags.join(", ")}
                          placeholder="Tags"
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        />
                        <input
                          name="dietaryNotes"
                          defaultValue={g.dietaryNotes || ""}
                          placeholder="Dietary notes"
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        />
                        <input
                          name="notes"
                          defaultValue={g.notes || ""}
                          placeholder="Notes (address, etc.)"
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        />
                        <button
                          type="submit"
                          className="col-span-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover sm:col-span-4"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
