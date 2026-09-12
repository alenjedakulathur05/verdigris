"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  ERROR_LINE,
  FALLBACK_REPLY,
  GREETING,
  SENDING_LINE,
  steps,
} from "@/lib/chat-flow";
import type {
  ChatPhase,
  Message,
  StepId,
  VisitorData,
} from "@/lib/types";

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

/**
 * How long Verdigris "types" before a line appears.
 *
 * Proportional to length, with ±15% jitter. The jitter is the important part:
 * real typing has an inconsistent rhythm, and a perfectly uniform delay is the
 * single clearest tell that you're talking to a script. Capped so long lines
 * never feel like a hang.
 */
const typingDelay = (text: string) => {
  const base = Math.min(1500, 380 + text.length * 18);
  return base * (0.85 + Math.random() * 0.3);
};

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

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Say a sequence of lines with typing indicators between them. */
  const speak = useCallback(async (lines: string[]) => {
    for (const line of lines) {
      if (!alive.current) return;
      dispatch({ type: "TYPING", value: true });
      await wait(typingDelay(line));
      if (!alive.current) return;
      dispatch({ type: "TYPING", value: false });
      dispatch({ type: "HERO_SAYS", text: line });
      await wait(200);
    }
  }, []);

  const askStep = useCallback(
    async (index: number) => {
      const step = steps[index];
      if (!step) return;
      await speak(step.ask(dataRef.current));
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
   *  here — a visitor who typed out something painful should never be met
   *  with a silent dead end. */
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

      const result = step.validate(raw);

      if (!result.ok) {
        // Verdigris corrects you in character. A red "Invalid input" label
        // would break the illusion the entire site exists to create.
        dispatch({ type: "INPUT_ERROR", message: result.message });
        dispatch({ type: "VISITOR_SAYS", text: raw.trim() });
        dispatch({ type: "AWAIT_INPUT", value: false });
        await speak([result.message]);
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

      const acknowledgement = step.ack?.(result.value, dataRef.current);
      if (acknowledgement) await speak([acknowledgement]);
      if (!alive.current) return;

      const isLast = state.stepIndex === steps.length - 1;
      if (isLast) {
        await submit(dataRef.current as VisitorData);
      } else {
        dispatch({ type: "NEXT_STEP" });
        await askStep(state.stepIndex + 1);
      }
    },
    [state.stepIndex, state.awaitingInput, state.phase, speak, askStep, submit],
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
