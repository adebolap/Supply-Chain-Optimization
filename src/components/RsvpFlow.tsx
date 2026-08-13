"use client";

import { useState, useTransition } from "react";
import {
  findGuestsByName,
  getHouseholdForRsvp,
  submitRsvps,
  type RsvpEntry,
} from "@/lib/actions/rsvp";

interface Match {
  id: string;
  firstName: string;
  lastName: string;
  household: string | null;
}

interface HouseholdEvent {
  id: string;
  name: string;
  startsAt: Date;
}

interface HouseholdGuestRsvp {
  eventId: string;
  status: string;
  mealChoice: string | null;
  plusOne: boolean;
  plusOneName: string | null;
  notes: string | null;
}

interface HouseholdGuest {
  id: string;
  firstName: string;
  lastName: string;
  dietaryNotes: string | null;
  rsvps: HouseholdGuestRsvp[];
}

interface HouseholdData {
  weddingTitle: string;
  events: HouseholdEvent[];
  guests: HouseholdGuest[];
}

type FormState = Record<string, Record<string, Partial<RsvpEntry>>>;

export default function RsvpFlow({ weddingSlug }: { weddingSlug: string }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setMatches([]);
      return;
    }
    startTransition(async () => {
      const results = await findGuestsByName(weddingSlug, value);
      setMatches(results);
    });
  }

  function selectGuest(guestId: string) {
    startTransition(async () => {
      const data = await getHouseholdForRsvp(weddingSlug, guestId);
      if (!data) return;
      setHousehold(data);
      const initial: FormState = {};
      for (const g of data.guests) {
        initial[g.id] = {};
        for (const r of g.rsvps) {
          initial[g.id][r.eventId] = {
            status: (r.status as RsvpEntry["status"]) || "PENDING",
            mealChoice: r.mealChoice || "",
            plusOne: r.plusOne,
            plusOneName: r.plusOneName || "",
            notes: r.notes || "",
          };
        }
      }
      setForm(initial);
    });
  }

  function updateField(
    guestId: string,
    eventId: string,
    field: keyof RsvpEntry,
    value: string | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      [guestId]: {
        ...prev[guestId],
        [eventId]: { ...prev[guestId]?.[eventId], [field]: value },
      },
    }));
  }

  function handleSubmit() {
    if (!household) return;
    const entries: RsvpEntry[] = [];
    for (const g of household.guests) {
      for (const e of household.events) {
        const f = form[g.id]?.[e.id];
        entries.push({
          guestId: g.id,
          eventId: e.id,
          status: (f?.status as RsvpEntry["status"]) || "PENDING",
          mealChoice: f?.mealChoice,
          plusOne: f?.plusOne,
          plusOneName: f?.plusOneName,
          notes: f?.notes,
        });
      }
    }
    startTransition(async () => {
      await submitRsvps(weddingSlug, entries);
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-black/10 p-8 text-center dark:border-white/10">
        <h2 className="mb-2 text-lg font-semibold">Thank you!</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your RSVP has been recorded. See you there.
        </p>
      </div>
    );
  }

  if (household) {
    return (
      <div className="flex flex-col gap-6">
        {household.guests.map((g) => (
          <div
            key={g.id}
            className="rounded-2xl border border-black/10 p-5 dark:border-white/10"
          >
            <h3 className="mb-3 font-semibold">
              {g.firstName} {g.lastName}
            </h3>
            <div className="flex flex-col gap-4">
              {household.events.map((e) => {
                const f = form[g.id]?.[e.id];
                return (
                  <div key={e.id} className="border-t border-black/5 pt-3 dark:border-white/5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">{e.name}</span>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => updateField(g.id, e.id, "status", "ATTENDING")}
                          className={`rounded-full px-3 py-1 ${
                            f?.status === "ATTENDING"
                              ? "bg-emerald-600 text-white"
                              : "border border-black/10 dark:border-white/10"
                          }`}
                        >
                          Attending
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField(g.id, e.id, "status", "DECLINED")}
                          className={`rounded-full px-3 py-1 ${
                            f?.status === "DECLINED"
                              ? "bg-zinc-700 text-white"
                              : "border border-black/10 dark:border-white/10"
                          }`}
                        >
                          Can&apos;t make it
                        </button>
                      </div>
                    </div>
                    {f?.status === "ATTENDING" && (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          placeholder="Meal choice"
                          value={f?.mealChoice || ""}
                          onChange={(ev) =>
                            updateField(g.id, e.id, "mealChoice", ev.target.value)
                          }
                          className="flex-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-black"
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={f?.plusOne || false}
                            onChange={(ev) =>
                              updateField(g.id, e.id, "plusOne", ev.target.checked)
                            }
                          />
                          Plus one
                        </label>
                        {f?.plusOne && (
                          <input
                            placeholder="Plus one name"
                            value={f?.plusOneName || ""}
                            onChange={(ev) =>
                              updateField(g.id, e.id, "plusOneName", ev.target.value)
                            }
                            className="flex-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-black"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Submit RSVP"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium" htmlFor="rsvp-search">
        Find your name to RSVP
      </label>
      <input
        id="rsvp-search"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Start typing your name…"
        className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
      />
      {isPending && <p className="text-xs text-zinc-500">Searching…</p>}
      {matches.length > 0 && (
        <ul className="flex flex-col divide-y divide-black/5 rounded-lg border border-black/10 dark:divide-white/5 dark:border-white/10">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => selectGuest(m.id)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-black/[.03] dark:hover:bg-white/[.05]"
              >
                {m.firstName} {m.lastName}
                {m.household && (
                  <span className="ml-2 text-xs text-zinc-500">{m.household}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && !isPending && matches.length === 0 && (
        <p className="text-xs text-zinc-500">
          No matches found. Check the spelling or contact the couple directly.
        </p>
      )}
    </div>
  );
}
