import { NextResponse } from "next/server";
import { classifyPriority, generateReply } from "@/lib/ai";
import type { AiResult } from "@/lib/ai";
import { saveRequest } from "@/lib/db";
import { FALLBACK_REPLY } from "@/lib/chat-flow";
import { sendNotification } from "@/lib/email";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import type { VisitorData } from "@/lib/types";

/**
 * The completed conversation.
 *
 * Sends the notification email and asks for Verdigris's closing line. Both API
 * keys are read here, on the server; neither reaches the client bundle.
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

/* ── Handler ─────────────────────────────────────────────────────────────── */

export async function POST(request: Request) {
  if (rateLimit(clientKey(request, "request"), { max: 3, windowMs: 60_000 })) {
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

  /**
   * Triage FIRST, because the email depends on it.
   *
   * The priority goes in the subject line, so the notification cannot be sent
   * until the band is known — these two genuinely are sequential and pretending
   * otherwise would mean emailing first and then knowing how urgent it was.
   *
   * It runs concurrently with the closing reply instead, which needs nothing
   * from it. classifyPriority never throws and never returns null, so there is
   * no failure path to handle here: an unreachable model yields "standard".
   */
  const [triage, replyResult] = await Promise.all([
    classifyPriority(data),
    /* The return type is annotated, not inferred. Without it TypeScript widens
       the union to "AiResult | {reply, error}" — and that second shape has no
       `provider`, so reading ai.provider below stops compiling. Telling the
       catch what it must produce keeps both branches the same shape. */
    generateReply(data).catch(
      (e: unknown): AiResult => ({ reply: null, error: String(e) }),
    ),
  ]);

  const emailResult = await Promise.allSettled([
    sendNotification(data, submittedAt, triage),
  ]).then((r) => r[0]);

  const emailSent =
    emailResult.status === "fulfilled" && emailResult.value === true;

  const ai = replyResult;

  const reply = ai.reply ?? FALLBACK_REPLY;

  /**
   * Persist the record.
   *
   * Deliberately AFTER the other two rather than alongside them in the same
   * allSettled, because the row is only worth writing once we know what
   * Verdigris actually said and whether the email got out — a half-populated
   * row would need a second write to finish, and two writes is worse than one
   * slightly later one.
   *
   * Deliberately awaited rather than fired and forgotten: on Vercel the
   * serverless function can be frozen the instant the response is returned,
   * which kills any promise still in flight. "Fire and forget" silently
   * becomes "fire and lose" in production, and you find out weeks later when
   * the table is emptier than the inbox.
   */
  const saved = await saveRequest({
    data,
    submittedAt,
    reply,
    provider: ai.provider ?? "fallback",
    emailSent,
    triage,
  });

  if (!saved.ok) {
    // Logged, never surfaced. The visitor's request DID reach a human; whether
    // we also filed a copy is our problem, not theirs.
    console.error("[verdigris] could not store request:", saved.error);
  }

  // The two failures are NOT equivalent, and treating them the same would be
  // the wrong call:
  //
  //   AI reply fails  → cosmetic. The written fallback is already in character,
  //                     the visitor notices nothing, 200.
  //   Email fails     → the request never reached a human. Telling the visitor
  //                     it was delivered would be a lie, so: 500, and the chat
  //                     offers a retry that resends without retyping.
  if (!emailSent) {
    console.error("[verdigris] notification failed to send", {
      at: submittedAt.toISOString(),
    });
    return NextResponse.json({ error: "Delivery failed" }, { status: 500 });
  }

  return NextResponse.json({
    reply,
    // Shown to the visitor so they can see how their request was classified —
    // being told "this was logged as critical" is materially reassuring when
    // you have just described something frightening.
    priority: triage.priority,
    priorityReason: triage.reason,
    // Development only. In production, leaking internal provider detail to the
    // client would be information disclosure.
    ...(process.env.NODE_ENV === "development"
      ? {
          debug: {
            provider: ai.provider ?? "fallback",
            stored: saved.ok ? saved.id : `failed: ${saved.error}`,
            ...(ai.warnings?.length ? { warnings: ai.warnings } : {}),
            ...(ai.error ? { error: ai.error } : {}),
          },
        }
      : {}),
  });
}
