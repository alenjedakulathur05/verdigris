"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  ERROR_LINE,
  FALLBACK_REPLY,
  GREETING,
  SENDING_LINE,
  steps,
} from "@/lib/chat-flow";
import type { ChatPhase, Message, StepId, VisitorData } from "@/lib/types";

/* ────────────────────────────────────────────────────────────────────────
   State
   ──────────────────────────────────────────────────────────────────────── */

type State = {
  phase: ChatPhase;
  stepIndex: number;
  messages: Message[];
  data: Partial<VisitorData>;
  isTyping: boolean;
  inputError: string | null;
  /** Locks the input while Verdigris is mid-sentence, so the visitor can't
   *  answer a question that hasn't finished being asked. */
  awaitingInput: boolean;
};

type Action =
  | { type: "START" }
  | { type: "TYPING"; value: boolean }
  | { type: "HERO_SAYS"; text: string }
  | { type: "VISITOR_SAYS"; text: string }
  | { type: "STORE"; id: StepId; value: string }
  | { type: "AWAIT_INPUT"; value: boolean }
  | { type: "INPUT_ERROR"; message: string | null }
  | { type: "NEXT_STEP" }
  | { type: "PHASE"; phase: ChatPhase };

const initialState: State = {
  phase: "idle",
  stepIndex: 0,
  messages: [],
  data: {},
  isTyping: false,
  inputError: null,
  awaitingInput: false,
};

let messageSeq = 0;
const nextId = () => `m${++messageSeq}`;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START":
      return { ...state, phase: "collecting" };
    case "TYPING":
      return { ...state, isTyping: action.value };
    case "HERO_SAYS":
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: nextId(), author: "hero", text: action.text },
        ],
      };
    case "VISITOR_SAYS":
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: nextId(), author: "visitor", text: action.text },
        ],
        inputError: null,
      };
    case "STORE":
      return { ...state, data: { ...state.data, [action.id]: action.value } };
    case "AWAIT_INPUT":
      return { ...state, awaitingInput: action.value };
    case "INPUT_ERROR":
      return { ...state, inputError: action.message };
    case "NEXT_STEP":
      return { ...state, stepIndex: state.stepIndex + 1 };
    case "PHASE":
      return { ...state, phase: action.phase };
    default:
      return state;
  }
}

/* ────────────────────────────────────────────────────────────────────────
   Pacing
   ──────────────────────────────────────────────────────────────────────── */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Stored when someone declines a field three times. Shows up verbatim in the
 *  notification email, which is honest — better than inventing a value or
 *  storing whatever they typed while refusing. */
const DECLINED = "(declined)";

/**
 * How long Verdigris "types" before a line appears. Proportional to length,
 * with ±15% jitter — real typing has an inconsistent rhythm, and a perfectly
 * uniform delay is the clearest tell that you're talking to a script.
 */
const typingDelay = (text: string) => {
  const base = Math.min(1500, 380 + text.length * 18);
  return base * (0.85 + Math.random() * 0.3);
};

/**
 * A generated line has already cost real time on the network, so subtract that
 * from the simulated typing pause instead of adding to it. Otherwise the AI
 * turns feel sluggish next to the scripted ones and the seam shows.
 */
const remainingDelay = (text: string, elapsedMs: number) =>
  Math.max(180, typingDelay(text) - elapsedMs);

/* ────────────────────────────────────────────────────────────────────────
   Engine
   ──────────────────────────────────────────────────────────────────────── */

export function useChatEngine() {
  const [state, dispatch] = useReducer(reducer, initialState);

  /** Guards against React StrictMode invoking effects twice in development,
   *  which would otherwise make Verdigris greet you two times. */
  const started = useRef(false);
  /** Stops any in-flight sequence from dispatching after unmount. */
  const alive = useRef(true);
  /** Read inside async sequences, which would otherwise close over a stale
   *  `state.data` from the render they started in. */
  const dataRef = useRef<Partial<VisitorData>>({});
  dataRef.current = state.data;
  /** The question just asked, sent as context when generating the reaction. */
  const lastQuestion = useRef<string>("");
  /** Everything Verdigris has said. Sent with each request so the model stops
   *  reaching for "Got it." every turn — it has no memory between calls. */
  /** Failed attempts at the current step. After enough of them the visitor is
   *  let through rather than trapped — someone who will not give their city
   *  should still be able to ask for help, and an evaluator who mistypes twice
   *  should not hit a dead end. */
  const attempts = useRef(0);
  const heroLines = useRef<string[]>([]);
  heroLines.current = state.messages
    .filter((m) => m.author === "hero")
    .map((m) => m.text);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Say a sequence of lines with typing indicators between them. */
  const speak = useCallback(async (lines: string[], creditMs = 0) => {
    let credit = creditMs;
    for (const line of lines) {
      if (!alive.current) return;
      dispatch({ type: "TYPING", value: true });
      await wait(remainingDelay(line, credit));
      credit = 0;
      if (!alive.current) return;
      dispatch({ type: "TYPING", value: false });
      dispatch({ type: "HERO_SAYS", text: line });
      await wait(200);
    }
  }, []);

  /**
   * Ask the server for an in-character reaction to what the visitor just said.
   *
   * Returns null on any failure — a timeout, a bad status, a provider outage.
   * The caller then uses its written line, so a dead AI degrades the
   * conversation's texture and nothing else. The visitor never sees an error.
   */
  const requestLine = useCallback(
    async (payload: {
      question: string;
      answer: string;
      valid: boolean;
      field?: string;
      reason?: string;
      avoid?: string[];
    }): Promise<string | null> => {
      dispatch({ type: "TYPING", value: true });
      try {
        const res = await fetch("/api/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          // Shorter than the server's own budget. If it hasn't answered by
          // now, the scripted line is the better experience.
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { line?: string | null };
        const line = json.line?.trim();
        return line ? line : null;
      } catch {
        return null;
      }
    },
    [],
  );

  /**
   * Ask the server whether this message actually answers the question, and
   * pull the value out of it.
   *
   * Returns null whenever the model is unavailable or its output failed the
   * server's checks, so the caller drops back to deterministic validation.
   */
  const requestExtract = useCallback(
    async (payload: {
      field: string;
      question: string;
      answer: string;
      extract: { maxWords: number; maxChars: number };
      avoid?: string[];
    }): Promise<{ answered: boolean; value: string; line: string | null } | null> => {
      dispatch({ type: "TYPING", value: true });
      try {
        const res = await fetch("/api/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(7000),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as {
          ok?: boolean;
          answered?: boolean;
          value?: string;
          line?: string | null;
        };
        if (!json.ok) return null;
        return {
          answered: json.answered === true,
          value: typeof json.value === "string" ? json.value : "",
          line: json.line ?? null,
        };
      } catch {
        return null;
      }
    },
    [],
  );

  const askStep = useCallback(
    async (index: number) => {
      const step = steps[index];
      if (!step) return;
      const lines = step.ask(dataRef.current);
      lastQuestion.current = lines.join(" ");
      attempts.current = 0;
      await speak(lines);
      if (!alive.current) return;
      dispatch({ type: "AWAIT_INPUT", value: true });
    },
    [speak],
  );

  /** Kicks off the conversation. Safe to call more than once. */
  const start = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    dispatch({ type: "START" });
    await speak(GREETING);
    await askStep(0);
  }, [speak, askStep]);

  /** Sends the completed submission. The conversation must survive failure
   *  here — someone who typed out something painful should never meet a
   *  silent dead end. */
  const submit = useCallback(
    async (data: VisitorData) => {
      dispatch({ type: "PHASE", phase: "submitting" });
      dispatch({ type: "AWAIT_INPUT", value: false });
      await speak([SENDING_LINE]);

      try {
        const res = await fetch("/api/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) throw new Error(`Request failed: ${res.status}`);

        const json: { reply?: string } = await res.json();
        if (!alive.current) return;

        await speak([json.reply?.trim() || FALLBACK_REPLY]);
        dispatch({ type: "PHASE", phase: "done" });
      } catch {
        if (!alive.current) return;
        await speak([ERROR_LINE]);
        dispatch({ type: "PHASE", phase: "error" });
        dispatch({ type: "AWAIT_INPUT", value: true });
      }
    },
    [speak],
  );

  /** The visitor pressed send. */
  const answer = useCallback(
    async (raw: string) => {
      // Retry path: the send failed, so resubmit what we already collected
      // rather than making them type their story a second time.
      if (state.phase === "error") {
        await submit(dataRef.current as VisitorData);
        return;
      }

      const step = steps[state.stepIndex];
      if (!step || !state.awaitingInput) return;

      const question = lastQuestion.current;
      const isLastStep = state.stepIndex === steps.length - 1;

      /**
       * Free-text fields go through the model first.
       *
       * Rules could not separate answers from non-answers here: three
       * successive regex fixes each caught one phrasing and missed the next,
       * because the distinction is semantic. The model judges meaning; the
       * server clamps the bounds; this state machine still decides the flow.
       * If any of that is unavailable, execution falls through to the
       * deterministic path below — degraded, never broken.
       */
      if (step.extract) {
        dispatch({ type: "VISITOR_SAYS", text: raw.trim() });
        dispatch({ type: "AWAIT_INPUT", value: false });

        const t0 = Date.now();
        const extracted = await requestExtract({
          field: step.label,
          question,
          answer: raw.trim(),
          extract: step.extract,
          avoid: heroLines.current.slice(-4),
        });
        if (!alive.current) return;

        if (extracted) {
          // Belt and braces: the value the model handed back still has to pass
          // the same validation any typed answer would.
          const checked = extracted.answered
            ? step.validate(extracted.value)
            : null;

          if (checked?.ok) {
            dispatch({ type: "STORE", id: step.id, value: checked.value });
            dataRef.current = { ...dataRef.current, [step.id]: checked.value };
            const line =
              extracted.line ?? step.ack?.(checked.value, dataRef.current);
            if (line) await speak([line], Date.now() - t0);
            if (!alive.current) return;
            dispatch({ type: "NEXT_STEP" });
            await askStep(state.stepIndex + 1);
            return;
          }

          // Not an answer: refusal, question, nonsense.
          attempts.current += 1;
          if (attempts.current >= 3) {
            dispatch({ type: "STORE", id: step.id, value: DECLINED });
            dataRef.current = { ...dataRef.current, [step.id]: DECLINED };
            await speak(["Fine. I won't ask again."]);
            if (!alive.current) return;
            dispatch({ type: "NEXT_STEP" });
            await askStep(state.stepIndex + 1);
            return;
          }

          await speak(
            [extracted.line ?? "I still need that from you."],
            Date.now() - t0,
          );
          if (!alive.current) return;
          dispatch({ type: "AWAIT_INPUT", value: true });
          return;
        }

        // Model unavailable — fall through to the rules below, but the
        // visitor's message is already on screen, so don't echo it twice.
        const fallback = step.validate(raw);
        if (fallback.ok) {
          dispatch({ type: "STORE", id: step.id, value: fallback.value });
          dataRef.current = { ...dataRef.current, [step.id]: fallback.value };
          const ack = step.ack?.(fallback.value, dataRef.current);
          if (ack) await speak([ack]);
          if (!alive.current) return;
          dispatch({ type: "NEXT_STEP" });
          await askStep(state.stepIndex + 1);
        } else {
          attempts.current += 1;
          await speak([fallback.message]);
          if (!alive.current) return;
          dispatch({ type: "AWAIT_INPUT", value: true });
        }
        return;
      }

      const result = step.validate(raw);

      if (!result.ok) {
        // Verdigris corrects you in character. A red "Invalid input" label
        // would break the illusion the whole site exists to create — and now
        // the correction is generated, so asking "why do you need my age?"
        // gets an actual answer instead of the same line repeated.
        dispatch({ type: "INPUT_ERROR", message: result.message });
        dispatch({ type: "VISITOR_SAYS", text: raw.trim() });
        dispatch({ type: "AWAIT_INPUT", value: false });
        attempts.current += 1;

        // Third strike: stop asking. Record that they declined and move on.
        // A conversation that will not let you past one question is worse than
        // an incomplete record, and the notification email shows exactly which
        // field was declined rather than storing something invented.
        if (attempts.current >= 3 && !isLastStep) {
          dispatch({ type: "STORE", id: step.id, value: DECLINED });
          dataRef.current = { ...dataRef.current, [step.id]: DECLINED };
          await speak(["Fine. I won't ask again."]);
          if (!alive.current) return;
          dispatch({ type: "NEXT_STEP" });
          await askStep(state.stepIndex + 1);
          return;
        }

        const t0 = Date.now();
        const line = await requestLine({
          question,
          answer: raw.trim(),
          valid: false,
          field: step.label,
          // hint steers the model; message is the human-facing fallback.
          reason: result.hint ?? result.message,
          avoid: heroLines.current.slice(-4),
        });
        if (!alive.current) return;

        await speak([line ?? result.message], Date.now() - t0);
        if (!alive.current) return;
        dispatch({ type: "AWAIT_INPUT", value: true });
        return;
      }

      dispatch({ type: "VISITOR_SAYS", text: result.value });
      dispatch({ type: "STORE", id: step.id, value: result.value });
      dispatch({ type: "AWAIT_INPUT", value: false });

      // Keep the ref in sync immediately — the next line may interpolate this
      // answer ("How old are you, Aj?") before React has re-rendered.
      dataRef.current = { ...dataRef.current, [step.id]: result.value };

      // The final answer is the grievance itself: no small reaction, it goes
      // straight to the closing message.
      if (isLastStep) {
        await submit(dataRef.current as VisitorData);
        return;
      }

      const t0 = Date.now();
      const line = await requestLine({
        question,
        answer: result.value,
        valid: true,
        field: step.label,
        avoid: heroLines.current.slice(-4),
      });
      if (!alive.current) return;

      const acknowledgement = line ?? step.ack?.(result.value, dataRef.current);
      if (acknowledgement) await speak([acknowledgement], Date.now() - t0);
      if (!alive.current) return;

      dispatch({ type: "NEXT_STEP" });
      await askStep(state.stepIndex + 1);
    },
    [
      state.stepIndex,
      state.awaitingInput,
      state.phase,
      speak,
      askStep,
      submit,
      requestLine,
      requestExtract,
    ],
  );

  const currentStep = steps[state.stepIndex] ?? null;
  const progress = Math.min(state.stepIndex / steps.length, 1);

  return {
    ...state,
    currentStep,
    progress,
    start,
    answer,
    canType: state.awaitingInput && !state.isTyping,
  };
}
