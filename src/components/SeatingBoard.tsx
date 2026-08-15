"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { assignSeat, deleteTable } from "@/lib/actions/seating";

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
}

interface TableData {
  id: string;
  name: string;
  capacity: number;
  seats: { guestId: string }[];
}

function GuestChip({ guest }: { guest: Guest }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: guest.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      className={`cursor-grab rounded-full border border-border bg-surface px-3 py-1 text-xs ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {guest.firstName} {guest.lastName}
    </div>
  );
}

function TableDropzone({
  table,
  guestsById,
  weddingId,
}: {
  table: TableData;
  guestsById: Record<string, Guest>;
  weddingId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id });
  const seatedGuests = table.seats
    .map((s) => guestsById[s.guestId])
    .filter(Boolean);
  const full = seatedGuests.length >= table.capacity;

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[120px] flex-col gap-2 rounded-xl border p-4 ${
        isOver ? "border-accent bg-accent/10" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{table.name}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${full ? "text-amber-600" : "text-muted-foreground"}`}>
            {seatedGuests.length}/{table.capacity}
          </span>
          <form action={deleteTable.bind(null, weddingId, table.id)}>
            <button type="submit" className="text-xs text-red-600 hover:underline">
              Delete
            </button>
          </form>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {seatedGuests.map((g) => (
          <GuestChip key={g.id} guest={g} />
        ))}
      </div>
    </div>
  );
}

export default function SeatingBoard({
  weddingId,
  tables,
  unseatedGuests,
  guestsById,
}: {
  weddingId: string;
  tables: TableData[];
  unseatedGuests: Guest[];
  guestsById: Record<string, Guest>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDragEnd(event: DragEndEvent) {
    const guestId = String(event.active.id);
    const tableId = event.over ? String(event.over.id) : null;
    setError(null);
    startTransition(async () => {
      try {
        await assignSeat(weddingId, guestId, tableId === "unassigned" ? null : tableId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not seat guest.");
      }
    });
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tables.map((t) => (
          <TableDropzone
            key={t.id}
            table={t}
            guestsById={guestsById}
            weddingId={weddingId}
          />
        ))}
      </div>

      <UnassignedZone guests={unseatedGuests} />
    </DndContext>
  );
}

function UnassignedZone({ guests }: { guests: Guest[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned" });
  return (
    <div
      ref={setNodeRef}
      className={`mt-6 rounded-xl border p-4 ${
        isOver ? "border-accent bg-accent/10" : "border-dashed border-border"
      }`}
    >
      <div className="mb-2 text-sm font-medium">Unassigned ({guests.length})</div>
      <div className="flex flex-wrap gap-1.5">
        {guests.map((g) => (
          <GuestChip key={g.id} guest={g} />
        ))}
        {guests.length === 0 && (
          <p className="text-xs text-muted-foreground">Everyone is seated.</p>
        )}
      </div>
    </div>
  );
}
