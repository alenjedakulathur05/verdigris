"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Departure parallax.
 *
 * As you scroll out of the hero, the words drift up and fade while the footage
 * behind them sinks and darkens. Two layers moving at different rates is the
 * oldest depth cue there is, and it costs one transform each.
 *
 * The point is the HANDOFF. Without it the hero is simply gone the moment you
 * scroll — a cut. With it the hero recedes and the page arrives, which is the
 * same continuous gesture the entry sequence makes when it lifts.
 *
 * Everything here maps scroll POSITION to a transform, so scrolling back up
 * runs it in reverse exactly. Nothing here has its own clock.
 */
export function HeroParallax({
  children,
  /** How far this layer travels, in px, across the departure. Negative moves
   *  up. Give the foreground more than the background — that gap IS the depth. */
  travel = -80,
  fade = true,
  className = "",
}: {
  children: ReactNode;
  travel?: number;
  fade?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    /* From "the top of the hero is at the top of the viewport" (i.e. the
       moment you begin to leave) to "the bottom of the hero has reached the
       top" (you have left). Nothing moves while you are still sitting on it. */
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, travel]);
  // Gone by 70%, not 100% — content that is still faintly visible while the
  // next section is arriving reads as a rendering bug rather than as depth.
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      style={{ y, ...(fade ? { opacity } : {}) }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
