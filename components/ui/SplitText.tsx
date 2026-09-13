"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ElementType } from "react";
import { EASE_BLOOM } from "@/lib/motion";

/**
 * Headline reveal, character by character.
 *
 * Each letter sits inside a clipping box and starts fully BELOW it, then rises
 * into place. That is the difference between this and a fade: the letters do
 * not appear from nothing, they arrive from somewhere, which is what makes the
 * effect read as deliberate craft rather than as a transition.
 *
 * Two details that are easy to get wrong and very visible when you do:
 *
 *   WORDS are the unit of layout, CHARACTERS are the unit of animation. Split
 *   straight to characters and the browser will happily wrap a line in the
 *   middle of a word, because every letter became its own inline-block.
 *
 *   ACCESSIBILITY. A screen reader hitting fifty individually-wrapped letters
 *   reads out fifty letters. The wrapper carries the real string in aria-label
 *   and every fragment is aria-hidden, so assistive tech gets the sentence and
 *   the eye gets the animation.
 */
export function SplitText({
  text,
  as: Tag = "span",
  className = "",
  delay = 0,
  stagger = 0.028,
  duration = 0.9,
  once = true,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  once?: boolean;
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  // Reduced motion gets the text, plainly. No travel, no stagger, no clipping.
  if (reduced) return <Tag className={className}>{text}</Tag>;

  let charIndex = -1;

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, w) => (
        <span
          key={`${word}-${w}`}
          aria-hidden
          /* align-top matters: the clipping boxes are taller than the glyphs,
             and without it every word sits on a slightly different baseline. */
          className="inline-block whitespace-nowrap align-top"
        >
          {Array.from(word).map((char, c) => {
            charIndex += 1;
            const i = charIndex;
            return (
              <span
                key={`${char}-${c}`}
                /* The clipping box. pb/-mb gives descenders (g, y, p) room to
                   exist without the mask slicing them off — leave it out and
                   the effect looks subtly broken on exactly those letters. */
                className="inline-block overflow-hidden pb-[0.12em] align-top -mb-[0.12em]"
              >
                <motion.span
                  className="inline-block will-change-transform"
                  initial={{ y: "110%", rotate: 6, opacity: 0 }}
                  whileInView={{ y: "0%", rotate: 0, opacity: 1 }}
                  viewport={{ once, margin: "0px 0px -15% 0px" }}
                  transition={{
                    duration,
                    ease: EASE_BLOOM,
                    delay: delay + i * stagger,
                  }}
                >
                  {char}
                </motion.span>
              </span>
            );
          })}
          {w < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}
