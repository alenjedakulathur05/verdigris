"use client";

import {
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
} from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Bubble, TypingIndicator } from "@/components/chat/Bubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { PriorityBadge } from "@/components/chat/PriorityBadge";
import { ReviewCard } from "@/components/chat/ReviewCard";
import { Check, Close } from "@/components/ui/Icons";
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
  const dragControls = useDragControls();
  const dragged = useRef(false);
  /** How far down the sheet may travel before it counts as dismissed. Measured
   *  from the panel itself so it adapts to whatever height the CSS gave it. */
  const [maxDrag, setMaxDrag] = useState(0);
  /**
   * Vertical position of the sheet, as a MotionValue rather than component
   * state.
   *
   * This is deliberate and load-bearing: the drag writes straight into it
   * outside React, so following the finger costs no re-renders. It also means
   * the position is NOT an animation target — if `y` were on the `animate`
   * prop, every new chat message would re-render the panel and spring the
   * sheet back to its resting place mid-conversation.
   */
  const y = useMotionValue(0);
  const placed = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /**
   * Measure the sheet so the drag has real bounds.
   *
   * The travel is (panel height − the strip that must stay on screen), read
   * from the element rather than hardcoded, so it stays correct on every
   * screen size and when the keyboard changes the height.
   */
  useEffect(() => {
    if (!isPhone) return;
    const el = panelRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.offsetHeight;
      // Leave 120px on screen at the furthest-down position, so there is
      // always something to grab and it never disappears entirely.
      setMaxDrag(Math.max(0, h - 120));
      // Rest so that ~62% of the viewport is covered — the sheet is 92dvh
      // tall, so it starts pushed down by the difference. Applied once; after
      // that the position belongs to the visitor.
      if (!placed.current) {
        placed.current = true;
        y.set(Math.max(0, h - window.innerHeight * 0.62));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isPhone]);

  /**
   * Where the drag ends up: exactly where it was let go.
   *
   * The earlier version snapped between two fixed heights, which is why it
   * felt stiff — the sheet argued with the finger instead of following it.
   * Now `y` is free within its bounds and nothing springs it anywhere, so
   * releasing at 40% leaves it at 40%.
   *
   * The only decision left is dismissal, and that checks velocity as well as
   * distance because they are different intentions: a short fast flick means
   * "get rid of this", a slow drag means "put it here". Distance alone makes
   * flicks feel ignored; velocity alone makes careful drags twitchy.
   */
  function onDragEnd(_: unknown, info: PanInfo) {
    dragged.current = true;
    const pulledFar = info.offset.y > 0 && info.point.y > 0 && info.offset.y > maxDrag * 0.55;
    if (info.velocity.y > 900 || pulledFar) onClose();
  }

  // Follow the conversation as it grows.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [engine.messages.length, engine.isTyping]);

  // Escape closes — expected of anything dialog-shaped.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /**
   * The mobile keyboard problem.
   *
   * On iOS Safari a `position: fixed` full-screen panel does NOT shrink when
   * the keyboard opens — the layout viewport stays the same size and the
   * keyboard simply covers the bottom of it, hiding the input the user is
   * typing into. visualViewport reports the *actually visible* region, so we
   * lift the panel by the difference.
   *
   * Most submissions will break here, and it's the first thing anyone testing
   * on a phone will hit.
   */
  useEffect(() => {
    const vv = window.visualViewport;
    const el = panelRef.current;
    if (!vv || !el) return;

    const sync = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.setProperty("--kb", `${covered}px`);
    };

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

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
      style={{ y }}
      /* Drag is phone-only and starts from the handle. Constraints of 0/0 with
         elastic give it resistance and spring it back to rest; the snap
         between heights is CSS, not this. */
      drag={isPhone ? "y" : false}
      dragListener={false}
      onDragStart={() => {
        dragged.current = true;
      }}
      dragControls={dragControls}
      /* Bounds, not snap points. top:0 is fully open, bottom is as far down as
         it may go before dismissing. */
      dragConstraints={{ top: 0, bottom: maxDrag }}
      /* dragMomentum={false} is what makes it stop dead where you let go —
         with momentum on, the sheet keeps coasting after your finger lifts,
         which is exactly the "it doesn't stop where I left it" problem.
         dragElastic 0 removes the rubber-band fight at the edges. */
      dragMomentum={false}
      dragElastic={0}
      dragTransition={{ power: 0, timeConstant: 0 }}
      onDragEnd={onDragEnd}
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
        onPointerDown={(e) => isPhone && dragControls.start(e)}
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
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ember-700 bg-ember-900 font-display text-sm font-black text-ember-300"
        >
          V
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
