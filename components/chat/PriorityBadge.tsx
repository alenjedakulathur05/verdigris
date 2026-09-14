import type { Priority } from "@/lib/types";

/**
 * The triage band, shown to the visitor.
 *
 * Critical is the only one that gets a filled background. Giving every band a
 * loud treatment would flatten the scale — if all four shout, none of them
 * mean anything, and the one that actually matters stops standing out.
 */
const STYLES: Record<Priority, { label: string; className: string }> = {
  critical: {
    label: "Critical",
    className: "border-ember-500 bg-ember-500 text-void",
  },
  high: { label: "High", className: "border-volt-500 text-volt-400" },
  standard: { label: "Standard", className: "border-line text-ink-muted" },
  low: { label: "Low", className: "border-line-subtle text-ink-faint" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const style = STYLES[priority];
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] ${style.className}`}
    >
      {style.label} priority
    </span>
  );
}
