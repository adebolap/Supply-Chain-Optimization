"use client";

import { useState } from "react";

export default function LinkBanner({
  label,
  path,
}: {
  label: string;
  path: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3 text-sm">
      <span>
        {label}: <code className="font-mono">{path}</code>
      </span>
      <button
        onClick={() => {
          if (typeof window !== "undefined") {
            navigator.clipboard.writeText(`${window.location.origin}${path}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
        className="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
