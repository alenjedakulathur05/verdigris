import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * Coordinates in, a place name out.
 *
 * Why this is a server route rather than a fetch from the browser:
 *
 *   - the geocoding provider is an implementation detail. Swapping it later is
 *     a change to this file, not to a component.
 *   - the browser never talks to a third party about the visitor's position.
 *     Their coordinates go to our own origin and nowhere else that they can
 *     see in a network tab and reasonably object to.
 *   - it can be rate limited. A public endpoint that proxies an external API
 *     is otherwise free traffic for anyone who finds it.
 *
 * COORDINATES ARE NEVER STORED. They exist for the length of this request and
 * only the city name is returned. The site already declines to keep IP
 * addresses and user agents; keeping a GPS fix would undo that in one step,
 * and nothing about answering someone's request needs their precise position.
 */

export const runtime = "nodejs";

const LIMIT = { max: 10, windowMs: 60_000 };

export async function POST(request: Request) {
  if (rateLimit(clientKey(request, "geocode"), LIMIT)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { lat?: unknown; lon?: unknown };
  try {
    body = (await request.json()) as { lat?: unknown; lon?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lon = Number(body.lon);

  // Range check, not just a type check: NaN and a longitude of 900 both need
  // to be refused before they reach anyone else's API.
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  /* Deliberately rounded to ~1km before it leaves our server. City-level is
     all this feature needs, and there is no reason to hand a third party a
     more precise fix than the answer requires. */
  const coarseLat = lat.toFixed(2);
  const coarseLon = lon.toFixed(2);

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coarseLat}&longitude=${coarseLon}&localityLanguage=en`,
      { signal: AbortSignal.timeout(7000) },
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
    }

    const json = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };

    /* Fall through the fields in order of usefulness. `city` is empty
       surprisingly often outside large towns, and a visitor being told "we
       couldn't find you" when the country is perfectly well known would be a
       silly failure. */
    const place =
      json.city?.trim() ||
      json.locality?.trim() ||
      json.principalSubdivision?.trim() ||
      json.countryName?.trim() ||
      "";

    if (!place) {
      return NextResponse.json({ error: "No place found" }, { status: 404 });
    }

    // Clamped to the same bound the location step enforces on typed answers,
    // so a geocoded value can never bypass a rule a typed one obeys.
    return NextResponse.json({ place: place.slice(0, 80) });
  } catch {
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
}
