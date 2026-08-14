"use client";

import { useState } from "react";

export default function RsvpLinkBanner({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/rsvp/${slug}`;

  return (
    <div className="flex items-center justify-between rounded-xl border border-black/10 bg-black/[.02] px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[.03]">
      <span>
        Guest RSVP page: <code className="font-mono">{path}</code>
      </span>
      <button
        onClick={() => {
          if (typeof window !== "undefined") {
            navigator.clipboard.writeText(`${window.location.origin}${path}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
        className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.06]"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
