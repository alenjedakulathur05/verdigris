import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "flare" | "ghost";
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
  primary: "bg-patina-500 text-void hover:bg-patina-600",
  secondary:
    "border border-line text-ink hover:border-patina-700 hover:text-patina-300",
  // NOTE: label is --color-void, never white. White on flare-500 measures
  // 3.1:1 and fails WCAG AA; void on flare-500 is 6.1:1 and passes.
  flare: "bg-flare-500 text-void hover:bg-flare-600",
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
