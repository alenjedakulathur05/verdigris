"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { markBooted } from "@/lib/boot";
import { EASE_BLOOM, EASE_CORRODE } from "@/lib/motion";

/**
 * The entry sequence.
 *
 * A loading screen that isn't loading anything is theatre, and I want to be
 * honest about that: this is a deliberate 2.3-second beat that establishes the
 * conceit — you are opening a case file on a district nobody surveys any more —
 * before the site itself arrives. It is the first thing anyone sees, and a
 * hard cut into a hero section wastes that.
 *
 * Three rules it follows:
 *
 *  1. It is SKIPPABLE. Any key, any click. A visitor who has seen it once and
 *     came back should never be made to sit through it, and an evaluator
 *     reloading the page ten times will thank you.
 *  2. It is not shown to prefers-reduced-motion. A full-screen wipe is exactly
 *     the kind of thing that setting exists to prevent.
 *  3. It never blocks. If anything in here threw, the site would still be
 *     underneath it — the overlay is a sibling of the page, not a gate in
 *     front of it.
 */

/**
 * Progress is deliberately NOT linear.
 *
 * A bar that fills at a constant rate reads as fake, because nothing real
 * loads at a constant rate. Two stalls — at 38% and 79% — are what sell it:
 * the eye reads hesitation as work happening. This is the whole trick.
 */
const SEGMENTS = [
  { to: 38, dur: 520 },
  { to: 41, dur: 280 }, // stall
  { to: 79, dur: 620 },
  { to: 83, dur: 300 }, // stall
  { to: 100, dur: 500 },
] as const;

const HOLD_AFTER = 320; // beat on 100% before the wipe
const WIPE = 0.75; // seconds

/** Belt and braces. If the frame loop is throttled, descheduled or simply
 *  wrong, this fires anyway. A loading screen that can trap a visitor behind
 *  it is the worst possible failure mode for a loading screen, so it gets a
 *  timer that does not depend on any of the logic below being correct. */
const FAILSAFE =
  SEGMENTS.reduce((t, s) => t + s.dur, 0) + HOLD_AFTER + 1500;

/** Readout lines, revealed as the survey "completes" each stage. */
const LINES: { at: number; text: string }[] = [
  { at: 4, text: "Surveying district seven" },
  { at: 40, text: "Indexing what was left behind" },
  { at: 62, text: "Cross-referencing council records" },
  { at: 82, text: "Locating Verdigris" },
];

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function BootSequence() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const done = useRef(false);

  function finish() {
    if (done.current) return;
    done.current = true;
    setVisible(false);
    /* Fire once the wipe is genuinely off-screen, so the chat panel doesn't
       slide in behind a curtain that's still closing. */
    window.setTimeout(markBooted, WIPE * 1000 * 0.7);
  }

  /*
   * Drive the counter.
   *
   * The empty dependency array is load-bearing, and the reason is a genuinely
   * nasty bug I hit building this. useReducedMotion() returns null during SSR
   * and resolves to a boolean after hydration. With [reduced] as the
   * dependency, that single change re-ran this effect and silently restarted
   * the sequence from zero — on top of React StrictMode already mounting every
   * effect twice in development. The visible symptom was a bar taking seven
   * seconds to do a two-second job, which reads to a visitor as "this site is
   * slow" rather than "this code is wrong".
   *
   * So the preference is read synchronously from matchMedia instead. Same
   * answer, but it is available on the first run and can never change
   * underneath the loop.
   */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(false);
      markBooted();
      return;
    }

    let raf = 0;
    let cancelled = false;
    let segment = 0;
    let from = 0;
    let segmentStart = performance.now();

    /* Belt and braces. If the frame loop is throttled, descheduled, or simply
       wrong, this fires anyway. A loading screen that can trap a visitor
       behind it is the worst possible failure mode for a loading screen, so it
       gets a timer that does not depend on any of the logic below. */
    const bail = window.setTimeout(finish, FAILSAFE);

    const tick = (now: number) => {
      if (cancelled) return;
      const seg = SEGMENTS[segment];
      const t = Math.min(1, (now - segmentStart) / seg.dur);
      setProgress(from + (seg.to - from) * easeOut(t));

      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (segment < SEGMENTS.length - 1) {
        from = seg.to;
        segment += 1;
        segmentStart = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      window.setTimeout(() => !cancelled && finish(), HOLD_AFTER);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(bail);
    };
    // `finish` is declared in the component body and never changes identity
    // in a way that matters here: it is idempotent and ref-guarded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Escape hatch: any key, any pointer. Someone who has seen this once should
     never be made to sit through it again. */
  useEffect(() => {
    if (!visible) return;
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /* Lock the page behind the overlay. Without this a visitor can scroll the
     hero out of frame while the curtain is still up and arrive at the middle
     of the page. */
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (reduced) return null;

  const pct = Math.round(progress);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-label="Loading"
          initial={false}
          exit={{
            /* Wipe upward rather than fade. A fade says "a loading screen
               ended"; a wipe says "something was lifted off the page", which
               is the same gesture as pulling a dust sheet off furniture. */
            clipPath: "inset(0% 0% 100% 0%)",
            transition: { duration: WIPE, ease: EASE_CORRODE },
          }}
          style={{ clipPath: "inset(0% 0% 0% 0%)" }}
          className="fixed inset-0 z-[200] grid place-items-center bg-void"
        >
          {/* Survey grid — the same grid the site sits on, introduced here
              first so it reads as continuous when the wipe lifts. */}
          <div
            aria-hidden
            className="boot-grid pointer-events-none absolute inset-0 opacity-[0.35]"
          />

          {/* The seed. Patina spreading from a single point, which is the
              character's entire origin compressed into one shape. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgb(255 31 69 / 0.22) 0%, transparent 65%)",
              transform: `translate(-50%,-50%) scale(${0.45 + progress / 140})`,
              opacity: 0.35 + progress / 260,
            }}
          />

          <div className="relative w-full max-w-[min(28rem,84vw)] px-2">
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_BLOOM }}
              className="label-mono mb-8 text-ember-500"
            >
              Reclamation system
            </motion.p>

            {/* Readout. Lines land as the survey passes each threshold —
                tied to progress, not to their own timers, so skipping or
                stalling can never desynchronise them from the bar. */}
            <ul className="mb-8 min-h-[6.5rem] space-y-1.5">
              {LINES.map((line) => {
                const shown = progress >= line.at;
                return (
                  <li
                    key={line.text}
                    className="flex items-baseline justify-between gap-4 font-mono text-xs tracking-wide transition-opacity duration-300"
                    style={{ opacity: shown ? 1 : 0 }}
                  >
                    <span className="text-ink-faint">{line.text}</span>
                    <span
                      aria-hidden
                      className="shrink-0 text-ember-700 transition-colors duration-500"
                      style={{
                        /* Yellow, not red, and the split is semantic: ember is
                           the work in progress, volt is the confirmation that
                           it finished. One accent doing both jobs would make
                           the readout unreadable at a glance. */
                        color:
                          progress >= line.at + 14
                            ? "var(--color-volt-500)"
                            : undefined,
                      }}
                    >
                      {progress >= line.at + 14 ? "done" : "····"}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* The bar. A 1px trough with an ember fill — the fill has a
                brighter leading edge so the growth has a direction. */}
            <div className="relative h-px w-full bg-line">
              <div
                className="absolute inset-y-0 left-0 bg-ember-500"
                style={{
                  width: `${progress}%`,
                  boxShadow: "0 0 10px 1px rgb(255 31 69 / 0.85)",
                }}
              />
            </div>

            <div className="mt-4 flex items-baseline justify-between font-mono text-xs">
              <span className="text-ink-disabled">Press any key to skip</span>
              {/* tabular-nums stops the counter jittering as digits change
                  width — the single most noticeable flaw in hand-built
                  counters, and a one-word fix. */}
              <span className="tabular-nums text-lg font-medium text-ink">
                {String(pct).padStart(3, "0")}
                <span className="text-ink-faint">%</span>
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
