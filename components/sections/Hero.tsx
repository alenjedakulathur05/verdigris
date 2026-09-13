import { ChatTrigger } from "@/components/chat/ChatTrigger";
import { HeroFilm } from "@/components/ui/HeroFilm";
import { HeroParallax } from "@/components/ui/HeroParallax";
import { ArrowDown } from "@/components/ui/Icons";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { character } from "@/content/character";

/**
 * Hero.
 *
 * Full-bleed footage behind, content in a single left-aligned column on top.
 * The column is capped near half the width on desktop so the words never run
 * across the character's face — the layout and the scrim in globals.css are
 * solving the same problem from two directions.
 *
 * Two layout notes worth keeping:
 *
 *   The vertical centring is `my-auto` on the content, NOT `justify-center` on
 *   the section. They look identical until the content is taller than the
 *   viewport — at which point justify-content centres the overflow too and the
 *   top of it becomes physically unreachable, because you cannot scroll above
 *   zero. It ate the headline at tablet width once already.
 *
 *   The backdrop is at z-0 and everything else is at z-10. Without an explicit
 *   stacking order the absolutely-positioned video paints over the text about
 *   half the time, depending on source order.
 *
 * Still a server component — the only JavaScript here is the chat button and
 * the backdrop, each its own island.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <HeroFilm />

      {/* py is small because `my-auto` is already doing the centring — generous
          padding on top of it only pushes the instrument strip below the fold.
          At 640px tall (a short laptop) the old py-28 put the strip at 686px,
          i.e. off screen. */}
      <div className="container-page relative z-10 my-auto py-12 md:py-16">
        {/* The copy leaves faster than the footage behind it — that difference
            in rate is the depth cue. */}
        <HeroParallax travel={-110}>
        <RevealGroup className="max-w-[36rem] lg:max-w-[52%]">
          <RevealItem as="p" className="label-mono mb-6 flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-ember-700" />
            Case file 001 — active
          </RevealItem>

          <RevealItem>
            <h1 className="font-display text-hero font-black leading-[0.9] tracking-[-0.035em]">
              VERDI<span className="text-ember-500">GRIS</span>
            </h1>
          </RevealItem>

          <RevealItem as="p" className="label-mono mt-4 text-ember-300/85">
            {character.tagline}
          </RevealItem>

          <RevealItem as="p" className="measure mt-8 text-lg text-ink-muted">
            {character.intro}
          </RevealItem>

          <RevealItem className="mt-10 flex flex-wrap items-center gap-4">
            <ChatTrigger size="lg">{character.cta.button}</ChatTrigger>
            <a
              href="#origin"
              /* bg-void/40 + backdrop-blur, not a transparent outline: over
                 moving footage a purely outlined button loses its edge every
                 time something bright drifts behind it. */
              className="inline-flex items-center justify-center rounded-md border border-line bg-void/40 px-7 py-4 text-lg font-semibold text-ink backdrop-blur-sm transition-colors duration-200 hover:border-ember-700 hover:text-ember-300"
            >
              Read the file
            </a>
          </RevealItem>
        </RevealGroup>
        </HeroParallax>
      </div>

      {/* Instrument strip. Its job is tone: it says this is a readout from
          somewhere, not a brochure. The numbers describe the fiction; they do
          not pretend to be live data. */}
      <Reveal delay={0.5} className="container-page relative z-10 pb-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line-subtle pt-5">
          <span className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember-500" />
            </span>
            <span className="label-mono">Signal open</span>
          </span>

          <span className="label-mono hidden sm:inline">District seven</span>

          <span className="flex min-w-[10rem] flex-1 items-center gap-3">
            <span className="label-mono shrink-0">Reclaimed</span>
            <span className="relative h-px flex-1 bg-line">
              <span className="hero-meter absolute inset-y-0 left-0 bg-ember-500" />
            </span>
            {/* The one volt element above the fold. It is the only number on
                the page, so it gets the loudest colour we own — and because
                nothing near it is yellow, the eye goes straight there. */}
            <span className="shrink-0 font-mono text-xs tabular-nums text-volt-400">
              04%
            </span>
          </span>

          <span className="label-mono ml-auto flex items-center gap-2">
            <ArrowDown size={14} className="text-ember-500" />
            Scroll
          </span>
        </div>
      </Reveal>
    </section>
  );
}
