"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import {
  updateGuest,
  deleteGuest,
  setGuestRsvpStatus,
  bulkSetSide,
  bulkAddTag,
  bulkDeleteGuests,
} from "@/lib/actions/guests";

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
  eventId: string;
  status: string;
}

interface WeddingEvent {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "ATTENDING", label: "Going" },
  { value: "DECLINED", label: "Not going" },
] as const;

function RsvpStatusRow({
  weddingId,
  guestId,
  events,
  rsvps,
}: {
  weddingId: string;
  guestId: string;
  events: WeddingEvent[];
  rsvps: RsvpSummary[];
}) {
  const [isPending, startTransition] = useTransition();
  const statusByEvent = Object.fromEntries(rsvps.map((r) => [r.eventId, r.status]));

  return (
    <div className="mb-3 flex flex-col gap-2">
      {events.map((event) => {
        const current = statusByEvent[event.id] || "PENDING";
        return (
          <div key={event.id} className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-xs text-muted-foreground">
              {event.name}
            </span>
            <div className="flex gap-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await setGuestRsvpStatus(weddingId, guestId, event.id, opt.value);
                    })
                  }
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                    current === opt.value
                      ? "bg-accent text-accent-foreground"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BulkActionBar({
  weddingId,
  selectedIds,
  onClear,
}: {
  weddingId: string;
  selectedIds: string[];
  onClear: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [bulkSide, setBulkSide] = useState<"SHARED" | "PARTNER_ONE" | "PARTNER_TWO">(
    "SHARED"
  );
  const [bulkTag, setBulkTag] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-soft bg-muted px-4 py-2 text-sm">
      <span className="font-medium">{selectedIds.length} selected</span>

      <select
        value={bulkSide}
        disabled={isPending}
        onChange={(e) =>
          setBulkSide(e.target.value as "SHARED" | "PARTNER_ONE" | "PARTNER_TWO")
        }
        className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
      >
        <option value="SHARED">Shared</option>
        <option value="PARTNER_ONE">Partner 1</option>
        <option value="PARTNER_TWO">Partner 2</option>
      </select>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await bulkSetSide(weddingId, selectedIds, bulkSide);
          })
        }
        className="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-background disabled:opacity-50"
      >
        Set side
      </button>

      <input
        value={bulkTag}
        disabled={isPending}
        onChange={(e) => setBulkTag(e.target.value)}
        placeholder="Add tag…"
        className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-xs"
      />
      <button
        type="button"
        disabled={isPending || !bulkTag.trim()}
        onClick={() =>
          startTransition(async () => {
            await bulkAddTag(weddingId, selectedIds, bulkTag.trim());
            setBulkTag("");
          })
        }
        className="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-background disabled:opacity-50"
      >
        Add tag
      </button>

      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm(`Remove ${selectedIds.length} guest(s)? This can't be undone.`)) return;
          startTransition(async () => {
            await bulkDeleteGuests(weddingId, selectedIds);
            onClear();
          });
        }}
        className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
      >
        Remove selected
      </button>

      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs text-muted-foreground hover:underline"
      >
        Clear selection
      </button>
    </div>
  );
}

export default function GuestList({
  weddingId,
  weddingSlug,
  guests,
  events,
  rsvpByGuest,
}: {
  weddingId: string;
  weddingSlug: string;
  guests: Guest[];
  events: WeddingEvent[];
  rsvpByGuest: Record<string, RsvpSummary[]>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function copyRsvpLink(guestId: string, token: string) {
    const url = `${window.location.origin}/rsvp/${weddingSlug}/g/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(guestId);
    setTimeout(() => setCopiedId((id) => (id === guestId ? null : id)), 2000);
  }

  function toggleSelected(guestId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === guests.length ? new Set() : new Set(guests.map((g) => g.id))
    );
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
      {selectedIds.size > 0 && (
        <BulkActionBar
          weddingId={weddingId}
          selectedIds={Array.from(selectedIds)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
      <table className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="w-8 px-4 py-2">
              <input
                type="checkbox"
                checked={selectedIds.size === guests.length}
                onChange={toggleSelectAll}
                aria-label="Select all guests"
              />
            </th>
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
                    <input
                      type="checkbox"
                      checked={selectedIds.has(g.id)}
                      onChange={() => toggleSelected(g.id)}
                      aria-label={`Select ${g.firstName} ${g.lastName}`}
                    />
                  </td>
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
                    <td colSpan={6} className="px-4 py-3">
                      <div className="mb-3">
                        <div className="mb-1 text-xs font-medium text-muted-foreground">
                          RSVP status (set this yourself if the guest told you directly)
                        </div>
                        <RsvpStatusRow
                          weddingId={weddingId}
                          guestId={g.id}
                          events={events}
                          rsvps={rsvps}
                        />
                      </div>
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
