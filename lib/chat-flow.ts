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
      const value = raw.trim();
      if (value.length < 2) return { ok: false, message: "I need something to call you." };
      if (value.length > 60) return { ok: false, message: "Shorter than that." };
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
        return { ok: false, message: "That's not an age. Just the number." };
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
      const value = raw.trim();
      if (value.length < 2) return { ok: false, message: "Somewhere. Anywhere." };
      if (value.length > 80) return { ok: false, message: "Just the city." };
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
      const value = raw.trim();
      if (!EMAIL.test(value)) {
        return { ok: false, message: "That won't reach you. Check it." };
      }
      if (value.length > 254) return { ok: false, message: "That won't reach you. Check it." };
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
