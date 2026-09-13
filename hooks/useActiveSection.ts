"use client";

import { useEffect, useState } from "react";

/**
 * Which section is currently being read.
 *
 * IntersectionObserver rather than a scroll listener, and the difference
 * matters: a scroll handler runs on every frame of every scroll and has to
 * call getBoundingClientRect on each section, which forces layout each time.
 * The observer is called by the browser only when a threshold is actually
 * crossed, and costs nothing in between.
 *
 * The rootMargin is the interesting part. `-45% 0px -45% 0px` shrinks the
 * detection area to a thin horizontal band across the middle of the viewport,
 * so a section becomes "active" when it reaches the middle of the screen —
 * where someone is actually reading — rather than the instant one pixel of it
 * appears at the bottom. Without it, two sections are "visible" most of the
 * time and the highlight flickers between them.
 */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => n !== null);

    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
    // ids is a module-level constant at every call site; joining keeps the
    // dependency stable without asking callers to memoise an array literal.
  }, [ids.join(",")]);

  return active;
}
