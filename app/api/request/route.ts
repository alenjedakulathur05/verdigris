import { NextResponse } from "next/server";
import { FALLBACK_REPLY } from "@/lib/chat-flow";
import { generateReply } from "@/lib/ai";
import { sendNotification } from "@/lib/email";
import type { VisitorData } from "@/lib/types";

/**
 * The only endpoint in the application.
 *
 * Receives a completed conversation, sends the notification email, and asks
 * Groq for Verdigris's closing line. Both API keys are read here, on the
 * server; neither is ever included in the client bundle.
 */

export const runtime = "nodejs";

/* ── Validation ────────────────────────────────────────────────────────────
   The chat engine already validates, but that runs in the browser where
   anyone can bypass it by POSTing here directly. Client validation is a
   courtesy to the user; server validation is the actual boundary. */

const LIMITS: Record<keyof VisitorData, number> = {
  name: 60,
  age: 3,
  location: 80,
  email: 254,
  grievance: 4000,
};

function parse(body: unknown): VisitorData | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const out = {} as VisitorData;

  for (const key of Object.keys(LIMITS) as (keyof VisitorData)[]) {
    const raw = b[key];
    if (typeof raw !== "string") return null;
    const value = raw.trim();
    if (value.length === 0 || value.length > LIMITS[key]) return null;
    out[key] = value;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) return null;
  return out;
}

/* ── Rate limiting ─────────────────────────────────────────────────────────
   This endpoint sends email and spends LLM tokens, so leaving it wide open
   would be an invitation.

   Honest limitation: this is in-memory, so on serverless each instance keeps
   its own counter and a restart clears it. It stops casual abuse and
   accidental double-submits, not a determined attacker. A real deployment
   would use a shared store (Upstash Redis, Vercel KV). Worth knowing the
   difference rather than pretending this is bulletproof. */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic cleanup so the map can't grow without bound.
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return recent.length > MAX_PER_WINDOW;
}

/* ── Handler ─────────────────────────────────────────────────────────────── */

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  const data = parse(body);
  if (!data) {
    return NextResponse.json({ error: "Incomplete request" }, { status: 400 });
  }

  const submittedAt = new Date();

  // Both start at once — the email doesn't wait on the model, and the model
  // doesn't wait on the mail server. Sequentially this would be the sum of
  // both latencies with the visitor watching a typing indicator.
  //
  // generateReply walks the provider chain (Gemini, then Groq) and enforces a
  // timeout per provider, so a slow model can never hold up the notification —
  // which is the part that actually has to work.
  const [emailResult, replyResult] = await Promise.allSettled([
    sendNotification(data, submittedAt),
    generateReply(data),
  ]);

  const emailSent =
    emailResult.status === "fulfilled" && emailResult.value === true;

  const ai =
    replyResult.status === "fulfilled"
      ? replyResult.value
      : { reply: null, error: String(replyResult.reason) };

  const reply = ai.reply ?? FALLBACK_REPLY;

  // The two failures are NOT equivalent, and treating them the same would be
  // the wrong call:
  //
  //   AI reply fails  → cosmetic. A written fallback line is already in
  //                     character, the visitor notices nothing, 200.
  //   Email fails     → the request never reached a human. Telling the visitor
  //                     it was delivered would be a lie, so: 500, and the chat
  //                     offers them a retry.
  if (!emailSent) {
    console.error("[verdigris] notification failed to send", {
      at: submittedAt.toISOString(),
    });
    return NextResponse.json({ error: "Delivery failed" }, { status: 500 });
  }

  return NextResponse.json({
    reply,
    // Development only. Never shipped to production, where leaking internal
    // provider detail to the client would be information disclosure.
    ...(process.env.NODE_ENV === "development"
      ? {
          debug: {
            provider: ai.provider ?? "fallback",
            ...(ai.warnings?.length ? { warnings: ai.warnings } : {}),
            ...(ai.error ? { error: ai.error } : {}),
          },
        }
      : {}),
  });
}
