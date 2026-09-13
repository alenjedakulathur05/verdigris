import type { StepId, ValidationResult, VisitorData } from "@/lib/types";

/**
 * The conversation, as DATA.
 *
 * Every question Verdigris asks, how the answer is validated, and how they
 * react to it lives in this array. The state machine that runs it (see
 * hooks/useChatEngine.ts) contains no knowledge of names, ages or emails —
 * it just walks this list.
 *
 * Why that's worth doing: reordering the questions, adding one, or rewriting
 * the character's voice is a change to this file only. The engine, the UI and
 * the API route never move. It also means the validation rules are readable in
 * one place instead of scattered through JSX.
 */

export type ChatStep = {
  id: StepId;
  /** What Verdigris says. Multiple strings = multiple bubbles in sequence,
   *  which is how real people text — not one wall of prose. */
  ask: (data: Partial<VisitorData>) => string[];
  placeholder: string;
  multiline?: boolean;
  inputMode?: "text" | "numeric" | "email";
  autoComplete?: string;
  validate: (raw: string) => ValidationResult;
  /** In-character reaction to a valid answer. A form says "✓ Accepted";
   *  a character says something a person would say. */
  ack?: (value: string, data: Partial<VisitorData>) => string | null;
};

/** Deliberately permissive: this rejects genuinely malformed input, not
 *  unusual-but-real addresses. Over-strict email regexes reject valid
 *  addresses and are a classic accessibility failure. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const QUESTION_WORD =
  /^(who|what|when|where|why|how|which|will|would|can|could|should|shall|do|does|did|is|are|am|was|were|may|might|must|have|has|had)\b/i;

/**
 * Is this a question rather than an answer?
 *
 * Needed because a length check alone accepted "will my name be safe with u"
 * as someone's NAME, stored it, and then asked "How old are you, will my name
 * be safe with u?".
 *
 * The word-count condition matters: "Will" is a name, and rejecting it because
 * it appears in the question-word list would be a worse bug than the one this
 * fixes. A lone word is a name; a question word leading a sentence is a
 * question.
 */
function looksLikeQuestion(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.endsWith("?")) return true;
  return trimmed.split(/\s+/).length >= 3 && QUESTION_WORD.test(trimmed);
}

/** "my name is Aj" → "Aj". People answer conversationally; taking the whole
 *  sentence literally is what makes a chatbot feel stupid. */
function stripLeadIn(value: string): string {
  return value
    .replace(/^(hi|hey|hello|yo)[,!.\s]+/i, "")
    .replace(
      /^(my name is|my name's|i am|i'm|im|it is|it's|its|this is|call me|name is|name's|they call me)\s+/i,
      "",
    )
    .replace(/[.!,]+$/, "")
    .trim();
}

export const GREETING: string[] = [
  "You found it. Most people walk straight past this lot.",
  "I'm Verdigris. I deal with the things this city gave up on.",
];

export const steps: ChatStep[] = [
  {
    id: "name",
    ask: () => ["What do I call you?"],
    placeholder: "Your name",
    autoComplete: "given-name",
    validate: (raw) => {
      const input = raw.trim();
      if (looksLikeQuestion(input)) {
        return {
          ok: false,
          message: "That's a question, not a name.",
          hint: "They asked you something instead of answering. Answer their question briefly and honestly first, then ask for their name again.",
        };
      }
      const value = stripLeadIn(input);
      if (value.length < 2) {
        return { ok: false, message: "I need something to call you." };
      }
      if (value.length > 60) return { ok: false, message: "Shorter than that." };
      // A name is not a sentence. Without this, any short phrase becomes
      // someone's name and then gets quoted back at them in the next question.
      if (value.split(/\s+/).length > 4) {
        return { ok: false, message: "Just a name, not a sentence." };
      }
      return { ok: true, value };
    },
    ack: (value) => `${value}. Alright.`,
  },
  {
    id: "age",
    ask: (d) => [
      `How old are you, ${d.name ?? "friend"}?`,
      "I ask because it changes what I can actually do for you.",
    ],
    placeholder: "Your age",
    inputMode: "numeric",
    validate: (raw) => {
      const value = raw.trim();
      const n = Number(value);
      if (!/^\d{1,3}$/.test(value) || !Number.isFinite(n)) {
        return {
          ok: false,
          message: "That's not an age. Just the number.",
          ...(looksLikeQuestion(value)
            ? {
                hint: "They asked you something instead of answering. Answer their question briefly and honestly first, then ask for their age again.",
              }
            : {}),
        };
      }
      if (n < 1 || n > 120) {
        return { ok: false, message: "Try an age you've actually been." };
      }
      return { ok: true, value };
    },
    ack: (value) => (Number(value) < 18 ? "Young. Noted." : null),
  },
  {
    id: "location",
    ask: () => [
      "Where are you? A city is enough — I'm not going to turn up uninvited.",
    ],
    placeholder: "City, or nearest one",
    autoComplete: "address-level2",
    validate: (raw) => {
      const input = raw.trim();
      if (looksLikeQuestion(input)) {
        return {
          ok: false,
          message: "That's a question, not a place.",
          hint: "They asked you something instead of answering. Answer their question briefly and honestly first, then ask where they are again.",
        };
      }
      const value = stripLeadIn(input);
      if (value.length < 2) return { ok: false, message: "Somewhere. Anywhere." };
      if (value.length > 80) return { ok: false, message: "Just the city." };
      if (value.split(/\s+/).length > 6) {
        return { ok: false, message: "Just the city will do." };
      }
      return { ok: true, value };
    },
    ack: () => "Right. Long way from my block, but distance was never the problem.",
  },
  {
    id: "email",
    ask: () => [
      "If I need to reach you after tonight — where?",
    ],
    placeholder: "you@example.com",
    inputMode: "email",
    autoComplete: "email",
    validate: (raw) => {
      const input = raw.trim();
      // Pull the address out of whatever they wrote. "you can reach me at
      // aj@example.com" is a perfectly normal way to answer, and demanding a
      // bare address is the kind of rigidity that makes chat feel like a form.
      const found = input.match(/[^\s@]+@[^\s@]+\.[^\s@]{2,}/)?.[0];
      const value = found?.replace(/[.,;:!?]+$/, "") ?? "";

      if (!value || !EMAIL.test(value) || value.length > 254) {
        return { ok: false, message: "That won't reach you. Check it." };
      }
      return { ok: true, value };
    },
    ack: () => "Got it. I don't give it to anyone.",
  },
  {
    id: "grievance",
    ask: () => ["That's everything I need.", "So. Tell me. How can I help you?"],
    placeholder: "Take as long as you need…",
    multiline: true,
    validate: (raw) => {
      const value = raw.trim();
      if (value.length < 10) {
        return { ok: false, message: "Give me more than that. I can work with detail." };
      }
      if (value.length > 4000) {
        return { ok: false, message: "That's more than I can hold at once. Trim it down." };
      }
      return { ok: true, value };
    },
  },
];

/** Static fallback used if the AI reply can't be generated. The conversation
 *  must never visibly break — a character who stops mid-sentence because an
 *  API timed out is worse than one who says something simple. */
export const FALLBACK_REPLY =
  "I've got it. All of it. I'm going to sit with this tonight and then I'm going to do something about it — you'll hear from me at the address you gave me.";

export const SENDING_LINE = "Hold on. I'm writing this down.";

export const ERROR_LINE =
  "Something went wrong on my end — the message didn't send. That's mine to fix, not yours. Try once more?";
