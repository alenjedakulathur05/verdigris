"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Bubble, TypingIndicator } from "@/components/chat/Bubble";
import { ChatInput } from "@/components/chat/ChatInput";
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
  const [expanded, setExpanded] = useState(false);
  const [isPhone, setIsPhone] = useState(false);
  const dragControls = useDragControls();
  /** A drag ends with a pointerup, which the browser also reports as a click.
   *  Without this flag every drag would toggle the sheet as well, immediately
   *  undoing whatever the drag just decided. */
  const dragged = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /**
   * Where the drag ends up.
   *
   * Velocity is checked as well as distance, because the two are different
   * intentions: a short fast flick means "get rid of this", a long slow drag
   * means "put it exactly here". Distance alone makes flicks feel ignored;
   * velocity alone makes careful drags feel twitchy.
   */
  function onDragEnd(_: unknown, info: PanInfo) {
    dragged.current = true;
    const dy = info.offset.y;
    const vy = info.velocity.y;
    const flickUp = vy < -550;
    const flickDown = vy > 550;

    if (flickUp || dy < -70) {
      setExpanded(true);
      return;
    }
    if (expanded && (flickDown || dy > 70)) {
      setExpanded(false);
      return;
    }
    // Already at rest and still pulling down — they want it gone.
    if (!expanded && (flickDown || dy > 110)) onClose();
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
      initial={{ opacity: 0, y: 40, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 28, scale: 0.99 }}
      transition={{ duration: 0.5, ease: EASE_BLOOM }}
      /* Drag is phone-only and starts from the handle. Constraints of 0/0 with
         elastic give it resistance and spring it back to rest; the snap
         between heights is CSS, not this. */
      drag={isPhone ? "y" : false}
      dragListener={false}
      onDragStart={() => {
        dragged.current = true;
      }}
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.06, bottom: 0.45 }}
      onDragEnd={onDragEnd}
      className={[
        // Mobile: a bottom sheet. Height and offset come from .chat-sheet in
        // globals.css so they can respond to both the breakpoint and the
        // keyboard — see the note there.
        "chat-sheet fixed inset-x-0 z-50 flex flex-col rounded-t-2xl border-t border-line bg-base",
        expanded ? "chat-sheet--full" : "",
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
          // Swallow the synthetic click that follows a drag; a real tap has
          // no preceding drag and falls through to the toggle.
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          setExpanded((v) => !v);
        }}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse conversation" : "Expand conversation"}
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

      {isFinished ? (
        <div className="border-t border-line-subtle p-4">
          <div className="flex items-start gap-3 rounded-md border border-ember-700 bg-ember-900 p-4">
            <Check size={18} className="mt-0.5 shrink-0 text-ember-300" />
            <div>
              <p className="text-sm font-semibold text-ink">Case filed</p>
              <p className="mt-1 text-sm text-ink-muted">
                Verdigris has your request. You&apos;ll hear back at{" "}
                <span className="text-ember-300">{engine.data.email}</span>.
              </p>
            </div>
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
