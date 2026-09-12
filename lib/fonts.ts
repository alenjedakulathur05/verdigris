import { Archivo, Manrope, JetBrains_Mono } from "next/font/google";

/**
 * Fonts are loaded through next/font, which downloads and self-hosts them
 * at BUILD time. That means zero runtime requests to Google's servers:
 * faster first paint, no third-party connection, and no layout shift
 * (next/font generates a size-adjusted fallback automatically).
 *
 * All three are variable fonts, so we deliberately omit `weight` — one
 * file covers the whole weight range instead of shipping 5 static cuts.
 */

/** Display — industrial grotesque, squared terminals. Carries the
 *  "weathered machinery" register without being a novelty face. */
export const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/** Body — geometric, open counters, holds up at small sizes on dark. */
export const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

/** Mono — used sparingly: eyebrows, timestamps, form labels.
 *  It's a texture (surveillance log / case file), not a typeface choice. */
export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fontVariables = `${archivo.variable} ${manrope.variable} ${jetbrains.variable}`;
