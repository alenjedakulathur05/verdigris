import { ChatTrigger } from "@/components/chat/ChatTrigger";
import { ArrowDown } from "@/components/ui/Icons";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { SpecimenPlate } from "@/components/ui/SpecimenPlate";
import { character } from "@/content/character";

/**
 * Hero.
 *
 * A two-column grid above 1024px, a single stacked column below it. The
 * columns are 1.15fr / 1fr rather than 1fr / 1fr on purpose: equal halves make
 * the type and the image argue about which is the subject. Giving the words
 * slightly more room settles it.
 *
 * Still a server component. The only JavaScript on this section is the chat
 * button and the plate's cursor parallax, both of which are their own islands.
 *
 * One layout note worth keeping: the vertical centring is `my-auto` on the
 * grid, NOT `justify-center` on the section. Those look identical until the
 * content is taller than the viewport — at which point justify-content centres
 * the overflow too, and the top of it becomes physically unreachable, because
 * you cannot scroll above zero. It ate the headline at tablet width. Auto
 * margins overflow downward only, which is what you always want here.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden pt-24 md:pt-28">
      <div className="container-page relative my-auto grid items-center gap-12 py-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <RevealGroup>
          <RevealItem
            as="p"
            className="label-mono mb-6 flex items-center gap-3"
          >
            <span
              aria-hidden
              className="h-px w-8 bg-patina-700"
            />
            Case file 001 — active
          </RevealItem>

          <RevealItem>
            <h1 className="font-display text-hero font-black leading-[0.9] tracking-[-0.035em]">
              VERDI<span className="text-patina-500">GRIS</span>
            </h1>
          </RevealItem>

          <RevealItem
            as="p"
            className="label-mono mt-4 text-patina-300/80"
          >
            {character.tagline}
          </RevealItem>

          <RevealItem as="p" className="measure mt-8 text-lg text-ink-muted">
            {character.intro}
          </RevealItem>

          <RevealItem className="mt-10 flex flex-wrap items-center gap-4">
            <ChatTrigger size="lg">{character.cta.button}</ChatTrigger>
            <a
              href="#origin"
              className="inline-flex items-center justify-center rounded-md border border-line px-7 py-4 text-lg font-semibold text-ink transition-colors duration-200 hover:border-patina-700 hover:text-patina-300"
            >
              Read the file
            </a>
          </RevealItem>
        </RevealGroup>

        {/* Below lg the plate follows the copy rather than sitting beside it.
            It is decoration, so it never appears FIRST on a phone — the
            headline and the call to action have to be above the fold. */}
        {/* Capped hard on small screens. At full width the plate pushes the
            call to action below the fold on a phone, which trades the most
            important element on the page for decoration. */}
        <Reveal
          delay={0.15}
          className="mx-auto w-full max-w-[15rem] sm:max-w-[19rem] md:max-w-[24rem] lg:max-w-none"
        >
          <SpecimenPlate />
        </Reveal>
      </div>

      {/* Instrument strip. Its job is tone: it says this site is a readout
          from somewhere, not a brochure. Everything in it is honest — the
          numbers describe the fiction, they don't pretend to be live data. */}
      <Reveal delay={0.5} className="container-page relative pb-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line-subtle pt-5">
          <span className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-patina-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-patina-500" />
            </span>
            <span className="label-mono">Signal open</span>
          </span>

          <span className="label-mono hidden sm:inline">District seven</span>

          <span className="flex min-w-[10rem] flex-1 items-center gap-3">
            <span className="label-mono shrink-0">Reclaimed</span>
            <span className="relative h-px flex-1 bg-line">
              {/* Fills once on entry. Width, not transform, because it animates
                  exactly once and a 1px bar has nothing to repaint. */}
              <span className="hero-meter absolute inset-y-0 left-0 bg-patina-500" />
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-patina-300">
              04%
            </span>
          </span>

          <span className="label-mono ml-auto flex items-center gap-2">
            <ArrowDown size={14} className="text-patina-500" />
            Scroll
          </span>
        </div>
      </Reveal>
    </section>
  );
}
