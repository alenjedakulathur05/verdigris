"use client";

import { motion } from "framer-motion";
import { EASE_BLOOM } from "@/lib/motion";
import type { Message } from "@/lib/types";

/**
 * Corner treatment: each bubble has one squared corner on the side it comes
 * from, anchoring it to its speaker. It's a two-pixel decision nobody will
 * consciously notice, and the layout looks subtly wrong without it.
 */

export function Bubble({ message }: { message: Message }) {
  const isHero = message.author === "hero";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_BLOOM }}
      className={`flex ${isHero ? "justify-start" : "justify-end"}`}
    >
      <div
        className={
          isHero
            ? "max-w-[85%] rounded-lg rounded-tl-sm border-l-2 border-patina-500 bg-overlay px-4 py-3 text-ink"
            : "max-w-[85%] rounded-lg rounded-tr-sm border border-patina-700 bg-patina-900 px-4 py-3 text-ink"
        }
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.text}
        </p>
      </div>
    </motion.div>
  );
}

/** Three dots on a staggered loop. The offsets are uneven on purpose — an
 *  evenly-timed pulse reads as a loading spinner, not as someone thinking. */
export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex justify-start"
      aria-label="Verdigris is typing"
      role="status"
    >
      <div className="rounded-lg rounded-tl-sm border-l-2 border-patina-500 bg-overlay px-4 py-4">
        <div className="flex gap-1.5">
          {[0, 0.18, 0.32].map((delay) => (
            <motion.span
              key={delay}
              className="block h-1.5 w-1.5 rounded-full bg-patina-500"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
