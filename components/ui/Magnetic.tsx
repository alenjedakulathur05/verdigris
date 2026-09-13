"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Magnetic hover.
 *
 * The element leans toward the cursor as it approaches and springs back when
 * it leaves. Small movement, disproportionate effect: it makes a button feel
 * like a physical object with a field around it rather than a rectangle
 * waiting to be clicked. People notice it immediately without being able to
 * say what changed.
 *
 * Gated on a hover-capable, fine pointer. On touch there is no cursor to lean
 * toward, and the first pointer event arrives at the moment of the tap — so
 * the button would visibly lurch out from under the finger pressing it.
 */
export function Magnetic({
  children,
  /** How far it may travel, in px. Past ~20 it stops reading as magnetism and
   *  starts reading as a bug — the element visibly detaches from its layout. */
  strength = 14,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Low stiffness, high damping: it should feel pulled, not snapped.
  const sx = useSpring(x, { stiffness: 180, damping: 18, mass: 0.35 });
  const sy = useSpring(y, { stiffness: 180, damping: 18, mass: 0.35 });

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      // The field extends beyond the element itself, so the pull begins
      // before the cursor arrives — that anticipation is the whole effect.
      const radius = Math.max(r.width, r.height) * 1.15;
      const distance = Math.hypot(dx, dy);

      if (distance > radius) {
        x.set(0);
        y.set(0);
        return;
      }
      const pull = 1 - distance / radius;
      x.set((dx / radius) * strength * pull * 2.2);
      y.set((dy / radius) * strength * pull * 2.2);
    };

    const reset = () => {
      x.set(0);
      y.set(0);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", reset);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", reset);
    };
  }, [strength, x, y]);

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}
