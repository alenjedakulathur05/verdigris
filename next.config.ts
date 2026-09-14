import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * These are the cheapest, highest-leverage security work available to a static
 * site: every one is a browser-enforced restriction that holds even if the
 * application code has a bug. Application logic can be wrong; a header that
 * forbids framing cannot be argued with by a mistake in a component.
 *
 * Verifiable from outside at securityheaders.com — which is the point. Claims
 * about security are worth nothing; a header either appears in the response or
 * it does not.
 */

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy — what the page is allowed to load and execute.
 *
 * This is the one header that stops a cross-site scripting bug from becoming a
 * breach: even if an attacker managed to inject a <script src="evil.com">, the
 * browser refuses to fetch it, because evil.com is not in the policy.
 *
 * Two honest concessions, and it is worth being able to explain them rather
 * than pretending the policy is perfect:
 *
 *   'unsafe-inline' for scripts — Next's App Router injects inline bootstrap
 *     and hydration data into the HTML. Removing this needs per-request
 *     nonces, which are incompatible with the static prerendering this site
 *     relies on for speed.
 *   'unsafe-inline' for styles — Tailwind and Framer Motion both write inline
 *     style attributes; every animation on the site sets one.
 *
 *   'unsafe-eval' is DEV ONLY. React Fast Refresh needs it; production does
 *     not, and shipping it would be the single worst line in this file.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // next/font self-hosts, so no external font origin is needed at all.
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  // The browser talks ONLY to our own origin. Reverse geocoding happens
  // server-side precisely so no third party appears here.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Clickjacking: this page may not be embedded anywhere, by anyone.
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework. Version fingerprints are how automated
  // scanners decide which exploits to try.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          /* Legacy twin of frame-ancestors, for browsers that predate CSP
             level 2. Belt and braces on the one attack that can be mounted
             entirely from someone else's site. */
          { key: "X-Frame-Options", value: "DENY" },
          /* Stops the browser guessing a file is executable when we said it
             was not — the root of a whole family of upload attacks. */
          { key: "X-Content-Type-Options", value: "nosniff" },
          /* Send the full URL only to ourselves. Our paths are harmless, but
             leaking them to third parties by default is a habit worth not
             having. */
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          /* Switch off every device capability except the one we actually
             use. Geolocation is "self" because the chat offers it; camera,
             microphone and payment are refused outright, so a compromised
             dependency cannot even ask. */
          {
            key: "Permissions-Policy",
            value: [
              "geolocation=(self)",
              "camera=()",
              "microphone=()",
              "payment=()",
              "usb=()",
              "magnetometer=()",
              "accelerometer=()",
              "gyroscope=()",
              "interest-cohort=()",
            ].join(", "),
          },
          /* Never speak to this site over plain HTTP again — for two years,
             including subdomains. Geolocation also requires a secure context,
             so this protects a feature as well as the transport. */
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
      {
        /* No endpoint should be indexed, ever. */
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      /**
       * Never cache the routes that carry personal data.
       *
       * Listed individually rather than as /api/:path* on purpose: /api/stats
       * is deliberately edge-cached for a minute, and a blanket no-store here
       * would silently undo that and send every counter render back to
       * Postgres.
       *
       * A cached /api/request response would be one visitor's reply served to
       * the next person through a shared proxy. That is the failure this
       * prevents.
       */
      ...["/api/request", "/api/turn", "/api/geocode"].map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      })),
    ];
  },
};

export default nextConfig;
