"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { Reveal } from "@/components/ui/Reveal";
import { Scramble } from "@/components/ui/Scramble";
import { SplitText } from "@/components/ui/SplitText";
import { EASE_BLOOM } from "@/lib/motion";
import { PRIORITIES, type Priority } from "@/lib/types";

/**
 * The case log — live figures read from Postgres.
 *
 * This section exists to make the backend VISIBLE. Everything else the server
 * does happens where a visitor cannot see it: the row is written, the email
 * sent, the request triaged, all invisibly. Someone looking at the site has
 * only our word that any of it is real.
 *
 * These numbers are the proof. They change when a request comes in, they are
 * fetched at page load rather than baked into the build, and the split across
 * bands is the triage system showing its own work.
 *
 * It reports COUNTS and nothing else. "Eleven requests, two of them critical"
 * is a statistic; the eleven accounts behind it are things people said in
 * confidence. The endpoint behind this cannot return them.
 */

const LABELS: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  standard: "Standard",
  low: "Low",
};

const BAR: Record<Priority, string> = {
  critical: "bg-ember-500",
  high: "bg-volt-500",
  standard: "bg-line-strong",
  low: "bg-line",
};

type Stats = { total: number; byPriority: Record<Priority, number> };

export function CaseLog() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    let alive = true;
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { stats?: Stats | null } | null) => {
        if (!alive) return;
        if (data?.stats) setStats(data.stats);
        else setFailed(true);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  /* If the database is unreachable the section removes itself rather than
     showing zeroes. A confident "0 requests" would be a wrong statement about
     the state of the system, which is worse than saying nothing. */
  if (failed) return null;

  const total = stats?.total ?? 0;
  // Guard the divisor: every bar would be NaN% wide on an empty table.
  const scale = Math.max(total, 1);

  return (
    <section id="caselog" className="section relative border-t border-line-subtle bg-base">
      <div className="container-page">
        <Reveal className="mb-6">
          <p className="label-mono">
            <Scramble text="Case file — the log" />
          </p>
        </Reveal>

        <SplitText
          as="h2"
          text="Every request is kept."
          stagger={0.018}
          className="mb-14 block max-w-3xl font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.02em]"
        />

        <div className="grid gap-12 lg:grid-cols-[auto_1fr] lg:gap-20">
          {/* The headline figure. Deliberately enormous — this is the number
              the section exists to show. */}
          <Reveal>
            <p className="label-mono mb-3">Requests received</p>
            <p className="font-display text-[clamp(4rem,14vw,9rem)] font-black leading-none tracking-[-0.04em] text-ember-500">
              {stats ? (
                <CountUp to={total} pad={3} duration={2000} />
              ) : (
                <span className="text-line-strong">000</span>
              )}
            </p>
            <p className="label-mono mt-4 flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember-500" />
              </span>
              Live from the database
            </p>
          </Reveal>

          {/* The triage split — the classifier showing its working. */}
          <Reveal delay={0.12} className="min-w-0">
            <p className="label-mono mb-6">Sorted by urgency on arrival</p>

            <ul className="space-y-5">
              {PRIORITIES.map((p, i) => {
                const n = stats?.byPriority[p] ?? 0;
                const pct = (n / scale) * 100;
                return (
                  <li key={p}>
                    <div className="mb-2 flex items-baseline justify-between gap-4">
                      <span className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">
                        {LABELS[p]}
                      </span>
                      <span className="font-mono text-sm tabular-nums text-ink">
                        {stats ? <CountUp to={n} pad={2} duration={1400} /> : "00"}
                      </span>
                    </div>
                    {/* scaleX, not width — transform stays on the compositor. */}
                    <div className="h-[3px] w-full overflow-hidden bg-line-subtle">
                      <motion.div
                        className={`h-full origin-left ${BAR[p]}`}
                        initial={reduced ? false : { scaleX: 0 }}
                        whileInView={{ scaleX: Math.max(pct / 100, n > 0 ? 0.02 : 0) }}
                        viewport={{ once: false, margin: "0px 0px -15% 0px" }}
                        transition={{
                          duration: 1.1,
                          ease: EASE_BLOOM,
                          delay: 0.15 + i * 0.1,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="measure mt-8 text-sm text-ink-faint">
              Each request is read on arrival and given a band, then stored and
              emailed with that band attached. Counts only — nothing anyone
              wrote is ever public.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
