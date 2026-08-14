import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import { addChecklistItem } from "@/lib/actions/checklist";
import ChecklistItemRow from "@/components/ChecklistItemRow";

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  await requireWeddingOwner(weddingId);

  const items = await prisma.checklistItem.findMany({
    where: { weddingId },
    orderBy: [{ isComplete: "asc" }, { dueDate: "asc" }],
  });

  const action = addChecklistItem.bind(null, weddingId);
  const done = items.filter((i) => i.isComplete).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Countdown checklist</h2>
          <span className="text-sm text-zinc-500">
            {done} / {items.length} done
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ChecklistItemRow key={item.id} weddingId={weddingId} item={item} />
          ))}
          {items.length === 0 && (
            <p className="text-sm text-zinc-500">No checklist items yet.</p>
          )}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Add a task</h3>
        <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            name="title"
            required
            placeholder="Task"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black sm:col-span-2"
          />
          <select
            name="category"
            defaultValue="GENERAL"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
          >
            <option value="GUEST_LIST">Guest list</option>
            <option value="RSVP">RSVP</option>
            <option value="SEATING">Seating</option>
            <option value="GENERAL">General</option>
          </select>
          <input
            name="dueDate"
            type="date"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
          />
          <button
            type="submit"
            className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background sm:col-span-4"
          >
            Add task
          </button>
        </form>
      </div>
    </div>
  );
}
