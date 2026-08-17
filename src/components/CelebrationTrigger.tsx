"use client";

import { useEffect } from "react";

export default function CelebrationTrigger({
  milestoneKey,
  active,
}: {
  milestoneKey: string;
  active: boolean;
}) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const storageKey = `aisle:celebrated:${milestoneKey}`;
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, "1");

    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#b4657a", "#dd93a4", "#fbf6ef"],
      });
    });
  }, [active, milestoneKey]);

  return null;
}
