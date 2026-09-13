"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts up when it comes into view, and again every time it
 * comes back.
 *
 * Small thing, disproportionate effect: a static figure is information, a
 * figure that arrives is an event. Pairs with the meter in the hero, which
 * already fills — now the number and the bar move together instead of one
 * animating while the other just sits there.
 */

/** Same expo-out shape as the site's signature curve. Written out rather than
 *  imported because a cubic-bezier control-point tuple is for the compositor;
 *  a JS tween needs the function itself. */
function ease(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUp({
  to,
  duration = 1600,
  pad = 2,
  suffix = "",
  className = "",
}: {
  to: number;
  duration?: number;
  pad?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }

    let frame = 0;
    let start = 0;
    let running = false;

    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(to * ease(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else running = false;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || running) return;
        running = true;
        start = 0;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [to, duration]);

  return (
    /* tabular-nums is not optional on a counter: without it the glyph widths
       change as the digits do and the number visibly jitters while counting. */
    <span ref={ref} className={`tabular-nums ${className}`}>
      {String(value).padStart(pad, "0")}
      {suffix}
    </span>
  );
}
