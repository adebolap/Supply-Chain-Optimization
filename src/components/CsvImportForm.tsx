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
          setMessage(
            result.error ? result.error : `Imported ${result.imported} guest(s).`
          );
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
          Phone, Household, RSVP status, Notes.
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
