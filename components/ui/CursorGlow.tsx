"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * The cursor light, and the ring that leads it.
 *
 * Two objects, two different lags, and that gap is the whole effect:
 *
 *   the RING tracks tightly, so it reads as attached to the pointer
 *   the GLOW trails well behind, so it reads as a separate light in the room
 *
 * Give them the same spring and they fuse into one blob that may as well be
 * painted on the cursor. Different masses is what makes it feel like physics.
 *
 * The ring also reacts: over anything interactive it expands and fills,
 * which turns hover feedback into something the cursor does rather than
 * something the button does.
 *
 * `mix-blend-mode: screen` throughout — this ADDS light to what is underneath
 * instead of veiling it, so text stays exactly as readable as it was. Both
 * layers are pointer-events-none, or they would swallow every click.
 */
export function CursorGlow() {
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const [enabled, setEnabled] = useState(false);
  const [hot, setHot] = useState(false);

  // Heavy and slow — the light in the room.
  const glowX = useSpring(x, { stiffness: 80, damping: 20, mass: 0.7 });
  const glowY = useSpring(y, { stiffness: 80, damping: 20, mass: 0.7 });
  // Light and quick — the cursor's own ring.
  const ringX = useSpring(x, { stiffness: 500, damping: 34, mass: 0.28 });
  const ringY = useSpring(y, { stiffness: 500, damping: 34, mass: 0.28 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    setEnabled(true);

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const el = e.target as HTMLElement | null;
      setHot(
        Boolean(el?.closest?.("a, button, [role='button'], input, textarea")),
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden
        style={{ x: glowX, y: glowY }}
        className="pointer-events-none fixed left-0 top-0 z-[55] h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 mix-blend-screen"
      >
        <motion.div
          className="h-full w-full rounded-full"
          animate={{ scale: hot ? 1.18 : 1, opacity: hot ? 1 : 0.86 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            /* Three stops rather than two. A single falloff reads as a flat
               disc; a bright core inside a wide halo reads as an actual light
               source with a hotspot. */
            background:
              "radial-gradient(circle, rgb(255 60 95 / 0.30) 0%, rgb(255 31 69 / 0.16) 22%, rgb(255 31 69 / 0.06) 46%, transparent 72%)",
          }}
        />
      </motion.div>

      <motion.div
        aria-hidden
        style={{ x: ringX, y: ringY }}
        className="pointer-events-none fixed left-0 top-0 z-[56] -translate-x-1/2 -translate-y-1/2 mix-blend-screen"
      >
        <motion.span
          className="block rounded-full border"
          animate={{
            width: hot ? 46 : 26,
            height: hot ? 46 : 26,
            borderColor: hot ? "rgb(255 224 0 / 0.9)" : "rgb(255 31 69 / 0.75)",
            backgroundColor: hot
              ? "rgb(255 224 0 / 0.10)"
              : "rgb(255 31 69 / 0.04)",
          }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        />
      </motion.div>
    </>
  );
}
