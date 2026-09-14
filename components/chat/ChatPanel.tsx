"use client";

import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Bubble, TypingIndicator } from "@/components/chat/Bubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { PriorityBadge } from "@/components/chat/PriorityBadge";
import { ReviewCard } from "@/components/chat/ReviewCard";
import { Check, Close } from "@/components/ui/Icons";
import { Mark } from "@/components/ui/Mark";
import { EASE_BLOOM } from "@/lib/motion";
import type { useChatEngine } from "@/hooks/useChatEngine";

type Engine = ReturnType<typeof useChatEngine>;

export function ChatPanel({
  engine,
  onClose,
}: {
  engine: Engine;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * Sheet state, phone only.
   *
   * `dragListener={false}` plus explicit drag controls is the important bit:
   * without it, a drag anywhere on the panel moves the sheet — including on
   * the message list, so scrolling back through the conversation would drag
   * the whole thing shut instead. The gesture belongs to the handle alone.
   */
  const [isPhone, setIsPhone] = useState(false);

  /**
   * The sheet's VISIBLE HEIGHT, in pixels, as a MotionValue.
   *
   * This is the second attempt and the reason for the rewrite is worth
   * recording. The first version kept the panel at a fixed 92dvh and slid it
   * down with a transform. That felt smooth, but it pushed the bottom third of
   * the panel — which is where the text input lives — off the bottom of the
   * screen. Half-open meant you could read the conversation and had nowhere to
   * reply.
   *
   * Driving height instead means the visible box IS the panel: the flex column
   * lays out header, messages, input inside whatever height it currently has,
   * so the input sits at the bottom of the sheet at every size.
   *
   * A MotionValue rather than state because the drag writes to it on every
   * pointer event. Through useState that would be a re-render per frame; this
   * writes straight to style.height and never re-renders at all.
   */
  const height = useMotionValue(0);
  const bounds = useRef({ min: 168, max: 0 });
  /** A drag ends with a pointerup, which the browser also reports as a click.
   *  Without this flag, every drag of the handle would also fire its tap
   *  action and close the sheet the moment you finished resizing it. */
  const dragged = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /**
   * Set the resting height and the limits it can be dragged between.
   *
   * 62% of the viewport at rest, so the hero stays visible above it. The
   * minimum is just enough for the header, the handle and the input — the
   * sheet may be dragged small, but never so small that you cannot reply.
   */
  useEffect(() => {
    if (!isPhone) return;
    const apply = () => {
      const vh = window.innerHeight;
      bounds.current = { min: 168, max: Math.round(vh * 0.92) };
      if (height.get() === 0) height.set(Math.round(vh * 0.62));
      // A rotation or a keyboard can make the current height illegal.
      height.set(
        Math.min(bounds.current.max, Math.max(bounds.current.min, height.get())),
      );
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [isPhone, height]);

  /**
   * The drag, done by hand rather than with Framer's `drag`.
   *
   * Framer's drag moves x/y — it cannot animate height, which is precisely
   * what has to change here. Twenty lines of pointer events is the honest
   * trade, and it buys exact control over the two things that were wrong
   * before: it follows the finger 1:1 and it stops dead on release, because
   * nothing is animating it afterwards.
   *
   * `raw` is tracked unclamped so an extra pull past the minimum can be read
   * as "close this" — a gesture the clamped height could never express, since
   * it stops moving at the limit.
   */
  function startDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!isPhone) return;
    const startY = e.clientY;
    const startH = height.get();
    let raw = startH;

    e.currentTarget.setPointerCapture?.(e.pointerId);

    const move = (ev: PointerEvent) => {
      dragged.current = true;
      raw = startH - (ev.clientY - startY);
      height.set(
        Math.min(bounds.current.max, Math.max(bounds.current.min, raw)),
      );
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      // Pulled well past the smallest useful size — they want it gone.
      if (raw < bounds.current.min - 70) onClose();
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  const isFinished = engine.phase === "done";

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-label="Conversation with Verdigris"
      /* Only opacity and scale animate. `y` is owned by the drag — see the
         note on the motion value above. */
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.45, ease: EASE_BLOOM }}
      /* Inline height on phones ONLY. On desktop the md: rule in globals.css
         owns the geometry, and an inline style would beat it with no way to
         override. */
      style={isPhone ? { height } : undefined}
      className={[
        // Mobile: a bottom sheet. Height and offset come from .chat-sheet in
        // globals.css so they can respond to both the breakpoint and the
        // keyboard — see the note there.
        "chat-sheet fixed inset-x-0 z-50 flex flex-col rounded-t-2xl border-t border-line bg-base",
        // A hard shadow upward separates the sheet from the page behind it.
        // Without it the two dark surfaces merge and the sheet has no edge.
        "shadow-[0_-24px_60px_-24px_rgb(0_0_0/0.9)]",
        // Desktop: docked panel, floated off the corner.
        "md:inset-auto md:right-6 md:w-[400px] md:rounded-xl md:border md:border-line md:shadow-elev-2",
      ].join(" ")}
    >
      {/* Grab handle — draggable AND clickable.
          A handle that only signals is a lie: it looks grabbable, so people
          grab it. Dragging snaps between the two heights and a further pull
          down dismisses.
          It is a real <button> as well because a drag gesture is unreachable
          by keyboard and by anyone using a switch or voice control — tapping
          it toggles the same two states. touch-none stops the browser
          scrolling the page while the finger is on it. */}
      <button
        type="button"
        onPointerDown={startDrag}
        onClick={() => {
          // Swallow the synthetic click that follows a drag — a drag ends with
          // a pointerup, which the browser also reports as a click. Without
          // this, every drag would also fire the tap action.
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          // Keyboard, switch and voice users cannot drag. Tapping closes,
          // which is the one action the gesture offers that they would
          // otherwise have no route to besides the X button.
          onClose();
        }}
        aria-label="Close conversation"
        className="group flex w-full touch-none justify-center py-3 md:hidden"
      >
        <span className="h-1 w-10 rounded-full bg-line-strong transition-colors group-hover:bg-ember-700 group-active:bg-ember-500" />
      </button>
      <header className="flex items-center gap-3 border-b border-line-subtle px-4 py-3 md:pt-3">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ember-700 bg-ember-900"
        >
          <Mark size={17} className="text-ember-400" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold tracking-[0.02em]">
            VERDIGRIS
          </p>
          <p className="label-mono !text-[11px] normal-case tracking-[0.08em]">
            {engine.isTyping
              ? "typing…"
              : isFinished
                ? "case filed"
                : "listening"}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close conversation"
          className="grid h-10 w-10 place-items-center rounded-md text-ink-faint transition-colors hover:bg-elevated hover:text-ink"
        >
          <Close size={18} />
        </button>
      </header>

      {/* Progress. Transform-only (scaleX) so it animates on the compositor
          and never triggers layout. */}
      <div aria-hidden className="h-px w-full bg-line-subtle">
        <motion.div
          className="h-full origin-left bg-ember-500"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isFinished ? 1 : engine.progress }}
          transition={{ duration: 0.6, ease: EASE_BLOOM }}
        />
      </div>

      <div
        ref={listRef}
        // polite, not assertive: new messages are announced without
        // interrupting whatever the screen reader is currently saying.
        aria-live="polite"
        aria-atomic="false"
        className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4"
      >
        {engine.messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
        <AnimatePresence>
          {engine.isTyping && <TypingIndicator />}
        </AnimatePresence>
      </div>

      {engine.phase === "review" ? (
        <ReviewCard data={engine.data} onSubmit={engine.confirm} />
      ) : isFinished ? (
        <div className="border-t border-line-subtle p-4">
          <div className="rounded-md border border-ember-700 bg-ember-900 p-4">
            <div className="flex items-start gap-3">
              <Check size={18} className="mt-0.5 shrink-0 text-ember-300" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">Submitted</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Verdigris has your request. You&apos;ll hear back at{" "}
                  <span className="break-words text-ember-300">
                    {engine.data.email}
                  </span>
                  .
                </p>
              </div>
            </div>

            {/* Showing the triage back to the visitor is not decoration:
                being told your request was logged as critical is materially
                reassuring right after describing something frightening. */}
            {engine.triage && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ember-700/50 pt-3">
                <PriorityBadge priority={engine.triage.priority} />
                {engine.triage.reason && (
                  <span className="text-xs text-ink-faint">
                    {engine.triage.reason}
                  </span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={engine.reset}
              className="mt-4 w-full rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ember-700 hover:text-ember-300"
            >
              Make another request
            </button>
          </div>
        </div>
      ) : (
        <ChatInput
          step={engine.currentStep}
          disabled={!engine.canType}
          isRetry={engine.phase === "error"}
          onSend={engine.answer}
        />
      )}
    </motion.div>
  );
}
