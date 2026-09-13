import { completeWithGemini } from "@/lib/ai/gemini";
import { completeWithGroq } from "@/lib/ai/groq";
import {
  ACK_SYSTEM_PROMPT,
  EXTRACT_SYSTEM_PROMPT,
  buildExtractPrompt,
  type ExtractResult,
  SYSTEM_PROMPT,
  buildAckPrompt,
  buildUserPrompt,
  type AiResult,
} from "@/lib/ai/prompt";
import type { VisitorData } from "@/lib/types";

export type { AiResult } from "@/lib/ai/prompt";

/**
 * Provider chains.
 *
 * Two chains, ordered differently on purpose:
 *
 *   reply — the closing message, once per conversation. Gemini first: it is
 *           slower (~3.5s) but writes noticeably better prose, and the visitor
 *           has just been told "hold on, I'm writing this down", so the pause
 *           reads as deliberate.
 *
 *   ack   — the short reaction after every answer, five-plus times per
 *           conversation. Groq first: ~0.6s versus Gemini's ~3.5s. Five
 *           sequential Gemini calls would make the exchange crawl, and there
 *           is no prose quality to win in fifteen words.
 *
 * Either chain falls through to the other provider, then to a written line, so
 * the conversation never visibly breaks.
 */

type Completer = (
  input: { system: string; user: string; maxTokens: number; json?: boolean },
  signal: AbortSignal,
) => Promise<AiResult>;

type Provider = { name: string; timeoutMs: number; run: Completer };

const GEMINI: Provider = {
  name: "gemini",
  timeoutMs: 9000,
  run: completeWithGemini,
};
const GROQ: Provider = { name: "groq", timeoutMs: 5000, run: completeWithGroq };

/** Short lines get short budgets — a stalled ack blocks the whole exchange. */
const GEMINI_FAST: Provider = { ...GEMINI, timeoutMs: 4000 };
const GROQ_FAST: Provider = { ...GROQ, timeoutMs: 3000 };

function orderFor(kind: "reply" | "ack"): Provider[] {
  const configured = process.env.AI_PROVIDER_ORDER?.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (configured?.length) {
    const table: Record<string, Provider> =
      kind === "reply"
        ? { gemini: GEMINI, groq: GROQ }
        : { gemini: GEMINI_FAST, groq: GROQ_FAST };
    return configured
      .map((n) => table[n])
      .filter((p): p is Provider => Boolean(p));
  }

  return kind === "reply" ? [GEMINI, GROQ] : [GROQ_FAST, GEMINI_FAST];
}

/**
 * Small fast models sometimes loop — "Please give me your age. Please give me
 * your age." Drops any sentence already present in the line.
 *
 * Punctuation and case are ignored when comparing, so "Got it. Got it!"
 * collapses too.
 */
function dedupeSentences(text: string): string {
  const parts = text.match(/[^.!?]+[.!?]*/g);
  if (!parts) return text;

  const seen: { part: string; norm: string }[] = [];
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const norm = part.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    if (seen.some((p) => p.norm === norm)) continue;
    seen.push({ part, norm });
  }

  return seen.map((p) => p.part).join(" ");
}

function sanitize(text: string): string {
  return dedupeSentences(text)
    .replace(/[\u2010\u2011\u2043]/g, "-") // exotic hyphens -> plain
    .replace(/[\u00a0\u202f\u2009]/g, " ") // no-break / thin -> space
    // Short completions sometimes run sentences together ("Aj.Got it.").
    .replace(/([.!?])([A-Z])/g, "$1 $2")
    .replace(/\s+\n/g, "\n")
    .trim()
    .replace(/^["'“”](.*)["'“”]$/s, "$1")
    .trim();
}

async function runChain(
  providers: Provider[],
  input: { system: string; user: string; maxTokens: number; json?: boolean },
): Promise<AiResult> {
  const errors: string[] = [];

  for (const provider of providers) {
    const result = await provider.run(
      input,
      AbortSignal.timeout(provider.timeoutMs),
    );

    if (result.reply) {
      // A chain that quietly degrades to its last link is worse than one that
      // fails loudly, because nobody notices for weeks.
      if (errors.length) {
        console.warn(
          `[verdigris] served by ${provider.name} after ${errors.length} failure(s): ${errors.join(" || ")}`,
        );
      }
      return {
        reply: sanitize(result.reply),
        provider: provider.name,
        ...(errors.length ? { warnings: errors } : {}),
      };
    }

    // A missing key is a configuration choice, not an outage.
    if (result.error && !result.error.includes("is not set")) {
      errors.push(`${provider.name}: ${result.error}`);
    }
  }

  return {
    reply: null,
    error: errors.length ? errors.join(" || ") : "no AI provider configured",
  };
}

/** The closing message, after the visitor describes what they need. */
export function generateReply(data: VisitorData): Promise<AiResult> {
  return runChain(orderFor("reply"), {
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(data),
    maxTokens: 2000,
  });
}

/** The in-character reaction to a single answer mid-conversation. */
export async function generateAck(input: {
  question: string;
  answer: string;
  valid: boolean;
  field?: string;
  reason?: string;
  avoid?: string[];
}): Promise<AiResult> {
  const result = await runChain(orderFor("ack"), {
    system: ACK_SYSTEM_PROMPT,
    user: buildAckPrompt(input),
    maxTokens: 700,
  });

  if (!result.reply) return result;

  /**
   * Verify the model's output rather than trusting the prompt.
   *
   * Told not to ask questions after a valid answer, it did anyway — "Noted,
   * Thrissur. What's the exact address?" The state machine ignores invented
   * questions, so the visitor gets asked something that is then abandoned:
   * worse than a plain scripted line.
   *
   * Instructions steer a model; they don't constrain it. Anything that must
   * not happen needs a check in code. Rejecting here returns null, and the
   * caller falls back to its written line.
   */
  if (input.valid && /\?/.test(result.reply)) {
    const error = `ack rejected: asked a question after a valid answer ("${result.reply}")`;
    console.warn("[verdigris]", error);
    return { reply: null, error };
  }

  // A reaction that runs long has stopped being a reaction.
  if (result.reply.length > 160) {
    const error = `ack rejected: too long (${result.reply.length} chars)`;
    console.warn("[verdigris]", error);
    return { reply: null, error };
  }

  return result;
}

/**
 * Decide whether a message answers the question, pull the value out of it, and
 * write the reaction — in one call.
 *
 * Returns null when the model is unavailable or its output can't be trusted,
 * so the caller can fall back to deterministic validation. Every field of the
 * parsed JSON is checked: a model returning `answered: true` with an empty or
 * absurd value is exactly the failure this exists to prevent, and trusting the
 * shape of model output is how you build the next bug.
 */
export async function extractAnswer(input: {
  field: string;
  question: string;
  answer: string;
  maxWords: number;
  maxChars: number;
  avoid?: string[];
}): Promise<ExtractResult | null> {
  // Uses the "reply" order (Gemini first) rather than the fast one. Asking a
  // small model for structured JSON costs it character — it produced "No city
  // supplied; please state the city you are in", which is not this character
  // speaking. Only two fields extract, so two slower turns buys back the voice.
  const result = await runChain(orderFor("reply"), {
    system: EXTRACT_SYSTEM_PROMPT,
    user: buildExtractPrompt(input),
    maxTokens: 900,
    json: true,
  });

  if (!result.reply) return null;

  let parsed: unknown;
  try {
    // Models sometimes fence JSON in markdown despite being told not to.
    const cleaned = result.reply
      .replace(/^\`\`\`(?:json)?/i, "")
      .replace(/\`\`\`$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn("[verdigris] extract: unparseable JSON:", result.reply.slice(0, 200));
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const o = parsed as Record<string, unknown>;

  const answered = o.answered === true;
  const value = typeof o.value === "string" ? o.value.trim() : "";
  const reply = typeof o.reply === "string" ? sanitize(o.reply) : "";

  if (!reply) return null;

  // Bounds stay in code. The model decides MEANING; it does not get to decide
  // that a 300-character sentence is someone's first name.
  if (answered) {
    if (!value) return null;
    if (value.length > input.maxChars) return null;
    if (value.split(/\s+/).length > input.maxWords) return null;
    // A reaction to a valid answer must never be a question — same guard as
    // generateAck, same reason: the state machine would abandon it.
    if (/\?/.test(reply)) {
      return { answered, value, reply: "" };
    }
  }

  return { answered, value, reply };
}
