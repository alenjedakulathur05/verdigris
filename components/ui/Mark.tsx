/**
 * The VERDIGRIS mark.
 *
 * A surveyor's plate split by a branching fissure, with growth pushing out of
 * the crack. It is the whole premise of the character in one shape: something
 * sealed and official, broken open, and alive because of it.
 *
 * Designed for the worst case first — 16px in a browser tab. That constraint
 * decided everything: a solid diamond rather than an outline (outlines fill in
 * and turn to mush at small sizes), one dominant fissure that survives on its
 * own, and two side branches that are legible at 32px and simply disappear
 * below that without leaving a smudge. A mark that needs 64px to read is not a
 * favicon, it is an illustration.
 *
 * `currentColor` on the body so callers set the colour with a text class and
 * the mark inherits it — one component for the header, the chat avatar and
 * the tab.
 */
export function Mark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={className}
    >
      {/* The plate */}
      <path d="M16 1.4 L30.6 16 L16 30.6 L1.4 16 Z" fill="currentColor" />

      {/* The fissure, cut out in the page's darkest surface so the plate reads
          as split rather than drawn on. */}
      <g
        stroke="var(--color-void, #080506)"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 3.6 L13.5 14 L17.7 16.9 L14.7 28.2" />
        <path d="M13.5 14 L8.8 11" />
        <path d="M17.7 16.9 L22.6 19.8" />
      </g>

      {/* Two nodes where the growth terminates — the only warm detail, and the
          thing that stops it reading as a simple broken shape. */}
      <circle cx="8.8" cy="11" r="1.5" fill="var(--color-volt-500, #ffe000)" />
      <circle cx="22.6" cy="19.8" r="1.5" fill="var(--color-volt-500, #ffe000)" />
    </svg>
  );
}
