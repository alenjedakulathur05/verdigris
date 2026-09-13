import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { BootSequence } from "@/components/ui/BootSequence";
import { Header } from "@/components/ui/Header";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "VERDIGRIS — Nothing forgotten stays forgotten",
    template: "%s · VERDIGRIS",
  },
  description:
    "Some things get left behind. Verdigris finds them. Tell them what you need help with.",
  openGraph: {
    title: "VERDIGRIS — Nothing forgotten stays forgotten",
    description:
      "Some things get left behind. Verdigris finds them. Tell them what you need help with.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#080506",
  colorScheme: "dark",
  // Never lock zoom — pinch-zoom is an accessibility requirement,
  // not a design inconvenience.
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body>
        {/* Skip link: first tab stop on the page for keyboard users. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-ember-500 focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-void"
        >
          Skip to content
        </a>
        {/* Order matters. Atmosphere sits at -z-10 behind everything and
            ships no JavaScript; the boot overlay is a SIBLING of the page
            rather than a wrapper around it, so a failure in the sequence can
            never prevent the site itself from rendering. */}
        <Atmosphere />
        <ChatProvider>
          <Header />
          {children}
        </ChatProvider>
        <BootSequence />
      </body>
    </html>
  );
}
