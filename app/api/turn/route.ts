import { NextResponse } from "next/server";
import { extractAnswer, generateAck } from "@/lib/ai";
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
  field?: unknown;
  extract?: unknown;
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
  const field = typeof body.field === "string" ? body.field.trim().slice(0, 120) : undefined;

  if (!question || !answer) {
    return NextResponse.json({ error: "Incomplete request" }, { status: 400 });
  }

  const extract =
    typeof body.extract === "object" && body.extract !== null
      ? (body.extract as { maxWords?: unknown; maxChars?: unknown })
      : null;

  const avoid = Array.isArray(body.avoid)
    ? body.avoid
        .filter((v): v is string => typeof v === "string")
        .slice(-4)
        .map((v) => v.slice(0, 200))
    : undefined;

  // Extraction path: the model judges whether this is an answer at all and
  // pulls the value out. Bounds are clamped server-side rather than trusted
  // from the client.
  if (extract && field) {
    const res = await extractAnswer({
      field,
      question: question.slice(0, 300),
      answer: answer.slice(0, 500),
      maxWords: Math.min(Number(extract.maxWords) || 4, 12),
      maxChars: Math.min(Number(extract.maxChars) || 60, 200),
      avoid,
    });

    // null means unusable output — the client falls back to its own rules.
    if (!res) return NextResponse.json({ ok: false });

    return NextResponse.json({
      ok: true,
      answered: res.answered,
      value: res.value,
      line: res.reply || null,
    });
  }

  const result = await generateAck({
    question: question.slice(0, 300),
    // Cap the untrusted field: this text goes into a model prompt, and an
    // unbounded one is both a cost and a prompt-injection surface.
    answer: answer.slice(0, 500),
    valid,
    field,
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
