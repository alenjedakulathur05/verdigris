"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import {
  VIEWPORT,
  fadeOnly,
  fadeUp,
  riseIn3D,
  staggerParent,
  staggerParentSlow,
} from "@/lib/motion";

/**
 * Scroll reveal primitives.
 *
 * Two components, used everywhere:
 *   <Reveal>          — one element arrives
 *   <RevealGroup>     — children arrive in sequence
 *
 * Both read prefers-reduced-motion and swap to an opacity-only variant. Doing
 * that here, once, means no section component ever has to remember to handle
 * it — accessibility enforced by architecture rather than by discipline.
 */

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Delay in seconds. Use sparingly — prefer RevealGroup for sequencing. */
  delay?: number;
  as?: "div" | "section" | "li" | "p" | "span";
};

export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: RevealProps) {
  const reduced = useReducedMotion();
  // Indexing `motion` with a union of tag names yields a union of component
  // types, which TypeScript refuses to render in JSX ("union type too complex
  // to represent"). Every motion component accepts the same props, so
  // collapsing to one concrete type is safe at runtime and honest about it.
  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      variants={reduced ? fadeOnly : fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}

type RevealGroupProps = {
  children: ReactNode;
  className?: string;
  /** "slow" for large items (cards, panels) so they don't machine-gun. */
  rhythm?: "default" | "slow";
  as?: "div" | "section" | "ul";
};

export function RevealGroup({
  children,
  className,
  rhythm = "default",
  as = "div",
}: RevealGroupProps) {
  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      variants={rhythm === "slow" ? staggerParentSlow : staggerParent}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </MotionTag>
  );
}

/** A child of RevealGroup. Inherits the parent's stagger timing — it must not
 *  declare its own initial/whileInView or it would break out of the sequence. */
export function RevealItem({
  children,
  className,
  as = "div",
  weight = "text",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "p" | "span";
  /** "text" rises 24px. "panel" rises further and rotates in 3D — for cards
   *  and surfaces, never for prose. */
  weight?: "text" | "panel";
}) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;
  const variants = reduced ? fadeOnly : weight === "panel" ? riseIn3D : fadeUp;

  return (
    <MotionTag
      className={className}
      variants={variants}
      // Per-element perspective; see the note on riseIn3D.
      style={weight === "panel" && !reduced ? { transformPerspective: 1200 } : undefined}
    >
      {children}
    </MotionTag>
  );
}
