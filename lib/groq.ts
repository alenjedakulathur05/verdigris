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

/** Overridable without a code change — model names on hosted inference
 *  services get deprecated on their own schedule, not ours. */
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

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

export async function generateReply(
  data: VisitorData,
  signal?: AbortSignal,
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

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
        max_tokens: 180,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const reply = json.choices?.[0]?.message?.content?.trim();
    return reply && reply.length > 0 ? reply : null;
  } catch {
    // Any failure here is non-fatal by design — the caller substitutes the
    // written fallback line so the conversation never visibly breaks.
    return null;
  }
}
