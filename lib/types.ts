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
  | "submitting" // sending to the server
  | "done" // delivered
  | "error"; // send failed, recoverable

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

export type Submission = VisitorData & {
  submittedAt: string;
};
