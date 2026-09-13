"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/**
 * Smooth scroll.
 *
 * This single component changes how the whole site feels more than any
 * individual animation on it. Native wheel scrolling moves the page in hard
 * discrete jumps; Lenis interpolates between them, so every scroll-linked
 * animation on the page inherits that smoothness for free. It is the thing
 * award-site scrolling actually is.
 *
 * Three deliberate limits:
 *
 *   Desktop only. Touch devices already have momentum scrolling tuned by the
 *   OS, and overriding it makes a phone feel laggy and wrong — hijacking
 *   native touch scroll is one of the fastest ways to make a site worse.
 *   Never for reduced-motion. Smooth scrolling is motion the user did not ask
 *   for and cannot turn off from inside the page.
 *   CSS smooth scrolling is switched OFF while Lenis runs. Two smooth-scroll
 *   implementations fighting over the same scroll position is a genuinely
 *   horrible effect, and `scroll-behavior: smooth` in globals.css would
 *   otherwise do exactly that.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    const lenis = new Lenis({
      // ~1.15s to settle: long enough to read as weight, short enough that the
      // page still feels responsive rather than syrupy. Past about 1.4s it
      // stops feeling premium and starts feeling broken.
      duration: 1.15,
      // Expo-out — the same shape as --ease-bloom, so the scroll and the
      // reveals share one motion character instead of arguing.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    let frame = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    /* Anchor links have to go through Lenis too, or clicking a nav item jumps
       instantly while everything else glides. The offset clears the fixed
       header — without it the section title lands underneath the bar, which
       is the most common bug in any site with a sticky header. */
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest?.('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -96, duration: 1.4 });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
      root.style.scrollBehavior = previousBehavior;
    };
  }, []);

  return null;
}
