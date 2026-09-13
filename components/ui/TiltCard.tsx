"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Pointer-tracked 3D tilt.
 *
 * The card rotates toward the cursor as if it were a physical panel being
 * looked at from an angle, and a specular sheen slides across it in the same
 * direction. Cheap to run — two rotations and a moving gradient, all on the
 * compositor — and it makes a grid of cards feel handled rather than laid out.
 *
 * `transform-style: preserve-3d` plus a perspective on the PARENT is what
 * makes this read as depth instead of as a skew. Perspective set on the card
 * itself gives every card its own vanishing point, and the row stops looking
 * like one surface.
 */
export function TiltCard({
  children,
  className = "",
  /** Maximum rotation in degrees. Past ~10 the text starts to distort. */
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  // -0.5 … 0.5, relative to the card's own centre
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const spring = { stiffness: 220, damping: 20, mass: 0.4 };
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-max, max]), spring);
  const sheenX = useTransform(px, [-0.5, 0.5], ["0%", "100%"]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    setOn(true);
  }, []);

  if (!on) return <div className={className}>{children}</div>;

  return (
    <div style={{ perspective: 1100 }} className="h-full">
      <motion.div
        ref={ref}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width - 0.5);
          py.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onPointerLeave={() => {
          px.set(0);
          py.set(0);
        }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={`relative h-full ${className}`}
      >
        {children}

        {/* Specular sheen — a soft light sliding across the surface, tied to
            the same pointer position as the rotation so the two read as one
            physical event rather than two effects that happen together. */}
        <motion.span
          aria-hidden
          style={{
            background: `linear-gradient(105deg, transparent 35%, rgb(255 255 255 / 0.055) 50%, transparent 65%)`,
            backgroundSize: "220% 100%",
            backgroundPositionX: sheenX,
          }}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      </motion.div>
    </div>
  );
}
