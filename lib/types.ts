export type StepId = "name" | "age" | "location" | "email" | "grievance";

export type VisitorData = Record<StepId, string>;

export type Message = {
  id: string;
  author: "hero" | "visitor";
  text: string;
};

/**
 * The conversation is always in exactly one of these phases. Making the phase
 * an explicit union rather than a set of booleans (isTyping && !isDone &&
 * hasSubmitted…) is what stops the UI from reaching a nonsense state — there
 * is no combination of flags to get wrong.
 */
export type ChatPhase =
  | "idle" // not started
  | "collecting" // working through the questions
  | "review" // everything gathered, waiting for the visitor to confirm
  | "submitting" // sending to the server
  | "done" // delivered
  | "error"; // send failed, recoverable

/**
 * How urgent a request is.
 *
 * Assessed by the model from what the visitor described, then clamped
 * server-side to this union — a model returning "VERY URGENT!!" must never
 * become a database value. Ordered most to least severe; the order is load
 * bearing, because it is what the inbox sorts on.
 */
export const PRIORITIES = ["critical", "high", "standard", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type Triage = {
  priority: Priority;
  /** One short clause explaining the call, for the email and the record. */
  reason: string;
};

export type ValidationResult =
  | { ok: true; value: string }
  | {
      ok: false;
      /** Shown to the visitor if the AI line can't be generated. Must read as
       *  something Verdigris would actually say. */
      message: string;
      /** Steer for the model instead of the human. Separate field because the
       *  two want different text: "That's a question, not a name" is a fine
       *  thing to say to a person, but as an instruction it makes the model
       *  re-ask without answering what they asked. */
      hint?: string;
    };

export type Submission = VisitorData & {
  submittedAt: string;
};
