/**
 * Boot handshake.
 *
 * The entry sequence and the chat panel both want to own the first two
 * seconds. Rather than have one import the other (which would drag the whole
 * chat engine into the boot screen's bundle, and couple two things that have
 * no business knowing each other), they agree on an event name.
 *
 * BOOTED fires exactly once per page load — either when the sequence finishes
 * or immediately, if it never ran. `whenBooted` handles the race where a
 * listener subscribes after the event already fired.
 */

export const BOOTED = "verdigris:booted";

let done = false;

export function markBooted() {
  if (done) return;
  done = true;
  window.dispatchEvent(new Event(BOOTED));
}

/** Runs `fn` once the entry sequence is out of the way. Returns a cleanup. */
export function whenBooted(fn: () => void): () => void {
  if (done) {
    fn();
    return () => {};
  }
  window.addEventListener(BOOTED, fn, { once: true });
  return () => window.removeEventListener(BOOTED, fn);
}
