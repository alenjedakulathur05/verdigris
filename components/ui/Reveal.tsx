"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import {
  VIEWPORT,
  fadeOnly,
  fadeUp,
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
  const MotionTag = motion[as];

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
  const MotionTag = motion[as];

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
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "p" | "span";
}) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  return (
    <MotionTag className={className} variants={reduced ? fadeOnly : fadeUp}>
      {children}
    </MotionTag>
  );
}
