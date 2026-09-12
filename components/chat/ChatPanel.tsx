"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
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
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.45, ease: EASE_BLOOM }}
      style={{ bottom: "var(--kb, 0px)" }}
      className={[
        // Mobile: full screen. A cramped corner bubble on a phone is where
        // "conversational interface" quietly turns back into "form".
        "fixed inset-x-0 top-0 z-50 flex flex-col bg-base",
        // Desktop: docked panel, so the site behind stays visible.
        "md:inset-auto md:right-6 md:top-auto md:h-[min(640px,calc(100dvh-3rem))] md:w-[400px] md:rounded-xl md:border md:border-line md:shadow-elev-2",
      ].join(" ")}
    >
      <header className="flex items-center gap-3 border-b border-line-subtle px-4 py-3">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-patina-700 bg-patina-900 font-display text-sm font-black text-patina-300"
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
          className="h-full origin-left bg-patina-500"
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
          <div className="flex items-start gap-3 rounded-md border border-patina-700 bg-patina-900 p-4">
            <Check size={18} className="mt-0.5 shrink-0 text-patina-300" />
            <div>
              <p className="text-sm font-semibold text-ink">Case filed</p>
              <p className="mt-1 text-sm text-ink-muted">
                Verdigris has your request. You&apos;ll hear back at{" "}
                <span className="text-patina-300">{engine.data.email}</span>.
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
