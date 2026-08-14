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
        const rows = results.data.map((row) => ({
          firstName: row.firstName || row["First Name"] || row.first_name || "",
          lastName: row.lastName || row["Last Name"] || row.last_name || "",
          email: row.email || row.Email || "",
          phone: row.phone || row.Phone || "",
          household: row.household || row.Household || "",
          dietaryNotes: row.dietaryNotes || row["Dietary Notes"] || "",
        }));

        startTransition(async () => {
          try {
            const result = await importGuestsCsv(weddingId, rows);
            setMessage(`Imported ${result.imported} guest(s).`);
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Import failed.");
          }
        });
      },
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-black/20 p-4 dark:border-white/20">
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Import guests from CSV</span>
        <span className="text-xs text-zinc-500">
          Columns: firstName, lastName, email, phone, household, dietaryNotes
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
      {isPending && <p className="mt-2 text-xs text-zinc-500">Importing…</p>}
      {message && <p className="mt-2 text-xs">{message}</p>}
    </div>
  );
}
