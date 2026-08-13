"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start gap-3 px-6 py-12">
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
        {error.message || "Something went wrong."}
      </p>
      <button
        onClick={reset}
        className="rounded-lg border border-black/10 px-3 py-1.5 text-sm dark:border-white/10"
      >
        Try again
      </button>
    </div>
  );
}
