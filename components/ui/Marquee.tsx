"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { useRef } from "react";

/**
 * Velocity-reactive marquee.
 *
 * A band of text that drifts on its own — and then responds to you. Scroll
 * down and it accelerates; scroll up and it REVERSES. That coupling is the
 * whole idea: the page stops being a document you move past and becomes a
 * mechanism you are driving. It is also the single most recognisable move in
 * the award-site vocabulary, and it is about forty lines.
 *
 * Why it needs a spring: raw scroll velocity is extremely spiky, because wheel
 * events arrive in bursts. Fed in directly the band would judder. The spring
 * is what turns a jagged input into something with mass.
 */

/** Keeps a value inside [min, max) by wrapping it, so the strip can travel
 *  forever without its offset growing without bound. Written out rather than
 *  imported so there is no dependency on a util's export path. */
function wrap(min: number, max: number, value: number) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

export function Marquee({
  text,
  /** % of the strip width per second at rest. Negative drifts right. */
  baseVelocity = -3,
  className = "",
}: {
  text: string;
  baseVelocity?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);

  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });

  /* clamp:false is the important flag. Clamped, fast scrolling would hit a
     ceiling and the band would stop responding exactly when the gesture is
     most emphatic — which is precisely the moment the effect should be at its
     loudest. */
  const velocityFactor = useTransform(smoothVelocity, [0, 1200], [0, 6], {
    clamp: false,
  });

  /* Four copies of the text sit side by side; this wraps within one copy's
     width, so the seam never becomes visible no matter how far it travels. */
  const x = useTransform(baseX, (v) => `${wrap(-25, -50, v)}%`);

  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduced) return;
    // delta-based, not per-frame: the speed is then identical on a 60Hz panel
    // and a 144Hz one. Per-frame movement runs 2.4x faster on the latter.
    let moveBy = direction.current * baseVelocity * (delta / 1000);

    const factor = velocityFactor.get();
    if (factor < 0) direction.current = -1;
    else if (factor > 0) direction.current = 1;

    moveBy += direction.current * moveBy * Math.abs(factor);
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div
      className={`relative flex w-full overflow-hidden ${className}`}
      aria-hidden
    >
      <motion.div className="flex whitespace-nowrap" style={{ x }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="block shrink-0 pr-[3vw]">
            {text}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
