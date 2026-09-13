import { NextResponse } from "next/server";
import { countRequests } from "@/lib/db";

/**
 * Public read endpoint — one number.
 *
 * This is the ONLY route on the site that reads from the database, and it is
 * deliberately incapable of returning anything but a count. There is no id
 * parameter, no list, no field selection: not because those are filtered out,
 * but because they were never built. An endpoint that cannot express a
 * dangerous query cannot be tricked into running one.
 *
 * Worth being explicit about why that matters here: the rows behind this
 * number contain names, ages, locations, emails and personal accounts of
 * things that went wrong in people's lives. The count is public. Everything
 * that produced it is not.
 */

export const runtime = "nodejs";
/* Never statically pre-rendered at build time — the number would be frozen at
   whatever it was when Vercel built the site. */
export const dynamic = "force-dynamic";

export async function GET() {
  const count = await countRequests();

  return NextResponse.json(
    { count },
    {
      headers: {
        /* Cached at Vercel's edge for a minute, and served stale for five
           while it refreshes behind the scenes. A counter does not need to be
           accurate to the second, and without this every page load would be a
           round trip to Postgres — which is how a decorative number turns into
           a database bill. */
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
