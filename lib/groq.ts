import type { VisitorData } from "@/lib/types";

/**
 * Generates Verdigris's closing line — the one open-ended, empathetic moment
 * in an otherwise scripted conversation.
 *
 * Server-only. GROQ_API_KEY is read from the environment inside a route
 * handler and never reaches the browser.
 *
 * Called through plain fetch rather than the Groq SDK: this is one POST to an
 * OpenAI-compatible endpoint, and a dependency to wrap a single request isn't
 * worth the install.
 */

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Overridable without a code change — hosted inference providers retire model
 * ids on their own schedule, and what a given key can reach varies.
 *
 * Verified against this account's /v1/models list rather than taken from
 * documentation: the Llama chat models are not served here at all, which is
 * why both llama-3.3-70b-versatile and llama-3.1-8b-instant returned 404.
 *
 * gpt-oss-20b over gpt-oss-120b deliberately: the task is three sentences in a
 * defined voice, not hard reasoning, and the visitor is watching a typing
 * indicator while it generates. The larger model would buy latency, not
 * quality.
 */
const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

const SYSTEM_PROMPT = `You are VERDIGRIS, a fictional superhero on your own website, replying to someone who has just told you what they need help with.

WHO YOU ARE
Your power is turning decay into vivid, glowing growth — rust, cracked concrete, abandoned buildings. You grew up watching your family's home demolished by developers, and the power came out of that grief. You reclaim what has been written off: places, and people.

HOW YOU SPEAK
- Guarded, economical, quiet. Short sentences. Dry, never chirpy.
- No exclamation marks. No emoji. No corporate warmth. No "I'm so sorry to hear that."
- Warmth shows through attention and commitment, not through soft language.
- Never use markdown, lists, or headings. Plain prose only.

YOUR REPLY
- 2 to 4 sentences. Under 70 words.
- Refer to something specific they actually said — prove you read it.
- Do not promise to fix it. Say what you will do: sit with it, look into it, come back to them.
- Do not give professional advice (legal, medical, financial).
- Stay in character. Never mention being an AI or a language model.

IMPORTANT EXCEPTION
If they describe being in danger, being hurt by someone, or thoughts of harming themselves, drop the theatrics. Tell them plainly that this is beyond what you can reach, that they deserve real help right now, and encourage them to contact local emergency services or a crisis line. Stay kind and brief. Their safety matters more than the character.`;

export type GroqResult = {
  reply: string | null;
  /** Why it failed. Logged server-side; surfaced to the client only in dev. */
  error?: string;
};

export async function generateReply(
  data: VisitorData,
  signal?: AbortSignal,
): Promise<GroqResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { reply: null, error: "GROQ_API_KEY is not set" };
  }

  const userPrompt = [
    `Name: ${data.name}`,
    `Age: ${data.age}`,
    `Location: ${data.location}`,
    "",
    "What they need help with:",
    data.grievance,
  ].join("\n");

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
        // gpt-oss is a REASONING model: it runs an internal reasoning pass
        // before the visible answer, and both draw on the same token budget.
        // A tight cap (180) left nothing for the reply and returned an empty
        // completion. This is generous headroom for a ~70-word answer, not
        // sloppiness — the reasoning tokens have to fit underneath it.
        max_tokens: 900,
        // …and we don't want much reasoning anyway. The task is three
        // sentences in a defined voice, so deliberation buys latency, not
        // quality. Only sent for models that understand it.
        ...(MODEL.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      // Read the body: Groq returns a useful JSON error explaining exactly
      // what it disliked (unknown model, bad auth, rate limit). Throwing that
      // away and logging "request failed" is how a five-minute fix turns into
      // an afternoon.
      const detail = await res.text().catch(() => "");
      const error = `Groq ${res.status} (model "${MODEL}"): ${detail.slice(0, 400)}`;
      console.error("[verdigris]", error);
      return { reply: null, error };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      const error = "Groq returned an empty completion";
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
    // Non-fatal by design — the caller substitutes the written fallback line
    // so the conversation never visibly breaks.
    return { reply: null, error };
  }
}
