"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EASE_BLOOM } from "@/lib/motion";

/**
 * The hero visual — "Specimen plate: District 7".
 *
 * A surveyor's plate of a city block, drawn entirely in SVG, with the patina
 * growing across it. Every competing take on this brief reaches for a
 * generated character render; this is deliberately the opposite bet:
 *
 *   - it is ~6 KB of markup instead of a ~400 KB image, so it costs nothing
 *     on a phone and can never be the thing that fails to load
 *   - it is resolution-independent, so it is genuinely sharp on any display
 *   - it animates natively — the growth DRAWS itself, which a bitmap cannot do
 *   - and nobody else will have it, because it isn't a prompt away
 *
 * The one thing it cannot do is show a face. If a character portrait is added
 * later it belongs *behind* this, not instead of it — the plate is the frame.
 */

/** Building silhouettes, as [x, y, width, height] in a 400×400 viewBox.
 *  Hand-placed rather than generated: a random skyline looks random, and an
 *  authored one has a horizon line that reads as a street. */
const BLOCKS: [number, number, number, number][] = [
  [40, 208, 44, 152],
  [90, 168, 34, 192],
  [130, 232, 52, 128],
  [188, 148, 40, 212],
  [234, 196, 30, 164],
  [270, 128, 46, 232],
  [322, 216, 38, 144],
];

/** Growth filaments. Each draws itself on entry, then holds.
 *  Cubic curves, not polylines — the whole point is that it looks grown. */
const FILAMENTS = [
  "M200 360 C 196 300, 172 282, 150 268 C 128 254, 120 232, 122 206",
  "M200 360 C 208 306, 232 292, 254 274 C 276 256, 284 232, 282 202",
  "M200 360 C 198 322, 186 310, 168 300 C 150 290, 142 274, 146 254",
  "M200 360 C 204 330, 220 320, 238 312 C 258 303, 266 288, 264 268",
  "M200 360 C 200 316, 200 292, 200 262 C 200 238, 202 220, 206 200",
];

export function SpecimenPlate({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  /**
   * Cursor parallax, desktop only.
   *
   * Gated on a hover-capable pointer rather than on screen width: a touch
   * device fires no pointermove until you touch, and then reports a single
   * jumped position, which makes the plate lurch. The media query asks the
   * right question — "does this input hover?" — instead of guessing from size.
   */
  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const onMove = (e: PointerEvent) => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // -1 … 1, measured from the centre of the plate
      const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      setTilt({
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);

  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 1.8, delay: 0.3 + i * 0.14, ease: EASE_BLOOM },
        opacity: { duration: 0.3, delay: 0.3 + i * 0.14 },
      },
    }),
  };

  return (
    <div ref={wrap} className={`relative ${className}`}>
      {/* Glow behind the plate. Separate element so its opacity can animate
          without the browser ever repainting a box-shadow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-18%] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgb(52 224 176 / 0.14) 0%, transparent 62%)",
          transform: `translate3d(${tilt.x * -14}px, ${tilt.y * -14}px, 0)`,
          transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />

      <motion.svg
        viewBox="0 0 400 400"
        role="img"
        aria-label="Survey plate of District Seven, showing patina growth across a demolished block"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        className="relative w-full"
        style={{
          transform: `translate3d(${tilt.x * 10}px, ${tilt.y * 10}px, 0)`,
          transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <defs>
          {/* Displacement turbulence is what stops the patina reading as a
              perfect circle — organic edges are the entire brand. */}
          <filter id="sp-organic" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves="3"
              seed="7"
              result="n"
            />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="34" />
            <feGaussianBlur stdDeviation="5" />
          </filter>

          <radialGradient id="sp-patina" cx="50%" cy="88%" r="70%">
            <stop offset="0%" stopColor="#7ff0d0" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#34e0b0" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#34e0b0" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="sp-block" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a3532" />
            <stop offset="100%" stopColor="#121816" />
          </linearGradient>

          {/* Everything is clipped to the plate so the bloom can overflow the
              skyline without escaping the frame. */}
          <clipPath id="sp-clip">
            <rect x="8" y="8" width="384" height="384" />
          </clipPath>
        </defs>

        <g clipPath="url(#sp-clip)">
          <rect x="8" y="8" width="384" height="384" fill="#0b0f0e" />

          {/* Survey grid, inside the plate only */}
          <g stroke="#1e2725" strokeWidth="1">
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`v${i}`} x1={8 + i * 48} y1="8" x2={8 + i * 48} y2="392" />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`h${i}`} x1="8" y1={8 + i * 48} x2="392" y2={8 + i * 48} />
            ))}
          </g>

          {/* The block, before */}
          <g>
            {BLOCKS.map(([x, y, w, h]) => (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={w}
                height={h}
                fill="url(#sp-block)"
                stroke="#2a3532"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Street line — the horizon everything else is measured against */}
          <line x1="8" y1="360" x2="392" y2="360" stroke="#3c4844" strokeWidth="1" />

          {/* The bloom, growing up from the seed at street level */}
          <motion.ellipse
            cx="200"
            cy="330"
            rx="150"
            ry="120"
            fill="url(#sp-patina)"
            filter="url(#sp-organic)"
            variants={{
              hidden: { scale: 0.2, opacity: 0 },
              visible: {
                scale: 1,
                opacity: 1,
                transition: { duration: 2.2, ease: EASE_BLOOM, delay: 0.2 },
              },
            }}
            style={{ transformOrigin: "200px 352px" }}
          />

          {/* Filaments. pathLength is the trick: Framer normalises any path to
              0…1, so one variant draws every curve regardless of its real
              length — no measuring, no stroke-dasharray arithmetic. */}
          <g fill="none" stroke="#7ff0d0" strokeWidth="1.4" strokeLinecap="round">
            {FILAMENTS.map((d, i) => (
              <motion.path key={d} d={d} custom={i} variants={draw} />
            ))}
          </g>

          {/* Nodes where filaments terminate — the growth has destinations */}
          {[
            [122, 206],
            [282, 202],
            [146, 254],
            [264, 268],
            [206, 200],
          ].map(([cx, cy], i) => (
            <motion.circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r="3"
              fill="#34e0b0"
              variants={{
                hidden: { opacity: 0, scale: 0 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  transition: { delay: 1.6 + i * 0.14, duration: 0.5, ease: EASE_BLOOM },
                },
              }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          ))}
        </g>

        {/* HUD frame — corner ticks rather than a full border. A closed
            rectangle looks like a card; open corners look like an instrument. */}
        <g stroke="#3c4844" strokeWidth="1" fill="none">
          {[
            "M8 40 L8 8 L40 8",
            "M360 8 L392 8 L392 40",
            "M392 360 L392 392 L360 392",
            "M40 392 L8 392 L8 360",
          ].map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        <text
          x="16"
          y="382"
          fill="#7c8d88"
          fontSize="9"
          letterSpacing="1.6"
          fontFamily="var(--font-mono)"
        >
          PLATE 001 · DISTRICT SEVEN
        </text>
      </motion.svg>
    </div>
  );
}
