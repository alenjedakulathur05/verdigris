import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "volt" | "ghost";
type Size = "sm" | "md" | "lg";

const base = [
  "relative inline-flex items-center justify-center gap-2",
  "rounded-md font-semibold",
  "transition-colors duration-200",
  // Micro-interaction: acknowledges the press within one frame. A button that
  // waits for a 300ms transition before reacting feels broken even when it works.
  "active:scale-[0.98] motion-reduce:active:scale-100",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

const variants: Record<Variant, string> = {
  primary: "bg-ember-500 text-void hover:bg-ember-600",
  secondary:
    "border border-line text-ink hover:border-ember-700 hover:text-ember-300",
  // NOTE: the label on BOTH filled variants is --color-void, never white,
  // and that is measured rather than assumed. White on ember-500 is 3.8:1 and
  // fails AA; void on ember-500 is 5.4:1 and passes. On volt-500 the gap is
  // absurd — white 1.3:1, void 15.4:1 — because neon yellow is brighter than
  // the body text itself. Light-on-bright is the single most common contrast
  // failure in neon palettes, and the brighter the accent the worse it gets.
  volt: "bg-volt-500 text-void hover:bg-volt-600",
  ghost: "text-ink-muted hover:text-ink",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3",
  lg: "px-7 py-4 text-lg",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
