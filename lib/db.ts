import type { VisitorData } from "@/lib/types";

/**
 * Persistence — Supabase Postgres over its REST interface.
 *
 * Two choices worth defending:
 *
 * NO SDK. This is one HTTP POST. @supabase/supabase-js is ~40 KB of client
 * that would exist to build a request we can write in twelve lines, and the
 * project's whole dependency argument is that five runtime packages is a
 * deliberate number. Same reasoning as the Groq, Gemini and Resend providers,
 * all of which are plain fetch.
 *
 * NEVER FATAL. Saving a row is valuable, but the brief's actual requirement is
 * that the request reaches a human by email. If the database is down, the
 * visitor must still get their reply and the notification must still send. So
 * every failure here is logged and swallowed, and the caller treats the result
 * as advisory. Wiring the database in as a hard dependency would mean a
 * Supabase outage takes down a feature that does not need it.
 */

export type SaveInput = {
  data: VisitorData;
  submittedAt: Date;
  /** What Verdigris said back — worth keeping so the record is the whole
   *  exchange, not half of it. */
  reply: string;
  /** Which model answered, or "fallback". Useful when a reply reads oddly and
   *  you want to know whether a model wrote it at all. */
  provider: string;
  emailSent: boolean;
};

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * The SERVICE ROLE key, not the anon key.
 *
 * The anon key is designed to be public and is governed by row-level security.
 * The service role key bypasses RLS entirely, which is exactly why it must
 * never be prefixed NEXT_PUBLIC_ and never be imported into a client
 * component. It is read here, in a module only ever reached from a route
 * handler, so it cannot end up in the browser bundle.
 */
function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

export async function saveRequest(input: SaveInput): Promise<SaveResult> {
  const cfg = config();
  // Not configured is a deployment choice, not an error. The site works
  // without a database; it just doesn't keep a record.
  if (!cfg) return { ok: false, error: "SUPABASE_URL / SERVICE_ROLE_KEY not set" };

  const age = Number.parseInt(input.data.age, 10);

  /**
   * Only what the visitor deliberately typed, plus operational fields.
   *
   * Deliberately NOT stored: IP address, user agent, referrer, any device
   * fingerprint. None of it is needed to answer someone's request, and the
   * right amount of personal data to hold is the least you can do the job
   * with. "We might want it later" is not a reason to collect it.
   */
  const row = {
    name: input.data.name,
    age: Number.isFinite(age) ? age : null,
    location: input.data.location,
    email: input.data.email,
    grievance: input.data.grievance,
    reply: input.reply,
    ai_provider: input.provider,
    email_sent: input.emailSent,
    created_at: input.submittedAt.toISOString(),
  };

  try {
    const res = await fetch(`${cfg.url}/rest/v1/requests`, {
      method: "POST",
      // A hung database must not hold the visitor's reply hostage. Nine
      // seconds is already generous for a single insert.
      signal: AbortSignal.timeout(9000),
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
        // Ask PostgREST to echo the inserted row back so we get the generated
        // id. Without this the response body is empty.
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const error = `Supabase ${res.status}: ${detail.slice(0, 300)}`;
      console.error("[verdigris]", error);
      return { ok: false, error };
    }

    const rows = (await res.json()) as { id?: string }[];
    const id = rows?.[0]?.id;
    if (!id) return { ok: false, error: "Supabase returned no row" };

    return { ok: true, id };
  } catch (cause) {
    const error =
      cause instanceof Error && cause.name === "TimeoutError"
        ? "Supabase insert timed out"
        : `Supabase insert threw: ${String(cause)}`;
    console.error("[verdigris]", error);
    return { ok: false, error };
  }
}
