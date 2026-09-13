import { NextResponse } from "next/server";
import { generateAck } from "@/lib/ai";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * One conversational turn.
 *
 * Called after every answer to generate Verdigris's in-character reaction, so
 * the exchange feels alive rather than scripted. Deliberately does NOT decide
 * what happens next — the client's state machine owns the flow, this only
 * supplies the words. That separation is what keeps the conversation reliable:
 * the model can't skip a question, loop, or forget to collect an email.
 *
 * Failure here is always non-fatal. The client falls back to its written line.
 */

export const runtime = "nodejs";

/** Looser than /api/request: this fires several times per conversation, but
 *  it still costs tokens, so it isn't unbounded. */
const LIMIT = { max: 25, windowMs: 60_000 };

type Body = {
  question?: unknown;
  answer?: unknown;
  valid?: unknown;
  reason?: unknown;
  avoid?: unknown;
};

export async function POST(request: Request) {
  if (rateLimit(clientKey(request, "turn"), LIMIT)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  const valid = body.valid === true;
  const reason = typeof body.reason === "string" ? body.reason.trim() : undefined;

  if (!question || !answer) {
    return NextResponse.json({ error: "Incomplete request" }, { status: 400 });
  }

  const avoid = Array.isArray(body.avoid)
    ? body.avoid
        .filter((v): v is string => typeof v === "string")
        .slice(-4)
        .map((v) => v.slice(0, 200))
    : undefined;

  const result = await generateAck({
    question: question.slice(0, 300),
    // Cap the untrusted field: this text goes into a model prompt, and an
    // unbounded one is both a cost and a prompt-injection surface.
    answer: answer.slice(0, 500),
    valid,
    reason: reason?.slice(0, 200),
    avoid,
  });

  if (!result.reply) {
    // 200 with a null line, not an error status: the client always has a
    // written fallback, and a red error in the console for something the user
    // will never perceive is noise.
    return NextResponse.json({ line: null });
  }

  return NextResponse.json({
    line: result.reply,
    ...(process.env.NODE_ENV === "development"
      ? { debug: { provider: result.provider, warnings: result.warnings } }
      : {}),
  });
}
