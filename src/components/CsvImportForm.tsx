"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { importGuestsCsv } from "@/lib/actions/guests";

export default function CsvImportForm({ weddingId }: { weddingId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        startTransition(async () => {
          const result = await importGuestsCsv(weddingId, results.data);
          if (result.error) {
            setMessage(result.error);
          } else {
            const parts = [];
            if (result.imported) parts.push(`${result.imported} new`);
            if (result.updated) parts.push(`${result.updated} updated`);
            setMessage(
              parts.length > 0 ? `${parts.join(", ")} guest(s).` : "No changes found."
            );
          }
        });
      },
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-4">
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Import guests from CSV</span>
        <span className="text-xs text-muted-foreground">
          Any column headers work, e.g. Name (or First/Last Name), Email,
          Phone, Household, RSVP status, Notes. Re-uploading later updates
          matching guests by name instead of duplicating them.
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={isPending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
          className="text-sm"
        />
      </label>
      {isPending && <p className="mt-2 text-xs text-muted-foreground">Importing…</p>}
      {message && <p className="mt-2 text-xs">{message}</p>}
    </div>
  );
}
