"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Check } from "@/components/ui/Icons";
import { EASE_BLOOM } from "@/lib/motion";
import type { VisitorData } from "@/lib/types";

/**
 * Read it back, then send.
 *
 * The last thing a visitor typed was the hardest part, and until now nobody
 * has seen the five answers together. This is the checkpoint: everything on
 * one card, the email address they'll be contacted on in plain sight, and a
 * button they have to press.
 *
 * The button disables itself the instant it is pressed. Not for tidiness — a
 * double tap on a phone is one gesture, and without this it is two
 * submissions, two emails and two database rows.
 */
export function ReviewCard({
  data,
  onSubmit,
}: {
  data: Partial<VisitorData>;
  onSubmit: () => void;
}) {
  const [sending, setSending] = useState(false);

  const rows: [string, string | undefined][] = [
    ["Name", data.name],
    ["Age", data.age],
    ["Where", data.location],
    ["Reach you at", data.email],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_BLOOM }}
      className="border-t border-line-subtle p-4"
    >
      <div className="rounded-lg border border-line bg-raised p-4">
        <p className="label-mono mb-3">Case file — ready to send</p>

        <dl className="space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-3 text-sm">
              <dt className="w-28 shrink-0 text-ink-faint">{label}</dt>
              <dd className="min-w-0 flex-1 break-words text-ink">
                {value || "—"}
              </dd>
            </div>
          ))}
        </dl>

        {data.grievance && (
          <div className="mt-3 border-t border-line-subtle pt-3">
            <p className="text-sm text-ink-faint">What you told me</p>
            {/* Capped and scrollable: a long account would otherwise push the
                Submit button off the bottom of the sheet, which is the one
                control this screen exists for. */}
            {/* Same Lenis opt-out as the message list — a long account is
                scrollable here too, and without this the wheel does nothing. */}
            <p
              data-lenis-prevent
              className="mt-1 max-h-28 overflow-y-auto whitespace-pre-wrap text-sm text-ink-muted"
            >
              {data.grievance}
            </p>
          </div>
        )}

        <button
          type="button"
          disabled={sending}
          onClick={() => {
            setSending(true);
            onSubmit();
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-ember-500 px-5 py-3 font-semibold text-void transition-colors hover:bg-ember-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? (
            <>
              <Spinner />
              Sending…
            </>
          ) : (
            <>
              <Check size={16} />
              Send it to Verdigris
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

/** A ring with a gap, rotating. CSS animation rather than a motion component
 *  so it costs nothing and keeps spinning during the network wait. */
function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-void/30 border-t-void"
    />
  );
}
