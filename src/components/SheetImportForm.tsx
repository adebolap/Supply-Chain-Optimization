"use client";

import { useState, useTransition } from "react";
import { importGuestsFromSheet } from "@/lib/actions/guests";

export default function SheetImportForm({ weddingId }: { weddingId: string }) {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    startTransition(async () => {
      const result = await importGuestsFromSheet(weddingId, url.trim());
      if (result.error) {
        setMessage(result.error);
      } else {
        const parts = [];
        if (result.imported) parts.push(`${result.imported} new`);
        if (result.updated) parts.push(`${result.updated} updated`);
        setMessage(
          parts.length > 0 ? `${parts.join(", ")} guest(s).` : "No changes found."
        );
        setUrl("");
      }
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Import from Google Sheets</span>
        <span className="text-xs text-muted-foreground">
          Share the sheet as &quot;Anyone with the link can view,&quot; then
          paste its link. Any column headers work, e.g. Name (or First/Last
          Name), Email, Phone, Household, RSVP status, Notes. Re-importing
          later updates matching guests by name instead of duplicating them.
        </span>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            required
            disabled={isPending}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {isPending ? "Importing..." : "Import"}
          </button>
        </div>
      </form>
      {message && <p className="mt-2 text-xs">{message}</p>}
    </div>
  );
}
