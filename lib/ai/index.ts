import { generateWithGemini } from "@/lib/ai/gemini";
import { generateWithGroq } from "@/lib/ai/groq";
import type { AiResult } from "@/lib/ai/prompt";
import type { VisitorData } from "@/lib/types";

export type { AiResult } from "@/lib/ai/prompt";

/**
 * Provider chain for Verdigris's closing line.
 *
 * Tries each provider in order and returns the first usable reply. If they all
 * fail, the caller substitutes the written fallback, so the conversation never
 * visibly breaks.
 *
 * Order is configurable (AI_PROVIDER_ORDER="groq,gemini") so a provider can be
 * demoted or dropped without a code change. Providers with no API key are
 * skipped rather than counted as failures.
 */

type Provider = {
  name: string;
  /** Per-provider budget. The whole chain must still fit inside the request. */
  timeoutMs: number;
  run: (data: VisitorData, signal: AbortSignal) => Promise<AiResult>;
};

const PROVIDERS: Record<string, Provider> = {
  // Gemini gets the larger slice as the primary; Groq is fast enough that the
  // chain still finishes well inside the request even if the first one burns
  // its whole budget before failing.
  gemini: { name: "gemini", timeoutMs: 9000, run: generateWithGemini },
  groq: { name: "groq", timeoutMs: 5000, run: generateWithGroq },
};

const DEFAULT_ORDER = ["gemini", "groq"];

function resolveOrder(): Provider[] {
  const configured = process.env.AI_PROVIDER_ORDER?.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return (configured?.length ? configured : DEFAULT_ORDER)
    .map((name) => PROVIDERS[name])
    .filter((p): p is Provider => Boolean(p));
}

/**
 * Language models occasionally emit typographic characters that look wrong in
 * a chat bubble — non-breaking hyphens mid-word ("land‑lord"), narrow no-break
 * spaces. Normalising them is a two-line fix for something that would
 * otherwise read as a rendering bug.
 */
function sanitize(text: string): string {
  return text
    .replace(/[‐‑⁃]/g, "-") // exotic hyphens → plain hyphen
    .replace(/[   ]/g, " ") // no-break / thin spaces → space
    .replace(/\s+\n/g, "\n")
    .trim();
}

export async function generateReply(data: VisitorData): Promise<AiResult> {
  const errors: string[] = [];

  for (const provider of resolveOrder()) {
    const result = await provider.run(
      data,
      AbortSignal.timeout(provider.timeoutMs),
    );

    if (result.reply) {
      // Log which provider served the reply, and note any that were tried and
      // failed before it — a chain that quietly degrades to its last link is
      // worse than one that fails loudly, because nobody notices for weeks.
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

    // A missing key is a configuration choice, not an outage — don't report it
    // as a failure when another provider is configured and working.
    if (result.error && !result.error.includes("is not set")) {
      errors.push(`${provider.name}: ${result.error}`);
    }
  }

  return {
    reply: null,
    error: errors.length ? errors.join(" || ") : "no AI provider configured",
  };
}
