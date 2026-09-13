import { SYSTEM_PROMPT, buildUserPrompt, type AiResult } from "@/lib/ai/prompt";
import type { VisitorData } from "@/lib/types";

/**
 * Groq provider (fallback).
 *
 * Kept as the second link in the chain rather than deleted: two independent
 * providers means a bad five minutes at one vendor doesn't drop the site to
 * its canned line.
 */

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Verified against this account's /v1/models list rather than taken from
 * documentation — the Llama chat models are not served on this key at all,
 * which is why llama-3.3-70b-versatile and llama-3.1-8b-instant both 404'd.
 *
 * gpt-oss-20b over 120b deliberately: three sentences in a defined voice is
 * not a reasoning task, and the visitor is watching a typing indicator.
 */
const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

export async function generateWithGroq(
  data: VisitorData,
  signal?: AbortSignal,
): Promise<AiResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { reply: null, error: "GROQ_API_KEY is not set" };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.8,
        // gpt-oss reasons before answering and both passes share this budget.
        // A tight cap (180) starved the answer and returned empty completions.
        max_tokens: 900,
        ...(MODEL.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(data) },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const error = `Groq ${res.status} (model "${MODEL}"): ${detail.slice(0, 400)}`;
      console.error("[verdigris]", error);
      return { reply: null, error };
    }

    const json = (await res.json()) as {
      choices?: {
        finish_reason?: string;
        message?: { content?: string; reasoning?: string };
      }[];
      usage?: Record<string, number>;
    };

    const choice = json.choices?.[0];
    const reply = choice?.message?.content?.trim();

    if (!reply) {
      const error = [
        "Groq returned an empty completion",
        `finish_reason=${choice?.finish_reason ?? "?"}`,
        `reasoningChars=${choice?.message?.reasoning?.length ?? 0}`,
        `usage=${JSON.stringify(json.usage ?? {})}`,
      ].join(" | ");
      console.error("[verdigris]", error);
      return { reply: null, error };
    }

    return { reply };
  } catch (cause) {
    const error =
      cause instanceof Error && cause.name === "TimeoutError"
        ? `Groq timed out (model "${MODEL}")`
        : `Groq request threw: ${String(cause)}`;
    console.error("[verdigris]", error);
    return { reply: null, error };
  }
}
