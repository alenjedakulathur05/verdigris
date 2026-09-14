"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { ChatTrigger } from "@/components/chat/ChatTrigger";
import { Mark } from "@/components/ui/Mark";
import { useActiveSection } from "@/hooks/useActiveSection";
import { EASE_BLOOM } from "@/lib/motion";

/**
 * Fixed header.
 *
 * Two behaviours worth calling out:
 *
 *   Hide on scroll down, reveal on scroll up. Reading downward is the one
 *   moment a visitor definitively does not want a bar over the content;
 *   scrolling up is the universal "I want the controls back" gesture. The
 *   alternative — a bar permanently occupying 64px of a phone screen — costs
 *   more than it gives.
 *
 *   The backdrop only appears once you have left the hero. Over the hero the
 *   header is transparent so the section reads full-bleed; the moment there
 *   is content behind it, it earns a surface so the text stays legible.
 *
 * The direction check reads the previous value from the motion value itself
 * rather than from state, so this component re-renders only when `hidden`
 * actually flips — not on every scroll frame.
 */

const NAV = [
  { id: "origin", label: "Origin" },
  { id: "powers", label: "Capability" },
  { id: "mission", label: "Mission" },
];

const SECTION_IDS = NAV.map((n) => n.id);

export function Header() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const active = useActiveSection(SECTION_IDS);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 24);
    // The 8px threshold swallows trackpad jitter, which would otherwise make
    // the bar flicker while the page is nominally still.
    if (Math.abs(y - prev) < 8) return;
    setHidden(y > prev && y > 220);
  });

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: hidden ? -96 : 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE_BLOOM }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        className={`border-b transition-colors duration-500 ${
          solid
            ? "border-line-subtle bg-void/80 backdrop-blur-md"
            : "border-transparent"
        }`}
      >
        <div className="container-page flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
          <a
            href="#main"
            className="group flex items-center gap-2.5"
            aria-label="Verdigris — home"
          >
            {/* One SVG shared by the header, the chat avatar and the browser
                tab, so the mark is identical everywhere rather than three
                near-misses. */}
            <Mark
              size={20}
              className="text-ember-500 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-[18deg]"
            />
            <span className="font-display text-sm font-black tracking-[0.22em] text-ink">
              VERDIGRIS
            </span>
          </a>

          <nav aria-label="Sections" className="hidden md:block">
            <ul className="flex items-center gap-8">
              {NAV.map((item) => {
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={isActive ? "true" : undefined}
                      className={`label-mono relative py-2 transition-colors duration-300 hover:text-ember-300 ${
                        isActive ? "text-ember-300" : ""
                      }`}
                    >
                      {item.label}
                      {/* Underline grows from the left rather than fading in.
                          scaleX only — no layout, no paint, and it reads as
                          the marker travelling with you down the page. */}
                      <span
                        aria-hidden
                        className={`absolute -bottom-0.5 left-0 h-px w-full origin-left bg-ember-500 transition-transform duration-500 ease-bloom ${
                          isActive ? "scale-x-100" : "scale-x-0"
                        }`}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-2 lg:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember-500" />
              </span>
              <span className="label-mono">Listening</span>
            </span>
            <ChatTrigger size="sm">Ask for help</ChatTrigger>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
