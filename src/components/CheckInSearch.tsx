"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { findGuestsForCheckIn } from "@/lib/actions/checkin";

interface Match {
  id: string;
  firstName: string;
  lastName: string;
  household: string | null;
  checkInToken: string;
}

export default function CheckInSearch({ weddingSlug }: { weddingSlug: string }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setMatches([]);
      return;
    }
    startTransition(async () => {
      const results = await findGuestsForCheckIn(weddingSlug, value);
      setMatches(results);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium" htmlFor="checkin-search">
        Find a guest to check in
      </label>
      <input
        id="checkin-search"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Start typing their name..."
        autoFocus
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
      />
      {isPending && <p className="text-xs text-muted-foreground">Searching...</p>}
      {matches.length > 0 && (
        <ul className="flex flex-col divide-y divide-border-soft rounded-lg border border-border">
          {matches.map((m) => (
            <li key={m.id}>
              <Link
                href={`/checkin/${weddingSlug}/g/${m.checkInToken}`}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <span>
                  {m.firstName} {m.lastName}
                </span>
                {m.household && (
                  <span className="text-xs text-muted-foreground">{m.household}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && !isPending && matches.length === 0 && (
        <p className="text-xs text-muted-foreground">No matches found.</p>
      )}
    </div>
  );
}
