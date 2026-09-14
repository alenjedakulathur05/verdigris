"use client";

import { useEffect, useRef, useState } from "react";
import { LocateButton } from "@/components/chat/LocateButton";
import { Send } from "@/components/ui/Icons";
import type { ChatStep } from "@/lib/chat-flow";

type Props = {
  step: ChatStep | null;
  disabled: boolean;
  /** Set when the send failed and we're offering a retry. */
  isRetry?: boolean;
  onSend: (value: string) => void;
};

export function ChatInput({ step, disabled, isRetry, onSend }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Refocus whenever Verdigris finishes speaking, so the visitor never has to
  // click back into the field between questions.
  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled, step?.id]);

  // Auto-grow. Reset to "auto" first or the height only ever ratchets upward.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function send() {
    if (disabled) return;
    const trimmed = value.trim();
    // On a retry the payload is already collected — an empty send is the
    // "try again" action, so it must not be blocked here.
    if (!trimmed && !isRetry) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div>
      {/* Only on the location step. The GPS offer is tied to the one question
          it can answer — a "use my location" button sitting under "what's your
          name?" would be nonsense, and asking for the permission earlier than
          it is needed is how sites train people to refuse it. */}
      {step?.id === "location" && (
        <LocateButton
          disabled={disabled}
          onResolved={(place) => {
            setValue("");
            onSend(place);
          }}
        />
      )}

      <form
        className="flex items-end gap-2 border-t border-line-subtle bg-base p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
      <label htmlFor="chat-input" className="sr-only">
        {step ? `Your answer: ${step.placeholder}` : "Your message"}
      </label>

      <textarea
        id="chat-input"
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        inputMode={step?.inputMode}
        autoComplete={step?.autoComplete}
        placeholder={
          isRetry ? "Press send to try again" : (step?.placeholder ?? "…")
        }
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter makes a new line. On the long-form
          // question that distinction matters — people write paragraphs there.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink outline-none placeholder:text-ink-disabled disabled:opacity-40"
      />

      <button
        type="submit"
        disabled={disabled || (!value.trim() && !isRetry)}
        aria-label="Send"
        // 44px minimum touch target — anything smaller fails on a phone.
        className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-ember-500 text-void transition-colors duration-200 hover:bg-ember-600 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-30"
      >
        <Send size={18} />
        </button>
      </form>
    </div>
  );
}
