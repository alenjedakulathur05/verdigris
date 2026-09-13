import type { AiResult } from "@/lib/ai/prompt";

/**
 * Google Gemini provider.
 *
 * Server-only. Plain fetch — this is one POST, and the official SDK would be a
 * dependency wrapping a single request.
 */

/**
 * Model ids on hosted APIs are not stable. gemini-2.0-flash was retired and
 * the API said so directly — "no longer available … use gemini-3.6-flash".
 * That's why this is an env var and not a literal buried in the request.
 */
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

/**
 * Reasoning is the enemy here: 3.6-flash deliberating before a three-sentence
 * reply blew past a 6s budget.
 *
 * The two generations spell this differently — 2.x takes a token budget
 * (thinkingBudget: 0 for none), 3.x replaced it with a discrete thinkingLevel.
 * Sending 2.x's field to 3.6 returns a flat "400 INVALID_ARGUMENT", so the
 * shape has to match the generation.
 */
const THINKING_CONFIG = /gemini-3/.test(MODEL)
  ? { thinkingLevel: "low" }
  : { thinkingBudget: 0 };

const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export async function completeWithGemini(
  input: { system: string; user: string; maxTokens: number },
  signal?: AbortSignal,
): Promise<AiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { reply: null, error: "GEMINI_API_KEY is not set" };

  try {
    const res = await fetch(endpoint(MODEL), {
      method: "POST",
      signal,
      headers: {
        // The key goes in a HEADER, not the ?key= query parameter Google's
        // quickstart shows. Query strings end up in server logs, proxy logs
        // and browser history — never put a secret in one.
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{ role: "user", parts: [{ text: input.user }] }],
        generationConfig: {
          temperature: 0.85,
          // Deliberately generous: recent models reason before answering and
          // both passes draw on this budget. The headroom is for the reasoning
          // underneath, not the reply itself.
          maxOutputTokens: input.maxTokens,
          thinkingConfig: THINKING_CONFIG,
        },
        // Verdigris receives messages about hardship and loss. Default filters
        // can refuse ordinary accounts of grief or conflict, which would drop
        // us to a canned line exactly when someone said something that matters.
        // Loosened one step, not disabled.
        safetySettings: [
          "HARM_CATEGORY_HARASSMENT",
          "HARM_CATEGORY_HATE_SPEECH",
          "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          "HARM_CATEGORY_DANGEROUS_CONTENT",
        ].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" })),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const error = `Gemini ${res.status} (model "${MODEL}"): ${detail.slice(0, 400)}`;
      console.error("[verdigris]", error);
      return { reply: null, error };
    }

    const json = (await res.json()) as {
      candidates?: {
        finishReason?: string;
        content?: { parts?: { text?: string }[] };
      }[];
      promptFeedback?: { blockReason?: string };
    };

    const candidate = json.candidates?.[0];
    const reply = candidate?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();

    if (!reply) {
      const error = [
        "Gemini returned no text",
        `finishReason=${candidate?.finishReason ?? "?"}`,
        `blockReason=${json.promptFeedback?.blockReason ?? "none"}`,
      ].join(" | ");
      console.error("[verdigris]", error);
      return { reply: null, error };
    }

    return { reply };
  } catch (cause) {
    const error =
      cause instanceof Error && cause.name === "TimeoutError"
        ? `Gemini timed out (model "${MODEL}")`
        : `Gemini request threw: ${String(cause)}`;
    console.error("[verdigris]", error);
    return { reply: null, error };
  }
}
