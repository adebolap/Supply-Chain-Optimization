"use client";

import { Fragment, useState } from "react";
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
}

interface RsvpSummary {
  guestId: string;
  status: string;
}

export default function GuestList({
  weddingId,
  guests,
  rsvpByGuest,
}: {
  weddingId: string;
  guests: Guest[];
  rsvpByGuest: Record<string, RsvpSummary[]>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (guests.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No guests yet — add your first guest above, or import a CSV.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-black/[.03] text-left dark:bg-white/[.05]">
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
                <tr className="border-t border-black/5 dark:border-white/5">
                  <td className="px-4 py-2">
                    {g.firstName} {g.lastName}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {g.household || "—"}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {g.tags.join(", ") || "—"}
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
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {declined} no
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() =>
                        setEditingId(editingId === g.id ? null : g.id)
                      }
                      className="mr-2 text-xs text-zinc-500 hover:underline"
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
                  <tr className="border-t border-black/5 bg-black/[.02] dark:border-white/5 dark:bg-white/[.03]">
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
                          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-black"
                        />
                        <input
                          name="lastName"
                          defaultValue={g.lastName}
                          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-black"
                        />
                        <input
                          name="household"
                          defaultValue={g.household || ""}
                          placeholder="Household"
                          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-black"
                        />
                        <select
                          name="side"
                          defaultValue={g.side}
                          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-black"
                        >
                          <option value="SHARED">Shared</option>
                          <option value="PARTNER_ONE">Partner 1</option>
                          <option value="PARTNER_TWO">Partner 2</option>
                        </select>
                        <input
                          name="email"
                          defaultValue={g.email || ""}
                          placeholder="Email"
                          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-black"
                        />
                        <input
                          name="phone"
                          defaultValue={g.phone || ""}
                          placeholder="Phone"
                          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-black"
                        />
                        <input
                          name="tags"
                          defaultValue={g.tags.join(", ")}
                          placeholder="Tags"
                          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-black"
                        />
                        <input
                          name="dietaryNotes"
                          defaultValue={g.dietaryNotes || ""}
                          placeholder="Dietary notes"
                          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-black"
                        />
                        <button
                          type="submit"
                          className="col-span-2 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background sm:col-span-4"
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
