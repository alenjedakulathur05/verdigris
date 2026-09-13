import { Hero } from "@/components/sections/Hero";
import { Mission } from "@/components/sections/Mission";
import { Origin } from "@/components/sections/Origin";
import { Powers } from "@/components/sections/Powers";
import { Marquee } from "@/components/ui/Marquee";

/**
 * The page is a composition of sections and nothing else — no layout logic, no
 * content, no styling decisions. Each section owns its own concerns, so this
 * file stays readable as the site grows and the narrative order is visible at
 * a glance.
 *
 * The marquee bands are the exception, and they earn their place here rather
 * than inside a section: they are the JOINS. Each one belongs to the boundary
 * between two sections, not to either side of it, and putting them in the
 * composition is what keeps that honest.
 */
export default function Home() {
  return (
    <main id="main">
      <Hero />

      <div className="border-y border-line-subtle bg-base py-6 font-display text-[clamp(2rem,7vw,5.5rem)] font-black uppercase leading-none tracking-[-0.03em] text-ink-disabled">
        <Marquee text="NOTHING FORGOTTEN STAYS FORGOTTEN ·" baseVelocity={-3} />
      </div>

      <Origin />
      <Powers />

      {/* Second band runs the other way, so the two read as a mechanism with
          counter-rotating parts rather than as the same trick used twice. */}
      <div className="border-y border-line-subtle bg-base py-6 font-display text-[clamp(2rem,7vw,5.5rem)] font-black uppercase leading-none tracking-[-0.03em] text-ember-900">
        <Marquee text="DISTRICT SEVEN · CASE FILE 001 · ACTIVE ·" baseVelocity={3.4} />
      </div>

      <Mission />
    </main>
  );
}
