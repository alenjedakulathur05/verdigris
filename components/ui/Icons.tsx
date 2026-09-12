import type { SVGProps } from "react";

/**
 * Inline icon set — six glyphs, ~1 kB, no dependency.
 *
 * Installing an icon library for six icons would ship a package (and its
 * tree-shaking assumptions) to save writing these paths once.
 *
 * Stroke weight is 1.5, not the more common 2: at 2px the strokes read chunky
 * next to Manrope's refined weight. Every icon is aria-hidden by default —
 * these are decorative, and the accessible name belongs on the control that
 * contains them.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ArrowDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v16" />
    <path d="m18 14-6 6-6-6" />
  </Icon>
);

export const ArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h16" />
    <path d="m14 6 6 6-6 6" />
  </Icon>
);

export const Send = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12 20 4l-4 16-4.5-6.5L4.5 12Z" />
  </Icon>
);

export const Close = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);

export const Check = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4 12.5 5 5L20 6.5" />
  </Icon>
);

export const Alert = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5" />
    <path d="M12 16.5h.01" />
  </Icon>
);
