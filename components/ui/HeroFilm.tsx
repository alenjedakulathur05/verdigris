"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * The hero backdrop.
 *
 * A seamless five-second loop filling the whole opening screen, with the page
 * content sitting on top of it.
 *
 * The awkward fact this component exists to manage: the footage is 9:16
 * portrait and a desktop screen is 16:9. With object-fit: cover the width
 * fills first, which means only about 31% of the frame's HEIGHT is ever on
 * screen — a horizontal slice. Which slice is therefore a design decision, not
 * a default, and `object-position: center 55%` is that decision: it keeps the
 * face and the glowing eyes in frame while letting the growth enter from the
 * bottom left. Plain `center` cuts the face in half. On a phone the aspect
 * ratios nearly match and almost the whole frame is visible.
 *
 * The 118% width on desktop is the other half of that. The character sits at
 * the horizontal centre of the source frame, and with the video exactly as
 * wide as the viewport there is no horizontal overflow to shift — so he lands
 * dead centre, directly behind the wordmark. Overflowing the video to the
 * right moves him to roughly 59% of the screen, clear of the headline, at the
 * cost of a little extra upscaling. On a phone the text sits over the middle
 * anyway, so it stays at 100%.
 *
 * Three things a background video has to get right, none of which are the
 * video:
 *
 *   1. Text over it must stay readable. The footage averages L≈62 where the
 *      headline sits, which is far too bright for white type, so the scrims in
 *      globals.css are load-bearing, not decoration.
 *   2. It must not play for people who asked it not to. prefers-reduced-motion
 *      gets a still frame. Vestibular triggers are not a preference to
 *      override, and a full-screen moving image is the worst case for them.
 *   3. It must not spend someone's mobile data on decoration — this is ~600 KB.
 *      Save-Data gets the still too.
 *
 * Both fallbacks are a real image, so the hero looks finished either way.
 */

export function HeroFilm() {
  const video = useRef<HTMLVideoElement>(null);
  /**
   * `null` means "not decided yet". Rendering the video during SSR and then
   * pulling it on the client would start a 600 KB download we immediately
   * abandon, so nothing motion-dependent renders until the client has answered.
   */
  const [play, setPlay] = useState<boolean | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Save-Data is absent from the TS DOM lib and from Safari — hence the cast
    // and the optional chain rather than a direct read.
    const conn = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    setPlay(!reduced && !conn?.saveData);
  }, []);

  useEffect(() => {
    if (!play) return;
    /* Autoplay is a request, not a guarantee — browsers and battery-saver
       modes refuse it even when muted. The promise REJECTS rather than throws,
       so it has to be caught explicitly or it surfaces as an unhandled
       rejection. If refused, the poster simply stays, which is fine. */
    video.current?.play().catch(() => {});
  }, [play]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {play === true ? (
        <video
          ref={video}
          /* muted AND playsInline are both required: muted because browsers
             refuse to autoplay sound, playsInline because iOS otherwise takes
             the video fullscreen the moment it plays. */
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/hero-poster.jpg"
          className="hero-film h-full w-full object-cover"
        >
          <source src="/hero.webm" type="video/webm" />
          <source src="/hero.mp4" type="video/mp4" />
        </video>
      ) : (
        <Image
          src="/hero-poster.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-film object-cover"
        />
      )}

      {/* Vignette: fades all four boundaries into the page's black so the
          footage has no visible edge and appears to be lit from within rather
          than pasted on. */}
      <div className="hero-vignette absolute inset-0" />

      {/* Legibility scrim. Separate from the vignette because it changes
          direction with the layout — downward on a phone where the text sits
          over the middle of the frame, leftward on desktop where the text sits
          beside the character. */}
      <div className="hero-scrim absolute inset-0" />
    </div>
  );
}
