import type { Variants } from "framer-motion";

/**
 * The motion system.
 *
 * Everything that animates on this site imports from here. That is the whole
 * point: a single shared vocabulary of curves, durations and stagger rhythm is
 * what makes a site feel composed by one hand rather than assembled from
 * tutorials. Individual components never invent their own timing.
 */

/** THE signature curve — violent start, long graceful settle (expo-out).
 *  Used on every reveal. Generic ease-in-out has no personality; this does. */
export const EASE_BLOOM: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Symmetrical curve for state changes that go both ways (open/close). */
export const EASE_CORRODE: [number, number, number, number] = [0.65, 0, 0.35, 1];

/** Physics, not duration — used where something should feel like it has mass. */
export const SPRING_SOFT = {
  type: "spring",
  stiffness: 120,
  damping: 20,
  mass: 0.8,
} as const;

export const SPRING_SNAPPY = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 0.6,
} as const;

/** Durations mirror the CSS custom properties in globals.css. */
export const DUR = {
  fast: 0.2,
  base: 0.35,
  slow: 0.65,
  bloom: 1.2,
} as const;

/** Content arrives by rising a short distance. 24px, not 80 — large travel
 *  distances read as "animated website", small ones read as considered. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slow, ease: EASE_BLOOM },
  },
};

/** Reduced-motion counterpart: the content still ARRIVES, it just doesn't
 *  travel. "Nothing happens" would be a broken experience, not an accessible
 *  one. */
export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.fast } },
};

/** Parent orchestrator. One rhythm (60ms) everywhere on the site. */
export const staggerParent: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

/** Slower rhythm for large items (cards, panels) so they don't machine-gun. */
export const staggerParentSlow: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

/** Shared viewport config so every reveal triggers at the same point in the
 *  scroll. Inconsistent trigger points are a subtle but real tell. */
export const VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const;
