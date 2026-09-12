# VERDIGRIS

A superhero help portal. Visitors meet Verdigris through a conversational
interface, tell them what they need, and the request is delivered by email.

> _Nothing forgotten stays forgotten._

Built for the TechAscent machine test (WHITEMATRIX Software Solutions).

---

## Getting started

```bash
npm install
cp .env.example .env.local   # Windows PowerShell: copy .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Stack, and why

| Choice | Reason |
| --- | --- |
| **Next.js (App Router)** | The site and the two server routes it needs ship as one deployable unit. No separate backend to host. |
| **TypeScript** | The chat flow is a state machine; types make the illegal states unrepresentable. |
| **Tailwind v4** | CSS-first config means the design tokens in `app/globals.css` *are* the utility classes — one source of truth, no config file to drift. |
| **Framer Motion** | `useScroll` / `useVelocity` / `useSpring` give scroll-driven and physics-based motion, not just canned transitions. |
| **Lenis** | Normalises scroll so scroll-driven animation scrubs smoothly instead of stepping. Desktop only — native mobile momentum is already better. |
| **Raw WebGL** | One hand-written fragment shader for the hero. Importing a 3D engine to render a single quad would be ~150 kB for no benefit. |
| **`fetch`, no SDKs** | Groq and Resend are both a single POST. Their SDKs would be dependencies that wrap one request each. |

Five runtime dependencies total. Every one earns its place.

## Design system

All tokens live in [`app/globals.css`](app/globals.css) under `@theme`,
annotated with the reasoning behind each decision (why no pure black, why
sharp corner radii, why elevation is built from light rather than shadow,
which colour combinations fail WCAG AA and what to use instead).

## Environment variables

See [`.env.example`](.env.example). Keys are read exclusively inside
`app/api/*` route handlers, which execute on the server — nothing secret is
ever exposed to the client bundle.
