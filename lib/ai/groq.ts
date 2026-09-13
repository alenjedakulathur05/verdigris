import type { AiResult } from "@/lib/ai/prompt";

/**
 * Groq provider.
 *
 * Fast — sub-second for short completions — which is why it leads for the
 * per-turn conversational lines even though Gemini writes the better closing
 * reply. Right model for the right job.
 */

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Verified against this account's /v1/models list rather than taken from
 * documentation: the Llama chat models are not served on this key at all,
 * which is why llama-3.3-70b-versatile and llama-3.1-8b-instant both 404'd.
 */
const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

export async function completeWithGroq(
  input: { system: string; user: string; maxTokens: number },
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
        // A tight cap starved the answer and returned empty completions.
        max_tokens: input.maxTokens,
        ...(MODEL.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
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
