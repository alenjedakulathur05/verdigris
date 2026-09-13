/**
 * The atmosphere layer.
 *
 * One fixed, non-interactive plane behind the entire site. Everything here is
 * decoration, and it exists because a near-black page with no ambient depth
 * reads as "unstyled" no matter how good the typography on top of it is.
 *
 * Four layers, cheapest first:
 *
 *   grid    — a surveyor's grid, radially masked so it dissolves at the edges
 *             instead of stopping at a hard line
 *   blooms  — two slow patina lights, drifting on different periods so they
 *             never visibly loop
 *   grain   — SVG turbulence. Kills the banding that large soft gradients
 *             produce on 8-bit displays, and adds the paper texture that
 *             separates this from a glossy SaaS landing page
 *   vignette— pulls focus to the centre column
 *
 * This is a SERVER component. It has no state and no handlers, so it ships
 * zero JavaScript — the drift is CSS keyframes, which run on the compositor
 * and cost nothing on the main thread.
 */

/* feTurbulence rendered once by the browser and tiled. Inline as a data URI
   rather than a file so there is no extra request and it cannot 404. */
const GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="140" height="140" filter="url(#n)" opacity="0.55"/>
    </svg>`,
  );

export function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="atmos-grid absolute inset-0" />

      <div className="atmos-bloom atmos-bloom-a" />
      <div className="atmos-bloom atmos-bloom-b" />

      <div
        className="absolute inset-0 opacity-[0.045] mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN}")`, backgroundSize: "140px" }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 40%, rgb(7 10 9 / 0.55) 100%)",
        }}
      />
    </div>
  );
}
