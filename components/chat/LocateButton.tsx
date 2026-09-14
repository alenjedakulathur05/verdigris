"use client";

import { useState } from "react";

/**
 * "Use my location" — GPS with a graceful path back to typing.
 *
 * The important design rule here is that this is an OFFER, never a gate. The
 * text field stays exactly where it was and stays usable throughout; this
 * button is a shortcut for people who want it. Anyone who declines the
 * permission, has it blocked by policy, is indoors with no fix, or simply
 * would rather not share it, types a city as before and nothing is lost.
 *
 * That matters more than convenience: location is the one question in this
 * conversation where a visitor might have a real reason to be vague, and a
 * help portal that insists on a GPS fix before it will listen has failed the
 * people most likely to need it.
 *
 * The prompt only ever appears on a click. Asking for geolocation on page load
 * is the single most disliked pattern on the web, and browsers increasingly
 * refuse it outright.
 */

type Status = "idle" | "locating" | "denied" | "failed";

const MESSAGES: Record<Exclude<Status, "idle" | "locating">, string> = {
  denied: "No problem — just type where you are.",
  failed: "Couldn't get a fix. Type the city instead.",
};

export function LocateButton({
  onResolved,
  disabled,
}: {
  onResolved: (place: string) => void;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");

  function locate() {
    if (!("geolocation" in navigator)) {
      setStatus("failed");
      return;
    }
    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            }),
          });
          const json = (await res.json()) as { place?: string };
          if (!res.ok || !json.place) {
            setStatus("failed");
            return;
          }
          setStatus("idle");
          // Goes through the normal answer path, so the geocoded city is
          // validated by exactly the same rules as a typed one.
          onResolved(json.place);
        } catch {
          setStatus("failed");
        }
      },
      (err) => {
        // PERMISSION_DENIED is a choice, not a fault — it gets its own,
        // untroubled message.
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "failed");
      },
      {
        /* City-level is all we need, so the low-accuracy fix is the right
           one: it resolves in a second or two from wifi instead of waiting
           on a satellite lock, and costs far less battery. */
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 300_000,
      },
    );
  }

  return (
    <div className="border-t border-line-subtle bg-base px-3 pt-2.5">
      <button
        type="button"
        onClick={locate}
        disabled={disabled || status === "locating"}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-ember-700 hover:text-ember-300 disabled:opacity-40"
      >
        {status === "locating" ? (
          <>
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink-disabled border-t-ember-500"
            />
            Finding you…
          </>
        ) : (
          <>
            <Pin />
            Use my current location
          </>
        )}
      </button>

      {(status === "denied" || status === "failed") && (
        <p className="mt-2 text-center text-xs text-ink-faint" role="status">
          {MESSAGES[status]}
        </p>
      )}
    </div>
  );
}

function Pin() {
  return (
    <svg
      aria-hidden
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}
