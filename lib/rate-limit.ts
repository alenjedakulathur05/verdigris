/**
 * Minimal in-memory rate limiter, shared by both API routes.
 *
 * Honest limitation: counters live in the process, so on serverless each
 * instance keeps its own and a cold start clears them. This stops casual abuse
 * and accidental double-submits; it is not a defence against a determined
 * attacker. A real deployment would use a shared store (Upstash Redis, Vercel
 * KV). Knowing the difference matters more than pretending it's bulletproof.
 */

const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);

  // Opportunistic cleanup so the map can't grow without bound.
  if (buckets.size > 500) {
    for (const [k, times] of buckets) {
      if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return recent.length > max;
}

/** Best-effort client identity. Behind Vercel, x-forwarded-for is set by the
 *  platform edge, so it isn't client-spoofable the way a raw header would be. */
export function clientKey(request: Request, scope: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${scope}:${ip}`;
}
