"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Reading progress — a hairline that fills as you move down the page.
 *
 * `scrollYProgress` is a MotionValue, which is the whole reason this is cheap:
 * it updates outside React, so scrolling drives the bar directly on the
 * compositor without a single re-render. The naive version of this component
 * puts scroll position in useState and re-renders the tree sixty times a
 * second.
 *
 * scaleX rather than width for the same reason — width is layout, transform
 * is not.
 */
export function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();

  /* A spring, not the raw value. Trackpad and wheel scrolling arrive in
     uneven jumps; easing them makes the bar feel like it has weight instead
     of twitching. restDelta stops it settling forever on a value nobody can
     see. */
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  });

  if (reduced) return null;

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-px origin-left bg-ember-500"
    />
  );
}
