"use client";

import { useEffect, useState } from "react";
import { CountUp } from "@/components/ui/CountUp";

/**
 * Live count of logged requests, read from Postgres.
 *
 * The point of this component is evidential rather than decorative: it is the
 * only thing on the page that proves the database exists. Everything else the
 * backend does — storing the row, emailing the notification — happens where a
 * visitor cannot see it.
 *
 * It renders NOTHING until the number arrives, and nothing at all if the
 * fetch fails or the database is not configured. A counter reading "0" because
 * the request errored is worse than no counter: it is a confident, wrong
 * statement about the state of the system.
 */
export function RequestCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { count?: number | null } | null) => {
        if (!alive) return;
        if (typeof data?.count === "number") setCount(data.count);
      })
      .catch(() => {
        /* Silent by design — see the note above. */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (count === null) return null;

  return (
    <span className="label-mono flex items-center gap-2">
      Logged
      <span className="text-ember-300">
        <CountUp to={count} pad={3} duration={1800} />
      </span>
    </span>
  );
}
