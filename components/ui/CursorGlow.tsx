"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * A soft ember light that trails the cursor.
 *
 * Pure atmosphere — it lights the page from wherever you are looking, which
 * makes the dark surface feel like a room rather than a background colour.
 *
 * It lags on purpose. A glow locked exactly to the pointer is invisible,
 * because nothing about it moves relative to the thing you are watching. The
 * spring is what makes it a separate object that follows you.
 *
 * screen blend mode, never opacity over the top: this ADDS light to what is
 * underneath instead of veiling it, so text stays exactly as readable as it
 * was. It is also pointer-events-none, or it would swallow every click on the
 * page.
 */
export function CursorGlow() {
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const [enabled, setEnabled] = useState(false);

  const sx = useSpring(x, { stiffness: 90, damping: 22, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 90, damping: 22, mass: 0.6 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    setEnabled(true);

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      style={{ x: sx, y: sy }}
      className="pointer-events-none fixed left-0 top-0 z-[55] h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 mix-blend-screen"
    >
      <div
        className="h-full w-full rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgb(255 31 69 / 0.13) 0%, rgb(255 31 69 / 0.05) 35%, transparent 70%)",
        }}
      />
    </motion.div>
  );
}
