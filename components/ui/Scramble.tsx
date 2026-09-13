"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Decode-on-reveal.
 *
 * The label arrives as noise and resolves into text, left to right. It fits
 * this site specifically — every mono label is framed as a readout from a
 * system, and a readout that RESOLVES reads as something being decoded rather
 * than something being styled.
 *
 * Why it isn't cheap: the effect is driven by elapsed time and settles
 * character by character from the left, so the word appears to lock in
 * progressively instead of the whole string flickering at random. Random
 * flicker on every character at once is the version everyone writes first, and
 * it looks like a broken font.
 *
 * Accessibility: the element carries the real text in aria-label and the
 * scrambling glyphs are aria-hidden, so assistive tech never sees the noise.
 */

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>[]{}#%&*+=-_";

export function Scramble({
  text,
  className = "",
  /** ms per character to lock in. Lower = faster decode. */
  speed = 38,
}: {
  text: string;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let start = 0;
    let running = false;

    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      // How many characters have locked in so far.
      const settled = elapsed / speed;

      let out = "";
      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") {
          out += " ";
        } else if (i < settled) {
          out += text[i];
        } else {
          out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }
      setDisplay(out);

      if (settled < text.length) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
        running = false;
      }
    };

    /* Runs EVERY time it enters view, not once. Replaying is the whole point —
       a decode that only ever happens on first load is invisible to anyone who
       scrolls back up. */
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || running) return;
        running = true;
        start = 0;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [text, speed]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden>{display}</span>
    </span>
  );
}
