"use client";

import { useEffect, useState, useTransition } from "react";
import {
  findGuestsByName,
  getHouseholdForRsvp,
  submitRsvps,
  updateGuestContactInfo,
  type RsvpEntry,
  type GuestContactUpdate,
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
  email: string | null;
  phone: string | null;
  notes: string | null;
  dietaryNotes: string | null;
  rsvps: HouseholdGuestRsvp[];
}

interface HouseholdData {
  weddingTitle: string;
  events: HouseholdEvent[];
  guests: HouseholdGuest[];
}

type FormState = Record<string, Record<string, Partial<RsvpEntry>>>;
type ContactFormState = Record<string, Omit<GuestContactUpdate, "guestId">>;

export default function RsvpFlow({
  weddingSlug,
  initialGuestId,
}: {
  weddingSlug: string;
  initialGuestId?: string;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [contactForm, setContactForm] = useState<ContactFormState>({});
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialGuestId) selectGuest(initialGuestId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGuestId]);

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
      const initialContact: ContactFormState = {};
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
        initialContact[g.id] = {
          email: g.email || "",
          phone: g.phone || "",
          notes: g.notes || "",
          dietaryNotes: g.dietaryNotes || "",
        };
      }
      setForm(initial);
      setContactForm(initialContact);
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

  function updateContactField(
    guestId: string,
    field: keyof Omit<GuestContactUpdate, "guestId">,
    value: string
  ) {
    setContactForm((prev) => ({
      ...prev,
      [guestId]: { ...prev[guestId], [field]: value },
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
    const contactUpdates: GuestContactUpdate[] = household.guests.map((g) => ({
      guestId: g.id,
      ...contactForm[g.id],
    }));
    startTransition(async () => {
      await Promise.all([
        submitRsvps(weddingSlug, entries),
        updateGuestContactInfo(weddingSlug, contactUpdates),
      ]);
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border p-8 text-center ">
        <h2 className="mb-2 text-lg font-semibold">Thank you!</h2>
        <p className="text-sm text-muted-foreground">
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
            className="rounded-2xl border border-border p-5 "
          >
            <h3 className="mb-3 font-semibold">
              {g.firstName} {g.lastName}
            </h3>
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="email"
                placeholder="Email"
                value={contactForm[g.id]?.email || ""}
                onChange={(ev) => updateContactField(g.id, "email", ev.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={contactForm[g.id]?.phone || ""}
                onChange={(ev) => updateContactField(g.id, "phone", ev.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              />
              <input
                placeholder="Mailing address (optional)"
                value={contactForm[g.id]?.notes || ""}
                onChange={(ev) => updateContactField(g.id, "notes", ev.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground sm:col-span-2"
              />
              <input
                placeholder="Dietary notes (optional)"
                value={contactForm[g.id]?.dietaryNotes || ""}
                onChange={(ev) => updateContactField(g.id, "dietaryNotes", ev.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground sm:col-span-2"
              />
            </div>
            <div className="flex flex-col gap-4">
              {household.events.map((e) => {
                const f = form[g.id]?.[e.id];
                return (
                  <div key={e.id} className="border-t border-border-soft pt-3 ">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">{e.name}</span>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => updateField(g.id, e.id, "status", "ATTENDING")}
                          className={`rounded-full px-3 py-1 ${
                            f?.status === "ATTENDING"
                              ? "bg-emerald-600 text-white"
                              : "border border-border"
                          }`}
                        >
                          Attending
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField(g.id, e.id, "status", "DECLINED")}
                          className={`rounded-full px-3 py-1 ${
                            f?.status === "DECLINED"
                              ? "bg-foreground text-background"
                              : "border border-border"
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
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
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
                            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
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
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
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
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
      />
      {isPending && <p className="text-xs text-muted-foreground">Searching…</p>}
      {matches.length > 0 && (
        <ul className="flex flex-col divide-y divide-border-soft rounded-lg border border-border  ">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => selectGuest(m.id)}
                className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                {m.firstName} {m.lastName}
                {m.household && (
                  <span className="ml-2 text-xs text-muted-foreground">{m.household}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && !isPending && matches.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No matches found. Check the spelling or contact the couple directly.
        </p>
      )}
    </div>
  );
}
