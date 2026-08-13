"use client";

import { useTransition } from "react";
import { toggleChecklistItem, deleteChecklistItem } from "@/lib/actions/checklist";

interface Props {
  weddingId: string;
  item: {
    id: string;
    title: string;
    category: string;
    isComplete: boolean;
    dueDate: Date | null;
  };
}

export default function ChecklistItemRow({ weddingId, item }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-2.5 dark:border-white/10">
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={item.isComplete}
          disabled={isPending}
          onChange={(e) =>
            startTransition(() =>
              toggleChecklistItem(weddingId, item.id, e.target.checked)
            )
          }
        />
        <span className={item.isComplete ? "text-zinc-400 line-through" : ""}>
          {item.title}
        </span>
        {item.dueDate && (
          <span className="text-xs text-zinc-500">
            due {new Date(item.dueDate).toLocaleDateString()}
          </span>
        )}
      </label>
      <button
        onClick={() => startTransition(() => deleteChecklistItem(weddingId, item.id))}
        className="text-xs text-red-600 hover:underline"
      >
        Remove
      </button>
    </li>
  );
}
