"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useChatEngine } from "@/hooks/useChatEngine";
import { whenBooted } from "@/lib/boot";
import { EASE_BLOOM } from "@/lib/motion";

type ChatContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside <ChatProvider>");
  return ctx;
}

/**
 * Owns the conversation.
 *
 * The engine lives HERE, not inside ChatPanel, so the panel can unmount when
 * closed without losing the conversation. Minimise and reopen and Verdigris
 * carries on mid-sentence instead of greeting you again like you'd never met.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const engine = useChatEngine();

  const open = useCallback(() => {
    setIsOpen(true);
    setHasOpened(true);
    void engine.start();
  }, [engine]);

  const close = useCallback(() => setIsOpen(false), []);

  /**
   * The brief requires the hero to appear "as soon as someone enters the
   * website". Taken literally that means covering the hero section before
   * anyone has seen it — which would throw away the first impression the rest
   * of the site is built to make.
   *
   * So: a deliberate beat. Long enough to read the wordmark and register the
   * character, short enough that Verdigris still arrives unprompted. On
   * desktop the panel is docked, so the page stays visible behind it.
   */
  useEffect(() => {
    if (hasOpened) return;
    let timer = 0;
    /* Wait for the entry sequence to lift before starting the clock. Without
       this the two race: on a fast machine the panel would slide in behind a
       curtain that is still closing, and the visitor would see a chat window
       appear out of nowhere the instant the site did. */
    const stop = whenBooted(() => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      timer = window.setTimeout(open, isMobile ? 2200 : 1300);
    });
    return () => {
      stop();
      window.clearTimeout(timer);
    };
  }, [hasOpened, open]);

  return (
    <ChatContext.Provider value={{ isOpen, open, close }}>
      {children}

      <AnimatePresence>
        {isOpen && <ChatPanel engine={engine} onClose={close} />}
      </AnimatePresence>

      {/* Relaunch affordance. Only appears once the panel has been dismissed,
          so it never competes with the panel itself. */}
      <AnimatePresence>
        {!isOpen && hasOpened && (
          <motion.button
            type="button"
            onClick={open}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.3, ease: EASE_BLOOM }}
            className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-3 rounded-full border border-ember-700 bg-overlay px-5 text-sm font-semibold text-ink shadow-glow-sm transition-colors hover:border-ember-500 hover:bg-elevated"
          >
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-full bg-ember-900 font-display text-xs font-black text-ember-300"
            >
              V
            </span>
            Continue
          </motion.button>
        )}
      </AnimatePresence>
    </ChatContext.Provider>
  );
}
