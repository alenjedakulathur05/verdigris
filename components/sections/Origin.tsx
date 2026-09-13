"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SplitText } from "@/components/ui/SplitText";
import { character } from "@/content/character";

/**
 * Origin — the pinned sequence.
 *
 * The heading rail sticks while the four paragraphs of the account scroll past
 * it, and a counter in the rail keeps pace. This is the one place on the site
 * that uses scroll POSITION rather than a scroll TRIGGER, and the difference
 * is the whole point:
 *
 *   triggered  — an element crosses a line, an animation fires, it plays out
 *                on its own clock. Scroll back up and nothing happens.
 *   linked     — the animation IS the scroll. Move the wheel one notch and the
 *                paragraph brightens one notch; scroll back and it dims again.
 *
 * The second one is what people mean by "the site feels alive" — you are
 * driving it rather than setting it off.
 *
 * `position: sticky` does the pinning, not JavaScript. It runs on the
 * compositor, survives resize for free, and needs no measurement.
 */
export function Origin() {
  const { eyebrow, title, body } = character.origin;
  const [active, setActive] = useState(0);

  return (
    <section id="origin" className="section relative">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* The rail. top-32 clears the fixed header; self-start is required
              or the grid stretches this cell to the full row height and
              sticky has nothing to move within. */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <Reveal>
                <p className="label-mono mb-6">{eyebrow}</p>
              </Reveal>
              <SplitText
                as="h2"
                text={title}
                stagger={0.018}
                className="font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.02em]"
              />

              <Reveal delay={0.1}>
                <div className="mt-10 h-px w-24 bg-ember-700" />
              </Reveal>

              {/* Progress through the account. Hidden below lg, where nothing
                  is pinned and a counter would just be a number floating in
                  the middle of the page. */}
              <div className="mt-8 hidden items-center gap-4 lg:flex">
                <span className="font-mono text-xs tabular-nums text-ink-faint">
                  {String(active + 1).padStart(2, "0")}
                  <span className="text-ink-disabled"> / {String(body.length).padStart(2, "0")}</span>
                </span>
                <span className="flex gap-1.5" aria-hidden>
                  {body.map((_, i) => (
                    <span
                      key={i}
                      className={`h-px w-6 transition-colors duration-500 ${
                        i <= active ? "bg-ember-500" : "bg-line"
                      }`}
                    />
                  ))}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            {body.map((paragraph, i) => (
              <Paragraph
                key={i}
                index={i}
                text={paragraph}
                onActive={setActive}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * One paragraph, dimmed until it reaches the reading zone.
 *
 * Opacity is mapped from scroll position, not toggled by a trigger, so the
 * text brightens continuously as it rises — and dims again on the way back up.
 * It never goes fully transparent: 0.28 keeps it legible for anyone who wants
 * to read ahead, and for the crawler reading the page with no scroll at all.
 */
function Paragraph({
  index,
  text,
  onActive,
}: {
  index: number;
  text: string;
  onActive: (i: number) => void;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    /* From "this paragraph's top touches the bottom of the viewport" to
       "its top reaches the middle". The reveal completes exactly as the text
       arrives where the eye already is. */
    offset: ["start end", "start center"],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0.28, 1]);
  const x = useTransform(scrollYProgress, [0, 1], [12, 0]);

  if (reduced) {
    return (
      <p className="measure mb-6 text-lg text-ink-muted last:mb-0">{text}</p>
    );
  }

  return (
    <motion.p
      ref={ref}
      style={{ opacity, x }}
      /* whileInView with the same middle band as the nav observer, so the
         counter in the rail and the highlighted paragraph always agree. */
      onViewportEnter={() => onActive(index)}
      viewport={{ margin: "-45% 0px -45% 0px" }}
      className="measure mb-6 text-lg text-ink-muted last:mb-0"
    >
      {text}
    </motion.p>
  );
}
